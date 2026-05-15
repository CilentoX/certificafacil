import prisma from '../db.js';
import bcrypt from 'bcrypt';

export async function login(request, reply) {
  const { email, password } = request.body || {};
  if (!email || !password) {
    return reply.code(400).send({ error: 'E-mail e senha são obrigatórios' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { plan: true }
    });

    if (!user) return reply.code(401).send({ error: 'Credenciais inválidas' });
    if (!user.isActive) return reply.code(403).send({ error: 'Conta desativada' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return reply.code(401).send({ error: 'Credenciais inválidas' });

    const token = await reply.jwtSign(
      { id: user.id, uid: user.uid, role: user.role, planId: user.planId, tokenVersion: user.tokenVersion },
      { expiresIn: '7d' }
    );

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      ok: true,
      token,
      user: {
        id: user.id, uid: user.uid, name: user.name, email: user.email,
        role: user.role, avatarUrl: user.avatarUrl,
        plan: { name: user.plan.name, slug: user.plan.slug }
      }
    };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro interno do servidor' });
  }
}

export async function register(request, reply) {
  const { name, email, password } = request.body || {};
  if (!name || !email || !password) {
    return reply.code(400).send({ error: 'Nome, e-mail e senha são obrigatórios' });
  }
  if (password.length < 6) {
    return reply.code(400).send({ error: 'A senha deve ter pelo menos 6 caracteres' });
  }

  try {
    const regAllowed = await prisma.setting.findUnique({ where: { settingKey: 'allow_registration' } });
    if (regAllowed && regAllowed.settingValue === '0') {
      return reply.code(403).send({ error: 'Cadastro desativado no momento' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return reply.code(409).send({ error: 'Este e-mail já está cadastrado' });

    const trialPlan = await prisma.plan.findUnique({ where: { slug: 'trial' } });
    const trialDaysSetting = await prisma.setting.findUnique({ where: { settingKey: 'trial_days' } });
    const days = trialDaysSetting ? parseInt(trialDaysSetting.settingValue) : 7;

    const hash = await bcrypt.hash(password, 12);
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + days);

    const user = await prisma.user.create({
      data: {
        name, email, passwordHash: hash,
        planId: trialPlan?.id || 1,
        trialEndsAt: trialEnds
      }
    });

    const token = await reply.jwtSign(
      { id: user.id, uid: user.uid, role: user.role, planId: user.planId, tokenVersion: user.tokenVersion },
      { expiresIn: '7d' }
    );

    return {
      ok: true, token,
      user: { id: user.id, uid: user.uid, name: user.name, email: user.email, role: user.role }
    };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro interno do servidor' });
  }
}

export async function getMe(request, reply) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: { plan: true, _count: { select: { certificates: true } } }
    });

    if (!user) return reply.code(404).send({ error: 'Usuário não encontrado' });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCerts = await prisma.certificate.count({
      where: {
        userId: request.user.id,
        createdAt: { gte: sevenDaysAgo }
      }
    });

    return {
      id: user.id, uid: user.uid, name: user.name, email: user.email,
      role: user.role, avatarUrl: user.avatarUrl, createdAt: user.createdAt,
      trialEndsAt: user.trialEndsAt,
      whatsappTemplate: user.whatsappTemplate,
      emailTemplate: user.emailTemplate,
      smtpConfig: user.smtpConfig,
      plan: {
        name: user.plan.name, slug: user.plan.slug,
        maxCerts: user.plan.maxCerts, maxTemplates: user.plan.maxTemplates,
        features: user.plan.features
      },
      stats: { 
        certificates: user._count.certificates,
        recentCertificates: recentCerts
      }
    };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro interno' });
  }
}

export async function seedAuth(request, reply) {
  try {
    const adminHash = await bcrypt.hash('admin123', 12);
    
    // Make sure plan exists
    const plan = await prisma.plan.upsert({
      where: { slug: 'unlimited' },
      update: {},
      create: { slug: 'unlimited', name: 'Ilimitado', price: 99.90, maxCerts: 0, maxTemplates: 0 }
    });

    const user = await prisma.user.upsert({
      where: { email: 'admin@certificafacil.com' },
      update: { passwordHash: adminHash, role: 'superadmin', isActive: true },
      create: {
        name: 'Administrador',
        email: 'admin@certificafacil.com',
        passwordHash: adminHash,
        role: 'superadmin',
        isActive: true,
        planId: plan.id
      }
    });

    return { ok: true, message: 'Admin seeded', user: user.email };
  } catch (e) {
    request.log.error(e);
    return reply.code(500).send({ error: e.message });
  }
}

export async function logout(request, reply) {
  try {
    // Invalida todos os tokens JWT deste usuário incrementando a tokenVersion
    await prisma.user.update({
      where: { id: request.user.id },
      data: { tokenVersion: { increment: 1 } }
    });
    return { ok: true, message: 'Deslogado com sucesso' };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro ao deslogar' });
  }
}
