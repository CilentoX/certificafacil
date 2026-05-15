import prisma from './db.js';
import fs from 'fs';

async function main() {
  let log = 'Testing DB connection...\n';
  try {
    const users = await prisma.user.findMany();
    log += `Found ${users.length} users.\n`;
    for (const u of users) {
      log += `User: ${u.email} | active: ${u.isActive} | role: ${u.role}\n`;
    }
  } catch (e) {
    log += `Error fetching users: ${e.message}\n${e.stack}\n`;
  } finally {
    await prisma.$disconnect();
    fs.writeFileSync('test_output_direct.txt', log);
    process.exit();
  }
}

main();
