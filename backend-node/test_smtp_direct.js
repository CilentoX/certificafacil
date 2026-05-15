import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function test() {
  console.log('--- Teste SMTP Direto ---');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('User:', process.env.SMTP_USER);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    debug: true, // Habilita debug no console
    logger: true // Loga todo o protocolo SMTP
  });

  const mailOptions = {
    from: `"Teste" <${process.env.SMTP_USER}>`, // Usando o proprio user como from para testar
    to: 'lucascilento82@gmail.com',
    subject: 'Teste SMTP Direto CertificaFacil',
    text: 'Se voce recebeu este email, o SMTP esta funcionando.'
  };

  try {
    console.log('Enviando...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Enviado com sucesso!', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error('❌ Erro no envio SMTP:', err);
  }
}

test();
 Broadway
