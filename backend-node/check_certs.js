import { PrismaClient } from '@prisma/client';
console.log('🚀 Script starting...');
const prisma = new PrismaClient();

async function main() {
  try {
    const certs = await prisma.certificate.findMany({
      select: { id: true, validationCode: true }
    });
    console.log(`Found ${certs.length} certificates.`);
    
    const codes = certs.map(c => c.validationCode).filter(c => c !== null);
    const uniqueCodes = new Set(codes);
    
    console.log(`Unique non-null codes: ${uniqueCodes.size} / Total non-null: ${codes.length}`);
    
    if (uniqueCodes.size < codes.length) {
      console.log('⚠️ DUPLICATES DETECTED!');
      const counts = {};
      for (const code of codes) {
        counts[code] = (counts[code] || 0) + 1;
      }
      for (const [code, count] of Object.entries(counts)) {
        if (count > 1) {
          console.log(`Duplicate code: "${code}" (${count} occurrences)`);
        }
      }
    } else {
      console.log('✅ No duplicates found in existing data.');
    }
  } catch (e) {
    console.error('Error accessing database:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
