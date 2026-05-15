import CertificateEngine from "../utils/CertificateEngine.js";
import prisma from "../db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import AdmZip from "adm-zip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
const TEMPLATES_DIR = path.join(UPLOADS_DIR, "templates");

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
}

function applyTemplate(template, data) {
  let result = template;
  Object.entries(data).forEach(([key, val]) => {
    result = result.replace(new RegExp(`\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'gi'), String(val || ''));
  });
  return result;
}

export async function generatePreview(request, reply) {
  try {
    const { templateFile, config, studentName } = request.body || {};

    if (!templateFile) {
      return reply.code(400).send({ error: "Template não especificado" });
    }

    const templatePath = path.join(TEMPLATES_DIR, templateFile);
    const parsedConfig =
      typeof config === "string"
        ? JSON.parse(config)
        : config || { fields: [] };
    const name = studentName || "Nome Exemplo";

    const pdfBuffer = await CertificateEngine.generateCertificate(
      templatePath,
      name,
      parsedConfig,
      null,
    );

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", 'inline; filename="preview.pdf"');
    return reply.send(pdfBuffer);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Falha ao gerar preview" });
  }
}

import { whatsappService } from "../services/whatsapp.js";
import { emailService } from "../services/email.js";

export async function generateBatch(request, reply) {
  const { templateFile, config, students, sendWhatsapp, sendEmail, skipDuplicates, whatsappTemplate, emailSubject, emailTemplate } =
    request.body || {};

  if (!templateFile || !students?.length) {
    return reply
      .code(400)
      .send({ error: "Template e lista de participantes são obrigatórios" });
  }

  // Prepara SSE header na resposta e força CORS para evitar bloqueio no stream
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.setHeader("Access-Control-Allow-Origin", request.headers.origin || "*");
  reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
  
  // Se for POST com Fetch Streaming, isso permite o client ler conforme o backend joga dados

  const sendEvent = (event, data) => {
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await ensureDir(path.join(UPLOADS_DIR, "output"));
    const templatePath = path.join(TEMPLATES_DIR, templateFile);
    const parsedConfig =
      typeof config === "string" ? JSON.parse(config) : config;

    // --- GROUPING LOGIC ---
    const groupsMap = new Map();
    students.forEach(s => {
      const sName = typeof s === "string" ? s : s.nome || s.name || "Sem Nome";
      const sPhone = typeof s === "object" ? s.whatsapp || s.telefone : null;
      const sEmail = typeof s === "object" ? s.email : null;
      const key = sPhone || sEmail || sName; 
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key).push(s);
    });

    const studentGroups = Array.from(groupsMap.values());
    const total = students.length;
    const results = [];
    let processedCount = 0;

    sendEvent("start", {
      total,
      message: "Iniciando processamento em lote agrupado...",
    });

    for (let g = 0; g < studentGroups.length; g++) {
      const group = studentGroups[g];
      const firstStudent = group[0];
      
      // Common data for the group
      const gName = typeof firstStudent === "string" ? firstStudent : firstStudent.nome || firstStudent.name || `aluno_${g}`;
      const gPhone = typeof firstStudent === "object" ? firstStudent.whatsapp || firstStudent.telefone : null;
      const gEmail = typeof firstStudent === "object" ? firstStudent.email : null;

      // Construct a combined list of courses for this group
      const courseList = group.map(s => {
        const c = typeof s === "object" ? s.curso || s.course : null;
        return c || templateFile.replace('.pdf', '').replace(/_/g, ' ');
      });
      const combinedCourses = courseList.length > 1 
        ? courseList.slice(0, -1).join(', ') + ' e ' + courseList.slice(-1)
        : courseList[0];

      for (let j = 0; j < group.length; j++) {
        const student = group[j];
        const name = typeof student === "string" ? student : student.nome || student.name || gName;
        const courseName = typeof student === "object" ? student.curso || student.course || null : null;
        
        processedCount++;
        sendEvent("progress", {
          current: processedCount,
          total,
          name,
          message: `Gerando PDF (${j+1}/${group.length}) para ${name}...`,
        });

        // --- DUPLICATE CHECK ---
        if (skipDuplicates) {
          const checkWhere = {
            userId: request.user.id,
            studentName: name,
            templateName: templateFile
          };
          if (courseName) checkWhere.courseName = courseName;
          
          const existing = await prisma.certificate.findFirst({ where: checkWhere });
          if (existing) {
            sendEvent("warning", { message: `Pulando ${name} - ${courseName || ''} (Já existe)` });
            results.push({ id: existing.id, name, path: existing.filePath });
            continue;
          }
        }

        const safeName = name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
        const outputPath = path.join(UPLOADS_DIR, "output", `cert_${safeName}_${processedCount}.pdf`);

        let vCode;
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
          vCode = crypto.randomBytes(6).toString("hex").toUpperCase();
          const existing = await prisma.certificate.findUnique({ where: { validationCode: vCode } });
          if (!existing) isUnique = true;
          attempts++;
        }

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const validationLink = `${baseUrl}/v/${vCode}`;

        const pdfBuffer = await CertificateEngine.generateCertificate(
          templatePath,
          student,
          parsedConfig,
          outputPath,
          validationLink,
        );

        const certRecord = await prisma.certificate.create({
          data: {
            userId: request.user.id,
            templateName: templateFile,
            studentName: name,
            courseName: courseName,
            filePath: outputPath,
            configJson: parsedConfig,
            validationCode: vCode,
            validationUrl: validationLink,
          },
        });

        results.push({ id: certRecord.id, name, path: outputPath });

        // --- DELIVERY ---
        if (sendWhatsapp && gPhone) {
          await whatsappService.sleep(1500 + Math.random() * 2000); // Small delay between messages
          
          try {
            const context = { 
              nome: name, 
              curso: combinedCourses, // Use combined courses for the message
              vlink: validationLink,
              ...(typeof student === 'object' ? student : {})
            };

            // Only send the full template message for the first certificate in the group
            // For others, send a shorter notice or just the file
            const msg = j === 0 
              ? applyTemplate(whatsappTemplate || "Olá {nome}! Seu certificado de {curso} chegou. Validação: {vlink}", context)
              : `Segunda via / Adicional: ${courseName || combinedCourses}`;

            await whatsappService.sendPdfMessage(
              request.user.id,
              gPhone,
              pdfBuffer,
              msg,
              `Certificado_${safeName}_${j+1}.pdf`,
            );

            await prisma.deliveryLog.create({
              data: {
                userId: request.user.id,
                certificateId: certRecord.id,
                channel: "whatsapp",
                recipient: gPhone,
                status: "sent",
              },
            });
          } catch (zapErr) {
            sendEvent("warning", { message: `Erro Zap (${name}): ${zapErr.message}` });
          }
        }

        if (sendEmail && gEmail) {
          try {
            const context = { 
              nome: name, 
              curso: combinedCourses,
              vlink: validationLink,
              ...(typeof student === 'object' ? student : {})
            };

            const subject = applyTemplate(emailSubject || "Seu certificado de conclusão: {curso}", context);
            const body = applyTemplate(emailTemplate || "<p>Parabéns {nome}! Seu certificado de {curso} está em anexo.</p>", context);

            await emailService.sendCertificate(gEmail, name, subject, pdfBuffer, body, request.user.id);
            
            await prisma.deliveryLog.create({
              data: {
                userId: request.user.id,
                certificateId: certRecord.id,
                channel: "email",
                recipient: gEmail,
                status: "sent",
              },
            });
          } catch (mailErr) {
            sendEvent("warning", { message: `Erro e-mail (${name}): ${mailErr.message}` });
          }
        }

        if (processedCount % 5 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    }

    // Registrar Log de Auditoria
    try {
      await prisma.activityLog.create({
        data: {
          userId: request.user.id,
          action: 'BATCH_GENERATED',
          details: { count: results.length, template: templateFile }
        }
      });
    } catch(e) { /* silent fail for logging */ }

    sendEvent("done", {
      ok: true,
      count: results.length,
      files: results.map((r) => r.name),
      ids: results.map(r => r.id)
    });
    reply.raw.end();
  } catch (error) {
    request.log.error(error);
    sendEvent("error", { error: "Falha letal ao gerar lote" });
    reply.raw.end();
  }
}

export async function downloadBatchZip(request, reply) {
  try {
    const { ids } = request.body || {};
    if (!ids || !ids.length) return reply.code(400).send({ error: "Nenhum ID fornecido" });

    const certificates = await prisma.certificate.findMany({
      where: { 
        id: { in: ids.map(id => parseInt(id)) },
        userId: request.user.id
      }
    });

    if (!certificates.length) return reply.code(404).send({ error: "Nenhum certificado encontrado" });

    const zip = new AdmZip();
    
    for (const cert of certificates) {
      if (cert.filePath) {
        try {
          const content = await fs.readFile(cert.filePath);
          const fileName = path.basename(cert.filePath);
          zip.addFile(fileName, content);
        } catch (e) {
          console.error(`Falha ao ler arquivo para ZIP: ${cert.filePath}`, e.message);
        }
      }
    }

    const zipBuffer = zip.toBuffer();
    
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="certificados_${Date.now()}.zip"`);
    return reply.send(zipBuffer);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Falha ao gerar arquivo ZIP" });
  }
}
