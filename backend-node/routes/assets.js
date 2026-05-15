import { uploadAsset, listAssets, deleteAsset } from '../controllers/assets.js';

export default async function assetRoutes(fastify, options) {
  fastify.get('/', { preValidation: [fastify.authenticate] }, listAssets);
  fastify.post('/upload', { preValidation: [fastify.authenticate] }, uploadAsset);
  fastify.delete('/:filename', { preValidation: [fastify.authenticate] }, deleteAsset);
}
