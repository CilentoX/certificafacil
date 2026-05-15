import { login, register, getMe, seedAuth, logout } from '../controllers/auth.js';

export default async function authRoutes(fastify, options) {
  fastify.post('/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, login);
  fastify.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, register);
  fastify.post('/logout', { preValidation: [fastify.authenticate] }, logout);
  fastify.get('/me', { preValidation: [fastify.authenticate] }, getMe);
  fastify.get('/seed', seedAuth);
}
