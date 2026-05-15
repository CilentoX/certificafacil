import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'uploads', 'output');

/**
 * Deletes files in the output directory older than a certain age.
 * @param {number} maxAgeInHours - Max age of files to keep.
 */
export async function cleanupOldCertificates(maxAgeInHours = 24) {
    try {
        const files = await fs.readdir(OUTPUT_DIR);
        const now = Date.now();
        const maxAgeMs = maxAgeInHours * 60 * 60 * 1000;
        let deletedCount = 0;

        for (const file of files) {
            if (file === '.gitignore' || file === '.keep') continue;
            
            const filePath = path.join(OUTPUT_DIR, file);
            const stats = await fs.stat(filePath);
            const age = now - stats.mtimeMs;

            if (age > maxAgeMs) {
                await fs.unlink(filePath);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            console.log(`[Cleanup] Removidos ${deletedCount} certificados antigos (> ${maxAgeInHours}h).`);
        }
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('[Cleanup] Erro durante a limpeza:', err.message);
        }
    }
}
