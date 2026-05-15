import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSIONS_DIR = path.join(__dirname, '..', '..', 'whatsapp_sessions');

// Ensure sessions directory exists
try { fs.mkdirSync(SESSIONS_DIR, { recursive: true }); } catch (e) {}

class WhatsappService {
  constructor() {
    this.clients = new Map(); // Store sockets by userId
    this.qrs = new Map();     // Store latest QR string by userId
    this.statuses = new Map(); // Store statuses locally for quick getStatus
  }

  async initialize(userId) {
    if (this.clients.has(userId)) {
      const status = this.statuses.get(userId);
      if (status === 'ready' || status === 'loading') {
          return;
      }
      try {
        const oldSock = this.clients.get(userId);
        oldSock?.end(new Error('Reconnecting'));
      } catch (e) {}
      this.clients.delete(userId);
    }

    console.log(`Initializing Baileys Socket for user ${userId}...`);
    this.statuses.set(userId, 'loading');
    
    const sessionDir = path.join(SESSIONS_DIR, `user_${userId}`);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['CertificaFacil', 'Chrome', '1.0.0']
    });

    this.clients.set(userId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`WhatsApp QR Code received for user ${userId}`);
        this.qrs.set(userId, qr);
        this.statuses.set(userId, 'qr');
        await prisma.user.update({ where: { id: userId }, data: { whatsappStatus: 'qr' } });
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`WhatsApp Disconnected for user ${userId}, reconnect:`, shouldReconnect);
        
        if (shouldReconnect) {
          // Reconnect automatically unless logged out
          setTimeout(() => this.initialize(userId), 2000);
        } else {
          // Logged out
          this.statuses.set(userId, 'disconnected');
          this.qrs.delete(userId);
          this.clients.delete(userId);
          
          try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (e) {}

          await prisma.user.update({
            where: { id: userId },
            data: { whatsappStatus: 'disconnected' }
          });
        }
      } else if (connection === 'open') {
        console.log(`WhatsApp is Ready for user ${userId}!`);
        this.statuses.set(userId, 'ready');
        this.qrs.delete(userId);
        
        await prisma.user.update({
          where: { id: userId },
          data: { whatsappStatus: 'ready' }
        });
      }
    });
  }

  getQr(userId) {
    return this.qrs.get(userId);
  }

  getStatus(userId) {
    return this.statuses.get(userId) || 'disconnected';
  }

  getInfo(userId) {
    const sock = this.clients.get(userId);
    if (!sock || !sock.user) return null;
    return {
      pushName: sock.user.name || null,
      jid: sock.user.id || null,
      phone: sock.user.id ? sock.user.id.split('@')[0].split(':')[0] : null
    };
  }

  async disconnect(userId) {
    const sock = this.clients.get(userId);
    if (sock) {
      try {
          await sock.logout();
      } catch (e) {
          sock.end(undefined);
      }
      this.clients.delete(userId);
    }
    this.qrs.delete(userId);
    this.statuses.set(userId, 'disconnected');
    
    const sessionDir = path.join(SESSIONS_DIR, `user_${userId}`);
    try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (e) {}

    await prisma.user.update({
      where: { id: userId },
      data: { whatsappStatus: 'disconnected' }
    });
  }

  async sendPdfMessage(userId, phone, buffer, caption, filename, retries = 1) {
    const sock = this.clients.get(userId);
    if (!sock || this.statuses.get(userId) !== 'ready') {
        throw new Error('WhatsApp is not ready for this user');
    }

    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (cleaned.length <= 11) {
      if (!cleaned.startsWith('55')) cleaned = '55' + cleaned;
    }

    const jid = `${cleaned}@s.whatsapp.net`;

    for (let i = 0; i <= retries; i++) {
      try {
        await this.sleep(1000);
        
        // Use Baileys natively to send a document
        const result = await sock.sendMessage(jid, { 
            document: buffer, 
            mimetype: 'application/pdf', 
            fileName: filename,
            caption: caption
        });
        
        return result;
      } catch (err) {
        if (i === retries) throw err;
        await this.sleep(4000);
      }
    }
  }

  async sendTextMessage(userId, phone, text) {
    const sock = this.clients.get(userId);
    if (!sock || this.statuses.get(userId) !== 'ready') {
        throw new Error('WhatsApp não está pronto para este usuário');
    }

    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (cleaned.length <= 11) {
      if (!cleaned.startsWith('55')) cleaned = '55' + cleaned;
    }

    const jid = `${cleaned}@s.whatsapp.net`;
    
    await this.sleep(1000);
    return await sock.sendMessage(jid, { text });
  }

  async loadActiveSessions() {
      try {
          await this.sleep(2000);
          const activeUsers = await prisma.user.findMany({
              where: { 
                  whatsappStatus: { in: ['ready', 'authenticated'] }
              }
          });
          
          if (activeUsers.length > 0) {
              console.log(`Found ${activeUsers.length} active Baileys sessions to resume.`);
              for (const user of activeUsers) {
                  // Wait slightly between spawning sockets to prevent rapid API calls
                  await this.sleep(1000); 
                  this.initialize(user.id).catch(err => {
                      console.error(`Failed to resume session for user ${user.id}:`, err.message);
                  });
              }
          }
      } catch (err) {
          console.error('Error loading active sessions.', err.message);
      }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const whatsappService = new WhatsappService();
