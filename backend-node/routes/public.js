import { validateCertificate } from '../controllers/public.js';

export default async function publicRoutes(fastify, options) {
  fastify.get('/validate/:code', validateCertificate);
}
