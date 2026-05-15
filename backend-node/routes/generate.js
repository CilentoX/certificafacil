import { generatePreview, generateBatch, downloadBatchZip } from '../controllers/generate.js';

export default async function generateRoutes(fastify, options) {
  fastify.post('/preview', { preValidation: [fastify.authenticate] }, generatePreview);
  fastify.post('/batch', { preValidation: [fastify.authenticate] }, generateBatch);
  fastify.post('/zip', { preValidation: [fastify.authenticate] }, downloadBatchZip);
}
