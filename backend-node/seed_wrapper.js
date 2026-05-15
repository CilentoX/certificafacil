import { execSync } from 'child_process';
import fs from 'fs';

try {
  const result = execSync('node prisma/seed.js', { encoding: 'utf-8', cwd: process.cwd() });
  fs.writeFileSync('true_seed.log', 'SUCCESS:\n' + result);
} catch (error) {
  fs.writeFileSync('true_seed.log', 'ERROR:\n' + error.message + '\nSTDOUT:\n' + error.stdout + '\nSTDERR:\n' + error.stderr);
}
