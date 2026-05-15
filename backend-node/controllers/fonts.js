import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');

async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
}

export async function listFonts(request, reply) {
  try {
    await ensureDir(FONTS_DIR);
    const files = await fs.readdir(FONTS_DIR);
    const fonts = files.filter(f => f.endsWith('.ttf') || f.endsWith('.otf'));
    return { fonts };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro ao listar fontes' });
  }
}

export async function uploadFont(request, reply) {
  try {
    await ensureDir(FONTS_DIR);
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'Nenhum arquivo enviado' });

    const allowedExts = ['.ttf', '.otf'];
    const ext = path.extname(data.filename).toLowerCase();
    if (!allowedExts.includes(ext)) {
      return reply.code(400).send({ error: 'Extensão inválida. Utilize apenas .ttf ou .otf' });
    }

    // Sanitize filename to remove spaces or special chars that might break @font-face
    const cleanName = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}_${cleanName}`;
    const filepath = path.join(FONTS_DIR, filename);
    
    const buffer = await data.toBuffer();
    await fs.writeFile(filepath, buffer);

    return { ok: true, filename, family: data.filename.split('.')[0] };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro ao enviar fonte' });
  }
}

export async function deleteFont(request, reply) {
  try {
    const { filename } = request.params;
    if (!filename) return reply.code(400).send({ error: 'Nome da fonte não informado' });

    // Path Traversal Security
    const safeFilename = path.basename(filename);
    const filepath = path.join(FONTS_DIR, safeFilename);
    
    await fs.unlink(filepath);
    return { ok: true };
  } catch (error) {
    return reply.code(404).send({ error: 'Fonte não encontrada' });
  }
}
