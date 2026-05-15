import { listTemplates, uploadTemplate, deleteTemplate } from '../controllers/templates.js';

export default async function templateRoutes(fastify, options) {
  fastify.get('/', { preValidation: [fastify.authenticate] }, listTemplates);
  fastify.post('/upload', { preValidation: [fastify.authenticate] }, uploadTemplate);
  fastify.delete('/:filename', { preValidation: [fastify.authenticate] }, deleteTemplate);
}
