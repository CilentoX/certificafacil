import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  console.log('🌱 Seeding database...');

  // Plans
  await prisma.plan.upsert({
    where: { slug: 'trial' },
    update: {},
    create: { slug: 'trial', name: 'Trial (7 dias)', price: 0, maxCerts: 5, maxTemplates: 2, features: { batch: false, custom_fonts: false } }
  });
  await prisma.plan.upsert({
    where: { slug: 'basic' },
    update: {},
    create: { slug: 'basic', name: 'Básico', price: 29.90, maxCerts: 25, maxTemplates: 5, features: { batch: true, custom_fonts: false } }
  });
  await prisma.plan.upsert({
    where: { slug: 'pro' },
    update: {},
    create: { slug: 'pro', name: 'Profissional', price: 59.90, maxCerts: 50, maxTemplates: 20, features: { batch: true, custom_fonts: true } }
  });
  const unlimited = await prisma.plan.upsert({
    where: { slug: 'unlimited' },
    update: {},
    create: { slug: 'unlimited', name: 'Ilimitado', price: 99.90, maxCerts: 0, maxTemplates: 0, features: { batch: true, custom_fonts: true } }
  });

  // Admin user
  const adminHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@certificafacil.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@certificafacil.com',
      passwordHash: adminHash,
      role: 'superadmin',
      planId: unlimited.id
    }
  });

  // Settings
  const settings = [
    { settingKey: 'site_name', settingValue: 'CertificaFacil' },
    { settingKey: 'allow_registration', settingValue: '1' },
    { settingKey: 'default_plan', settingValue: 'trial' },
    { settingKey: 'trial_days', settingValue: '7' },
    { settingKey: 'maintenance_mode', settingValue: '0' },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { settingKey: s.settingKey },
      update: {},
      create: s
    });
  }

  console.log('✅ Seed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
