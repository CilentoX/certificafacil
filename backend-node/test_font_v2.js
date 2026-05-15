import { PDFDocument, StandardFonts } from 'pdf-lib';

async function test() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const size = 24;
  console.log('font.heightAtSize(24):', font.heightAtSize ? font.heightAtSize(size) : 'N/A');
  // Check if widthOfTextAtSize exists (we know it does)
  console.log('font.widthOfTextAtSize("Test", 24):', font.widthOfTextAtSize("Test", size));
  
  // Try to find any ascent method
  const proto = Object.getPrototypeOf(font);
  console.log('Font prototype methods:', Object.getOwnPropertyNames(proto).filter(m => typeof font[m] === 'function'));
}

test();
