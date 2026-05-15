import nodemailer from 'nodemailer';
import prisma from '../db.js';

class EmailService {
  /**
   * Envia email contendo PDF em anexo.
   * Se o usuário tiver configuração SMTP customizada, usa nodemailer.
   * Caso contrário, usa a API da Brevo (padrão do sistema).
   */
  async sendCertificate(to, studentName, subject, pdfBuffer, htmlContent, userId) {
    // Tentar usar SMTP customizado do usuário
    if (userId) {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { smtpConfig: true } });
        if (user?.smtpConfig && user.smtpConfig.host && user.smtpConfig.user) {
          return this._sendViaSmtp(user.smtpConfig, to, studentName, subject, pdfBuffer, htmlContent);
        }
      } catch (e) {
        console.warn('Falha ao verificar SMTP customizado, usando Brevo:', e.message);
      }
    }

    // Fallback: Brevo API
    return this._sendViaBrevo(to, studentName, subject, pdfBuffer, htmlContent);
  }

  /**
   * Envio via SMTP customizado usando nodemailer
   */
  async _sendViaSmtp(config, to, studentName, subject, pdfBuffer, htmlContent) {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port) || 587,
      secure: config.secure === true || config.port === '465',
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: { rejectUnauthorized: false }
    });

    const senderEmail = config.senderEmail || config.user;
    const senderName = config.senderName || 'CertificaFacil';

    const html = htmlContent || `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #6366f1;">Parabéns, ${studentName}!</h2>
        <p>Seu certificado está em anexo.</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject: subject || 'Seu certificado de conclusão',
      html,
      attachments: pdfBuffer ? [{
        filename: `Certificado_${studentName.replace(/\s+/g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : []
    });

    console.log('📧 SMTP Custom Success. MessageId:', info.messageId);
    return info;
  }

  /**
   * Envio via Brevo REST API (v3) — método original do sistema
   */
  async _sendViaBrevo(to, studentName, subject, pdfBuffer, htmlContent) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || 'CertificaFacil';

    if (!apiKey) {
      throw new Error('BREVO_API_KEY não configurada no .env');
    }

    const base64Pdf = pdfBuffer.toString('base64');

    const emailData = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name: studentName }],
      subject: subject || 'Seu certificado de conclusão',
      htmlContent: htmlContent || `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #6366f1;">Parabéns, ${studentName}!</h2>
            <p>Seu certificado está em anexo.</p>
          </div>
      `,
      attachment: [
        {
          content: base64Pdf,
          name: `Certificado_${studentName.replace(/\s+/g, '_')}.pdf`
        }
      ]
    };

    try {
      console.log('--- Enviando via Brevo API V3 ---');
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ Erro na API da Brevo. Status:', response.status);
        console.error('❌ Detalhes da Falha Brevo:', JSON.stringify(responseData, null, 2));
        throw new Error(`Falha no envio (Brevo API): ${responseData.message || response.statusText}`);
      }

      console.log('🚀 Brevo API Success. Message IDs:', responseData.messageIds || responseData.messageId);
      return responseData;
    } catch (e) {
      console.error('❌ Erro no Service de Email:', e.message);
      throw e;
    }
  }

  /**
   * Testar conexão SMTP customizada (para validação no frontend)
   * Se 'to' for fornecido, também envia um e-mail real de teste.
   */
  async testSmtpConnection(config, to = null) {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port) || 587,
      secure: config.secure === true || config.port === '465',
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
    });

    await transporter.verify();

    if (to) {
      const subject = 'Teste de Envio SMTP - CertificaFacil';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #6366f1; border-radius: 8px;">
          <h2 style="color: #6366f1;">Sucesso! SMTP Próprio Funcionando</h2>
          <p>Este é um e-mail de teste enviado usando suas configurações personalizadas.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.8rem; color: #888;">Remetente configurado: <strong>${config.senderName} (${config.senderEmail})</strong></p>
        </div>
      `;

      await transporter.sendMail({
        from: `"${config.senderName || 'CertificaFacil'}" <${config.senderEmail || config.user}>`,
        to,
        subject,
        html: htmlContent
      });
    }

    return true;
  }

  async sendTestEmail(to, userId) {
    const subject = 'Teste de Integração - CertificaFacil';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #6366f1;">Teste de Conexão</h2>
        <p>Olá!</p>
        <p>Este é um e-mail de teste enviado para verificar se suas configurações de integração no <strong>CertificaFacil</strong> estão funcionando corretamente.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 0.8rem; color: #888;">Se você recebeu este e-mail, sua integração está configurada com sucesso!</p>
      </div>
    `;

    // Tentar usar SMTP customizado do usuário se existir
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { smtpConfig: true } });
      if (user?.smtpConfig && user.smtpConfig.host && user.smtpConfig.user) {
        console.log(`📧 Testando envio via SMTP Customizado para o usuário ${userId}`);
        return this._sendViaSmtp(user.smtpConfig, to, 'Usuário Teste', subject, null, htmlContent);
      }
    }

    console.log('📧 Testando envio via Brevo (Padrão)');
    // Fallback: Brevo
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || 'CertificaFacil';

    if (!apiKey) throw new Error('BREVO_API_KEY não configurada');

    const emailData = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name: 'Usuário Teste' }],
      subject,
      htmlContent
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Falha no envio via Brevo');
    }
    return true;
  }
}

export const emailService = new EmailService();
