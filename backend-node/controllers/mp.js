import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import prisma from '../db.js';

export async function createCheckout(request, reply) {
  try {
    const { planSlug } = request.body;

    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) return reply.code(404).send({ error: 'Plano não encontrado' });

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) return reply.code(500).send({ error: 'Mercado Pago não configurado' });

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        items: [{
          title: `CertificaFacil - Plano ${plan.name}`,
          quantity: 1,
          unit_price: Number(plan.price),
          currency_id: 'BRL'
        }],
        back_urls: {
          success: `${(process.env.APP_URL || 'http://localhost:5173').replace('http://', 'https://')}/dashboard?payment=success`,
          failure: `${(process.env.APP_URL || 'http://localhost:5173').replace('http://', 'https://')}/dashboard?payment=failure`,
          pending: `${(process.env.APP_URL || 'http://localhost:5173').replace('http://', 'https://')}/dashboard?payment=pending`
        },
        auto_return: 'approved',
        notification_url: `${process.env.API_BASE_URL || 'http://localhost:3000/api'}/mp/webhook`,
        metadata: { 
          user_id: String(request.user.id), 
          plan_id: String(plan.id) 
        }
      }
    });

    // Prioritize sandbox_init_point if it exists, otherwise use init_point
    const initPoint = response.sandbox_init_point || response.init_point;

    return { init_point: initPoint };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro ao gerar checkout' });
  }
}

export async function handleWebhook(request, reply) {
  try {
    const { action, data } = request.body || {};
    
    // Verificamos se é um tópico de pagamento
    if (action !== 'payment.created' && request.body.type !== 'payment') {
      return reply.code(200).send({ ok: true, message: 'Ignored topic' });
    }

    const paymentId = data?.id || request.body.data?.id;
    if (!paymentId) return reply.code(400).send({ error: 'ID de pagamento ausente' });

    const accessToken = process.env.MP_ACCESS_TOKEN;
    const client = new MercadoPagoConfig({ accessToken });
    const paymentClient = new Payment(client);

    // Consultar o status real na API do Mercado Pago (Segurança)
    const payment = await paymentClient.get({ id: paymentId });

    if (payment.status === 'approved') {
      const { user_id, plan_id } = payment.metadata;

      if (user_id && plan_id) {
        // Upgrade do usuário no Prisma
        await prisma.user.update({
          where: { id: parseInt(user_id) },
          data: { 
            planId: parseInt(plan_id),
            isActive: true 
          }
        });

        // Registrar Log
        await prisma.activityLog.create({
          data: {
            userId: parseInt(user_id),
            action: 'payment_approved',
            details: { paymentId, planId: plan_id }
          }
        });

        console.log(`✅ Pagamento Aprovado: Usuário ${user_id} agora é Plano ${plan_id}`);
      }
    }

    return reply.code(200).send({ ok: true });
  } catch (error) {
    request.log.error('❌ Erro no Webhook MP:', error.message);
    return reply.code(500).send({ error: 'Erro ao processar notificação' });
  }
}

export async function getPlans(request, reply) {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } });
  return { plans };
}
