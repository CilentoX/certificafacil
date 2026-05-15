import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import helmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import generateRoutes from "./routes/generate.js";
import templateRoutes from "./routes/templates.js";
import userRoutes from "./routes/users.js";
import mpRoutes from "./routes/mp.js";
import integrationRoutes from "./routes/integrations.js";
import projectRoutes from "./routes/projects.js";
import assetRoutes from "./routes/assets.js";
import fontRoutes from "./routes/fonts.js";
import publicRoutes from "./routes/public.js";
import prisma from "./db.js";
import { whatsappService } from "./services/whatsapp.js";
import { cleanupOldCertificates } from "./utils/cleanup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const fastify = Fastify({ logger: true });
const PORT = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;

// ── Plugins ──
await fastify.register(cors, { 
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

await fastify.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});
await fastify.register(fastifyRateLimit, {
  max: 200,
  timeWindow: '1 minute',
  errorResponseBuilder: function (request, context) {
    return {
      error: 'Você atingiu o limite de taxa de pacotes, retorne daqui a 1 minuto.',
      statusCode: 429
    };
  }
});

await fastify.register(fastifyJwt, { secret: JWT_SECRET });
await fastify.register(fastifyMultipart, {
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Static uploads folder
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

await fastify.register(fastifyStatic, {
  root: uploadsDir,
  prefix: "/uploads/",
  decorateReply: false,
});

// Static fonts folder (to serve TTF/OTF files for @font-face)
const fontsDir = path.join(__dirname, "assets", "fonts");
if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir, { recursive: true });

await fastify.register(fastifyStatic, {
  root: fontsDir,
  prefix: "/assets/fonts/",
  decorateReply: false,
});

// ── Auth Decorator ──
fastify.decorate("authenticate", async function (request, reply) {
  try {
    const decoded = await request.jwtVerify();
    // Validate tokenVersion
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { tokenVersion: true, isActive: true }
    });
    
    if (!user || !user.isActive) {
      return reply.code(403).send({ error: "Sua conta foi desativada." });
    }
    if (decoded.tokenVersion !== user.tokenVersion) {
      return reply.code(401).send({ error: "Sessão expirada. Por favor, faça login novamente." });
    }
    
  } catch (err) {
    reply.code(401).send({ error: "Token inválido ou expirado" });
  }
});

// ── Health ──
fastify.get("/api/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

// ── Routes ──
await fastify.register(authRoutes, { prefix: "/api/auth" });
await fastify.register(generateRoutes, { prefix: "/api/generate" });
await fastify.register(templateRoutes, { prefix: "/api/templates" });
await fastify.register(userRoutes, { prefix: "/api/users" });
await fastify.register(mpRoutes, { prefix: "/api/mp" });
await fastify.register(integrationRoutes, { prefix: "/api/integrations" });
await fastify.register(projectRoutes, { prefix: "/api/projects" });
await fastify.register(assetRoutes, { prefix: "/api/assets" });
await fastify.register(fontRoutes, { prefix: "/api/fonts" });
await fastify.register(publicRoutes, { prefix: "/api/public" });



// ── Graceful Shutdown ──
const shutdown = async (signal) => {
  console.log(`\n🛑 Recebido ${signal}. Encerrando servidor e conexões...`);
  try {
    await fastify.close();
    await prisma.$disconnect();
    console.log("🔌 Fastify e Prisma encerrados com sucesso.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro durante encerramento:", err);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ── Prisma Connect with Retry ──
const connectWithRetry = async (retries = 5, delay = 3000) => {
  for (let i = 1; i <= retries; i++) {
    try {
      await prisma.$connect();
      console.log("💾 Conexão com o banco de dados estabelecida.");
      return;
    } catch (err) {
      console.error(`⚠️ Tentativa ${i}/${retries} de conexão ao BD falhou. Retentando em ${delay/1000}s...`);
      if (i === retries) {
        console.error("❌ Falha crítica: Limite de reconexões com o banco atingido.");
        throw err;
      }
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

import cron from "node-cron";

// ── Start ──
try {
  await connectWithRetry();

  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`🚀 CertificaFacil API on http://localhost:${PORT}`);
  
  // Limpeza inicial e agendamento (a cada 6 horas para arquivos temporários)
  cleanupOldCertificates();
  setInterval(() => cleanupOldCertificates(), 6 * 60 * 60 * 1000);

  // Cron Job de Limpeza Profunda (Meia-noite)
  cron.schedule("0 0 * * *", async () => {
    console.log("[Cron] Iniciando limpeza de Logs do Banco de Dados...");
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const delDelivery = await prisma.deliveryLog.deleteMany({
        where: { status: 'sent', createdAt: { lt: thirtyDaysAgo } }
      });

      const delActivity = await prisma.activityLog.deleteMany({
        where: { createdAt: { lt: thirtyDaysAgo } }
      });

      console.log(`[Cron] Limpeza concluída: ${delDelivery.count} DeliveryLogs e ${delActivity.count} ActivityLogs removidos.`);
    } catch (err) {
      console.error("[Cron] Erro na limpeza:", err.message);
    }
  });

  // Resumir conexões de WhatsApp ativas
  whatsappService.loadActiveSessions().catch(err => {
    console.error("❌ Erro ao inicializar sessões do WhatsApp:", err.message);
  });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
