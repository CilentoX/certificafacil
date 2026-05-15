import AdmZip from 'adm-zip';
import fs from 'fs';

const zip = new AdmZip('../Diplomas_AORE_2026_2029.docx');
const xml = zip.readAsText('word/document.xml');
const text = xml.replace(/<[^>]+>/g, ' ');

const regex = /Certificamos que o (.*?)\s+([^,]+)\s+, assumiu como\s+(.*?)\s+da AORE/g;

let match;
let csv = 'Nome,Cargo\n';
let count = 0;

while ((match = regex.exec(text)) !== null) {
  const patente = match[1].replace(/\s+/g, ' ').trim();
  const nome = match[2].replace(/\s+/g, ' ').trim();
  const cargo = match[3].replace(/\s+/g, ' ').trim();
  csv += `"${patente} ${nome}","${cargo}"\n`;
  count++;
}

fs.writeFileSync('../alunos_aore.csv', csv);
console.log(`Sucesso! ${count} registros gerados.`);
