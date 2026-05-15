import { 
  getWhatsappStatus, connectWhatsapp, disconnectWhatsapp, testSmtp,
  sendTestEmail, sendTestWhatsapp 
} from '../controllers/integrations.js';

export default async function integrationRoutes(fastify, options) {
  // Rotas restritas para usuários autenticados (Ideal seria admin/superadmin apenas)
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/whatsapp/status', getWhatsappStatus);
  fastify.post('/whatsapp/connect', connectWhatsapp);
  fastify.post('/whatsapp/disconnect', disconnectWhatsapp);
  fastify.post('/whatsapp/test', sendTestWhatsapp);
  fastify.post('/smtp/test', testSmtp);
  fastify.post('/email/test', sendTestEmail);
}
