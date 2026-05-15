import pool from '../db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'templates');

async function ensureDir(dir) {
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
}

export async function listTemplates(request, reply) {
  try {
    await ensureDir(UPLOADS_DIR);
    const files = await fs.readdir(UPLOADS_DIR);
    const pdfs = files.filter(f => f.endsWith('.pdf'));
    return { templates: pdfs };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro ao listar templates' });
  }
}

export async function uploadTemplate(request, reply) {
  try {
    await ensureDir(UPLOADS_DIR);
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'Nenhum arquivo enviado' });

    const filename = `${Date.now()}_${data.filename}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    const buffer = await data.toBuffer();
    await fs.writeFile(filepath, buffer);

    return { ok: true, filename, size: buffer.length };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro ao enviar template' });
  }
}

export async function deleteTemplate(request, reply) {
  try {
    const { filename } = request.params;
    const filepath = path.join(UPLOADS_DIR, filename);
    await fs.unlink(filepath);
    return { ok: true };
  } catch (error) {
    return reply.code(404).send({ error: 'Template não encontrado' });
  }
}
