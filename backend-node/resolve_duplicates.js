import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Resolving duplicates in certificates for validation_code...');
  
  try {
    const duplicates = await prisma.$queryRaw`
      SELECT validation_code, COUNT(*) as count
      FROM certificates
      WHERE validation_code IS NOT NULL AND validation_code != ''
      GROUP BY validation_code
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found! You can safely run prisma db push.');
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

      console.log(`🔄 Correcting duplicates for code "${code}" (Count: ${certs.length})...`);
      
      // Keep the first one, update the rest
      for (let i = 1; i < certs.length; i++) {
          const cert = certs[i];
          const suffix = `-dup-${Date.now()}-${i}`;
          const newCode = `${code}${suffix}`.substring(0, 100); 
          console.log(`   - Updating cert ID ${cert.id}: "${code}" -> "${newCode}"`);
          await prisma.certificate.update({
              where: { id: cert.id },
              data: { validationCode: newCode }
          });
      }
    }
    
    console.log('✨ All duplicates have been resolved successfully!');
  } catch (error) {
    console.error('❌ Error resolving duplicates:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
