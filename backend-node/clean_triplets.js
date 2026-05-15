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
  console.log('🔍 Checking for duplicate [userId, studentName, templateName] in certificates table...');

  // Group by triplet
  const duplicates = await prisma.$queryRaw`
    SELECT user_id, student_name, template_name, COUNT(*) as count
    FROM certificates
    GROUP BY user_id, student_name, template_name
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found.');
    return;
  }

  console.log(`⚠️ Found ${duplicates.length} duplicate triplets:`);
  
  let deletedCount = 0;

  for (const dup of duplicates) {
    const certs = await prisma.certificate.findMany({
      where: {
        userId: dup.user_id,
        studentName: dup.student_name,
        templateName: dup.template_name
      },
      orderBy: { createdAt: 'asc' }
    });

    // Keep the first one, delete the rest
    for (let i = 1; i < certs.length; i++) {
        const cert = certs[i];
        console.log(`🗑️ Deleting duplicate certificate ${cert.id}`);
        await prisma.certificate.delete({
            where: { id: cert.id }
        });
        deletedCount++;
    }
  }

  console.log(`✨ All duplicates fixed! Removed ${deletedCount} duplicate certificates.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
