import prisma from '../db.js';

export const validateCertificate = async (request, reply) => {
  try {
    const { code } = request.params;
    if (!code) {
      return reply.status(400).send({ error: 'Código de validação não fornecido.' });
    }

    const certificate = await prisma.certificate.findUnique({
      where: { validationCode: code },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    if (!certificate) {
      return reply.status(404).send({ error: 'Certificado não encontrado ou inválido.' });
    }

    return reply.send({
      valid: true,
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      createdAt: certificate.createdAt,
      validationCode: certificate.validationCode,
      issuer: certificate.user.name
    });
  } catch (error) {
    console.error('Erro ao validar certificado:', error);
    return reply.status(500).send({ error: 'Erro interno ao validar o certificado.' });
  }
};
