import { PDFDocument, StandardFonts } from 'pdf-lib';

async function test() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  console.log('Embedder.font keys:', Object.keys(font.embedder.font));
  console.log('Embedder.font contents:', font.embedder.font);
}

test();
