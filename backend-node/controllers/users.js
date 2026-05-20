import prisma from '../db.js';
import bcrypt from 'bcrypt';

export async function listUsers(request, reply) {
  if (request.user.role !== 'admin' && request.user.role !== 'superadmin') {
    return reply.code(403).send({ error: 'Sem permissão' });
  }

  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      include: { plan: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return {
      users: users.map(u => ({
        id: u.id, uid: u.uid, name: u.name, email: u.email,
        role: u.role, isActive: u.isActive, lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt, plan: u.plan
      }))
    };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro interno' });
  }
}

export async function getStats(request, reply) {
  if (request.user.role !== 'admin' && request.user.role !== 'superadmin') {
    return reply.code(403).send({ error: 'Sem permissão' });
  }

  try {
    const [users, activeUsers, certs, recentCerts] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      prisma.certificate.count({ where: { deletedAt: null } }),
      prisma.certificate.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, deletedAt: null }
      })
    ]);

    return { users, activeUsers, certificates: certs, recentCertificates: recentCerts };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro interno' });
  }
}

export async function updateMe(request, reply) {
  try {
    const { name, password, whatsappTemplate, emailTemplate, smtpConfig } = request.body;
    
    if (!name || name.trim() === '') {
      return reply.code(400).send({ error: 'Nome não pode ser vazio' });
    }

    const dataToUpdate = { name: name.trim() };

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return reply.code(400).send({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
      }
      dataToUpdate.passwordHash = await bcrypt.hash(password, 12);
    }

    if (whatsappTemplate !== undefined) dataToUpdate.whatsappTemplate = whatsappTemplate;
    if (emailTemplate !== undefined) dataToUpdate.emailTemplate = emailTemplate;
    if (smtpConfig !== undefined) dataToUpdate.smtpConfig = smtpConfig;

    const updatedUser = await prisma.user.update({
      where: { id: request.user.id },
      data: dataToUpdate
    });

    return { 
      success: true, 
      user: {
        id: updatedUser.id,
        uid: updatedUser.uid,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        whatsappTemplate: updatedUser.whatsappTemplate,
        emailTemplate: updatedUser.emailTemplate,
        smtpConfig: updatedUser.smtpConfig
      }
    };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro ao atualizar perfil' });
  }
}
