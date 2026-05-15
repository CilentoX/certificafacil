import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.join(__dirname, '..', '..', 'uploads', 'assets');

async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
}

export async function uploadAsset(request, reply) {
  try {
    await ensureDir(ASSETS_DIR);
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'Nenhum arquivo enviado' });

    // Validar se é imagem
    const allowed = ['.png', '.jpg', '.jpeg', '.svg'];
    const ext = path.extname(data.filename).toLowerCase();
    if (!allowed.includes(ext)) {
      return reply.code(400).send({ error: 'Apenas imagens são permitidas (png, jpg, svg)' });
    }

    const cleanName = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `user_${request.user.id}_asset_${Date.now()}_${cleanName}`;
    const filepath = path.join(ASSETS_DIR, filename);
    const buffer = await data.toBuffer();
    await fs.writeFile(filepath, buffer);

    const apiBase = process.env.API_BASE_URL || 'http://localhost:3000/api';
    const url = `${apiBase.replace(/\/api$/, '')}/uploads/assets/${filename}`;

    // Register asset in database
    await prisma.asset.create({
      data: {
        userId: request.user.id,
        filename,
        url,
        size: buffer.length
      }
    });

    return { ok: true, filename, url, size: buffer.length };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro ao enviar imagem' });
  }
}

export async function listAssets(request, reply) {
  try {
    const assets = await prisma.asset.findMany({
      where: { userId: request.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return { ok: true, assets: assets.map(a => ({ filename: a.filename, url: a.url })) };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro ao listar imagens' });
  }
}

export async function deleteAsset(request, reply) {
  const { filename } = request.params;
  if (!filename) return reply.code(400).send({ error: 'Nome do arquivo não informado' });

  try {
    const safeFilename = path.basename(filename);

    const asset = await prisma.asset.findFirst({
      where: {
        userId: request.user.id,
        filename: safeFilename
      }
    });

    if (!asset) {
      return reply.code(403).send({ error: 'Acesso negado ou imagem não encontrada.' });
    }

    // Delete from DB first
    await prisma.asset.delete({ where: { id: asset.id } });

    // Then delete from FS
    const filepath = path.join(ASSETS_DIR, safeFilename);
    try {
      await fs.unlink(filepath);
    } catch (e) {
      // Ignora erro de FS se já não existir
    }

    return { ok: true, message: 'Imagem excluída com sucesso' };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro ao excluir imagem' });
  }
}
