import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';

try {
  console.log('Starting force seed...');
  let log = '';
  const npxCmd = os.platform() === 'win32' ? 'npx.cmd' : 'npx';
  
  log += 'Running Prisma push...\n';
  const pushRes = execSync(`${npxCmd} prisma db push --accept-data-loss`, { encoding: 'utf-8', stdio: 'pipe' });
  log += pushRes + '\n\n';

  log += 'Running seed.js...\n';
  const seedRes = execSync(`node prisma/seed.js`, { encoding: 'utf-8', stdio: 'pipe' });
  log += seedRes + '\n\n';

  fs.writeFileSync('force_seed.log', log);
  console.log('Force seed complete!');
} catch (err) {
  const errLog = `ERROR!\n${err.message}\nSTDOUT:\n${err.stdout?.toString()}\nSTDERR:\n${err.stderr?.toString()}`;
  fs.writeFileSync('force_seed.log', errLog);
  console.error('Force seed failed!', err);
}
