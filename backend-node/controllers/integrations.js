import { whatsappService } from '../services/whatsapp.js';
import prisma from '../db.js';

export async function getWhatsappStatus(request, reply) {
  try {
    const userId = request.user.id;
    const status = whatsappService.getStatus(userId);
    const qr = whatsappService.getQr(userId);
    const info = whatsappService.getInfo(userId);

    // Também sincronizar com o banco se status for ready mas no banco estiver desconectado
    if (status === 'ready') {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.whatsappStatus !== 'ready') {
            await prisma.user.update({
                where: { id: userId },
                data: { whatsappStatus: 'ready' }
            });
        }
    }

    return { ok: true, status, qr, info };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Falha ao obter status do WhatsApp.' });
  }
}

export async function connectWhatsapp(request, reply) {
  try {
    const userId = request.user.id;
    
    // Inicia o processo de inicialização (assíncrono)
    whatsappService.initialize(userId).catch(err => {
        console.error(`Erro ao inicializar WhatsApp para user ${userId}:`, err.message);
    });

    return { ok: true, message: 'Processo de conexão iniciado.' };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Falha ao iniciar conexão.' });
  }
}

export async function disconnectWhatsapp(request, reply) {
  try {
    const userId = request.user.id;
    await whatsappService.disconnect(userId);
    return { ok: true, message: 'WhatsApp desconectado.' };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Falha ao desconectar.' });
  }
}

export async function testSmtp(request, reply) {
  try {
    const { host, port, user, pass, secure, senderEmail, senderName, to } = request.body || {};
    if (!host || !user || !pass) {
      return reply.code(400).send({ error: 'Host, usuário e senha são obrigatórios.' });
    }

    const { emailService } = await import('../services/email.js');
    await emailService.testSmtpConnection({ host, port, user, pass, secure, senderEmail, senderName }, to);
    return { ok: true, message: to ? 'E-mail de teste enviado com sucesso!' : 'Conexão SMTP verificada com sucesso!' };
  } catch (error) {
    request.log.error(error);
    return reply.code(400).send({ error: `Falha na conexão SMTP: ${error.message}` });
  }
}

export async function sendTestEmail(request, reply) {
  try {
    const { to } = request.body || {};
    if (!to) return reply.code(400).send({ error: 'E-mail de destino é obrigatório.' });

    const { emailService } = await import('../services/email.js');
    await emailService.sendTestEmail(to, request.user.id);
    return { ok: true, message: 'E-mail de teste enviado!' };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: `Falha ao enviar e-mail de teste: ${error.message}` });
  }
}

export async function sendTestWhatsapp(request, reply) {
  try {
    const { phone } = request.body || {};
    if (!phone) return reply.code(400).send({ error: 'Número de WhatsApp é obrigatório.' });

    const text = "🚀 *CertificaFacil - Teste de Integração*\n\nSe você recebeu esta mensagem, sua conexão com o WhatsApp está funcionando perfeitamente!";
    await whatsappService.sendTextMessage(request.user.id, phone, text);
    
    return { ok: true, message: 'Mensagem de teste enviada!' };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: `Falha ao enviar teste de WhatsApp: ${error.message}` });
  }
}
