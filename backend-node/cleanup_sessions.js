import prisma from './db.js';

async function cleanup() {
  try {
    const result = await prisma.user.updateMany({
      data: {
        whatsappStatus: 'disconnected',
        whatsappSession: null
      }
    });
    console.log(`Sucesso: ${result.count} usuários resetados para status 'disconnected'.`);
  } catch (error) {
    console.error('Erro na limpeza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
