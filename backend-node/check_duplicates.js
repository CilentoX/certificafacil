import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  console.log('🔍 Checking for duplicate validation_code in certificates table...');

  const duplicates = await prisma.$queryRaw`
    SELECT validation_code, COUNT(*) as count
    FROM certificates
    WHERE validation_code IS NOT NULL AND validation_code != ''
    GROUP BY validation_code
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found.');
    return;
  }

  console.log(`⚠️ Found ${duplicates.length} duplicate validation_code values:`);
  console.log(duplicates);

  for (const dup of duplicates) {
    const code = dup.validation_code;
    const certs = await prisma.certificate.findMany({
      where: { validationCode: code },
      orderBy: { createdAt: 'asc' }
    });

    // Keep the first one, update the rest
    for (let i = 1; i < certs.length; i++) {
        const cert = certs[i];
        const newCode = `${code}-dup-${Date.now()}-${i}`;
        console.log(`🔄 Updating certificate ${cert.id} with new code: ${newCode}`);
        await prisma.certificate.update({
            where: { id: cert.id },
            data: { validationCode: newCode }
        });
    }
  }

  console.log('✨ All duplicates fixed!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
