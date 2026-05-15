import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { emailService } from "./services/email.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

async function test() {
  console.log("--- Depuração de E-mail CertificaFacil (API v3) ---");
  console.log("Domínio Remetente:", process.env.BREVO_SENDER_EMAIL);
  console.log("Iniciando envio via API...");

  try {
    const testEmail = "lucascilento82@gmail.com";
    const dummyPdf = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Title (Teste) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
    );

    console.log(`Tentando enviar e-mail de teste para: ${testEmail}...`);

    // 2. Tentar o envio via API
    const result = await emailService.sendCertificate(
      testEmail,
      "Lucas Teste API",
      "Curso de Certificação Digital",
      dummyPdf,
    );

    console.log("🚀 Envio via API finalizado com sucesso!");
    console.log("Resultado:", JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.error("❌ ERRO NA API:");
    console.error("Mensagem:", err.message);
    console.error("Stack Trace:", err.stack);
  }
}

test();
