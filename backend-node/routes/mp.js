import { createCheckout, getPlans, handleWebhook } from '../controllers/mp.js';

export default async function mpRoutes(fastify, options) {
  fastify.get('/plans', getPlans);
  fastify.post('/checkout', { preValidation: [fastify.authenticate] }, createCheckout);
  
  // Webhook é público, pois é chamado pelos servidores do MP
  fastify.post('/webhook', handleWebhook);
}
