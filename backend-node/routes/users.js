import { listUsers, getStats, updateMe } from '../controllers/users.js';

export default async function userRoutes(fastify, options) {
  fastify.get('/', { preValidation: [fastify.authenticate] }, listUsers);
  fastify.get('/stats', { preValidation: [fastify.authenticate] }, getStats);
  fastify.put('/me', { preValidation: [fastify.authenticate] }, updateMe);
}
