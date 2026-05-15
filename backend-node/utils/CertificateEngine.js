import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.join(__dirname, "..", "..", "uploads", "assets");
const FONTS_DIR = path.join(__dirname, "..", "..", "backend-node", "assets", "fonts");

const fontCache = {};

class CertificateEngine {
  /**
   * Final precision motor for certificate generation.
   * Eliminates discrepancies between browser canvas and PDF points.
   */
  static async generateCertificate(templatePath, studentData, config, outputPath, validationUrl = null) {
    try {
      const templateBytes = await fs.readFile(templatePath);
      const srcDoc = await PDFDocument.load(templateBytes);
      
      const pdfDoc = await PDFDocument.create();
      const [templatePage] = await pdfDoc.copyPages(srcDoc, [0]);
      const page = pdfDoc.addPage(templatePage);
      
      // Actual PDF size in points
      const { width: pW, height: pH } = page.getSize();

      // Logical size from the browser editor
      const cW = config.canvasWidth || 842;
      const cH = config.canvasHeight || 595;
      
      // Calculate ratios
      const rx = pW / cW;
      const ry = pH / cH;

      const fields = config.text_fields || config.fields || [];
      const standardFontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const standardFontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const standardFontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const standardFontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

      // --- FONT LOADING HELPER ---
      const getFont = async (fontFamily, weight = 'Regular') => {
        const cacheKey = `${fontFamily}-${weight}`;
        if (fontCache[cacheKey]) return await pdfDoc.embedFont(fontCache[cacheKey]);
        
        try {
          // Attempt custom font with various extensions
          const extensions = ['.ttf', '.otf'];
          let fontBuffer = null;

          for (const ext of extensions) {
            try {
              const fontFile = path.join(FONTS_DIR, `${fontFamily}${ext}`);
              fontBuffer = await fs.readFile(fontFile);
              break;
            } catch (e) {
              // Ignore and try next
            }
          }

          // If not found by family name alone, try with weight suffix (for standard fonts)
          if (!fontBuffer) {
            for (const ext of extensions) {
              try {
                const fontFile = path.join(FONTS_DIR, `${fontFamily}-${weight}${ext}`);
                fontBuffer = await fs.readFile(fontFile);
                break;
              } catch (e) {
                // Ignore and try next
              }
            }
          }

          if (fontBuffer) {
             const font = await pdfDoc.embedFont(fontBuffer);
             fontCache[cacheKey] = font;
             return font;
          }
          throw new Error('Font file not found on disk');
        } catch (err) {
          // Fallback to standard
          if (weight === 'Bold') return standardFontBold;
          if (weight === 'Italic') return standardFontItalic;
          if (weight === 'BoldItalic') return standardFontBoldItalic;
          return standardFontNormal;
        }
      };

      for (const field of fields) {
        // --- HTML DOM Offsets ---
        // .canvas-field has padding: 2px 4px; and border: 1px
        const contentOffsetX = 5; // borderLeft + paddingLeft (1 + 4)
        const contentOffsetY = 3; // borderTop + paddingTop (1 + 2)
        const contentReduceW = 10; // offset * 2
        const contentReduceH = 6;  // offset * 2

        // --- IMAGE HANDLING ---
        if (field.type === 'image' || field.imageUrl) {
          try {
            let buffer;
            const url = field.imageUrl || field.content;
            if (url.startsWith('http')) {
              if (url.includes('/uploads/assets/')) {
                const name = url.split('/uploads/assets/').pop();
                buffer = await fs.readFile(path.join(ASSETS_DIR, name));
              } else {
                const res = await fetch(url);
                buffer = Buffer.from(await res.arrayBuffer());
              }
            } else {
              buffer = await fs.readFile(path.join(ASSETS_DIR, url));
            }

            if (buffer) {
              const isPng = url.toLowerCase().endsWith('.png');
              const img = isPng ? await pdfDoc.embedPng(buffer) : await pdfDoc.embedJpg(buffer);
              
              const w = ((parseFloat(field.width) || 100) - contentReduceW) * rx;
              const h = ((parseFloat(field.height) || 100) - contentReduceH) * ry;
              const x = ((parseFloat(field.posX) || 0) + contentOffsetX) * rx;
              const y = pH - (((parseFloat(field.posY) || 0) + contentOffsetY) * ry) - h;

              page.drawImage(img, { x, y, width: Math.max(0, w), height: Math.max(0, h), opacity: (field.opacity || 100) / 100 });
            }
          } catch (e) { console.error('Img Err:', e.message); }
          continue;
        }

        // --- SHAPE HANDLING ---
        if (field.type === 'shape') {
          try {
            const w = ((parseFloat(field.width) || 100) - contentReduceW) * rx;
            const h = ((parseFloat(field.height) || 100) - contentReduceH) * ry;
            const x = ((parseFloat(field.posX) || 0) + contentOffsetX) * rx;
            const y = pH - (((parseFloat(field.posY) || 0) + contentOffsetY) * ry) - h;
            
            const parseColor = (hex) => {
              if (!hex || hex === 'transparent' || hex === 'none') return undefined;
              const clean = hex.replace('#', '');
              return rgb((parseInt(clean.slice(0,2),16)||0)/255, (parseInt(clean.slice(2,4),16)||0)/255, (parseInt(clean.slice(4,6),16)||0)/255);
            };

            const bgColor = parseColor(field.backgroundColor);
            const borderColor = parseColor(field.borderColor);
            const borderWidth = field.borderWidth ? (field.borderWidth * Math.min(rx, ry)) : 0;
            const opacityVal = (field.opacity || 100) / 100;
            const rotationVal = field.rotation ? degrees(-field.rotation) : undefined;

            if (field.shapeType === 'circle' || field.borderRadius === '50%') {
              page.drawEllipse({
                x: x + w/2,
                y: y + h/2,
                xScale: w/2,
                yScale: h/2,
                color: bgColor,
                borderColor: borderColor,
                borderWidth: borderWidth,
                opacity: opacityVal,
                borderOpacity: opacityVal
              });
            } else {
              page.drawRectangle({
                x, y, width: w, height: h,
                color: bgColor,
                borderColor: borderColor,
                borderWidth: borderWidth,
                opacity: opacityVal,
                borderOpacity: opacityVal,
                rotate: rotationVal
              });
            }
          } catch(e) { console.error('Shape Err:', e.message); }
          continue;
        }

        // --- QR CODE HANDLING ---
        if (field.type === 'qrcode') {
            try {
                const QRCode = (await import('qrcode')).default;
                const qrUrl = validationUrl || 'https://certificafacil.com/v/sample';
                const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 200 });
                const qrImg = await pdfDoc.embedPng(Buffer.from(qrDataUrl.split(',')[1], 'base64'));
                
                const w = ((parseFloat(field.width) || 80) - contentReduceW) * rx;
                const h = ((parseFloat(field.height) || 80) - contentReduceH) * ry;
                const x = ((parseFloat(field.posX) || 0) + contentOffsetX) * rx;
                const y = pH - (((parseFloat(field.posY) || 0) + contentOffsetY) * ry) - h;

                page.drawImage(qrImg, { x, y, width: Math.max(0, w), height: Math.max(0, h) });
            } catch (e) { console.error('QR Err:', e.message); }
            continue;
        }

        // --- TEXT HANDLING (MAX PRECISION) ---
        let content = String(field.content || '');

        // Variable replacement
        if (typeof studentData === 'object' && studentData !== null) {
          Object.entries(studentData).forEach(([k, v]) => {
            content = content.replace(new RegExp(`\\{${k.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\}`, 'gi'), String(v || ''));
          });
        } else if (typeof studentData === 'string') {
          content = content.replace(/{nome}/gi, studentData);
        }

        const isBold = content.includes('[B]') || (field.fontWeight === 'bold' || field.fontWeight === 700);
        content = content.replace(/\[B\]/g, '').replace(/\[\/B\]/g, '');
        const isItalic = field.fontStyle === 'italic';
        
        let weight = 'Regular';
        if (isBold && isItalic) weight = 'BoldItalic';
        else if (isBold) weight = 'Bold';
        else if (isItalic) weight = 'Italic';
        
        const fontFamily = field.fontFamily || 'Helvetica';
        const font = await getFont(fontFamily, weight);

        // Scale font size and position
        // We use ry for font size to match vertical proportions
        let fontSize = (parseFloat(field.fontSize) || 24) * ry;
        const posX = ((parseFloat(field.posX) || 0) + contentOffsetX) * rx;
        const posY = ((parseFloat(field.posY) || 0) + contentOffsetY) * ry;
        const boxWidth = ((parseFloat(field.width) || 400) - contentReduceW) * rx;

        // --- AUTO-SCALE LOGIC ---
        if (field.autoScale) {
          // Normalize content for width measurement (strip internal spaces for cleaner fit check)
          const measureContent = content.replace(/\n/g, ' ');
          let textWidth = font.widthOfTextAtSize(measureContent, fontSize);
          
          // Shrink font until it fits or reaches a minimum (5pt)
          while (textWidth > boxWidth + 2 && fontSize > 5) {
            fontSize -= 0.5;
            textWidth = font.widthOfTextAtSize(measureContent, fontSize);
          }
        }

        // Handle explicit newlines and auto-wrap based on boxWidth
        let paragraphs = content.split('\n');
        let lines = [];
        
        for (const p of paragraphs) {
            if (!p) {
                lines.push('');
                continue;
            }
            
            // If autoScale is on, we force it to be a single line (no auto-wrap)
            if (field.autoScale) {
                lines.push(p);
                continue;
            }

            const words = p.split(' '); // Split by spaces to preserve them or simple words
            let currentLine = words[0] || '';
            
            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const width = font.widthOfTextAtSize(currentLine + " " + word, fontSize);
                // We add a tiny buffer (2px) to prevent over-strict wrapping due to floating point
                if (width <= boxWidth + 2) {
                    currentLine += " " + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            if (currentLine) {
                lines.push(currentLine);
            }
        }

        // Vertical Alignment metrics
        const lH = field.lineHeight || 1.4;
        const leadingGap = ((lH - 1) * fontSize) / 2;
        
        let ascent;
        try {
            const rawAscender = font.embedder.font.Ascender || font.embedder.font.ascent || 718;
            ascent = (rawAscender / 1000) * fontSize;
        } catch (e) {
            ascent = fontSize * 0.72; // Fallback for Helvetica
        }
        
        const colorObj = rgb((parseInt(field.color?.slice(1,3),16)||0)/255, (parseInt(field.color?.slice(3,5),16)||0)/255, (parseInt(field.color?.slice(5,7),16)||0)/255);
        const opacityVal = (field.opacity || 100) / 100;
        const rotationVal = field.rotation ? degrees(-field.rotation) : undefined;

        lines.forEach((line, index) => {
            if (!line.trim()) return; // Skip drawing empty strings
            
            const lineWidth = font.widthOfTextAtSize(line, fontSize);
            
            // Horizontal Alignment
            let lineX = posX;
            if (field.align === 'center') lineX = posX + (boxWidth - lineWidth) / 2;
            else if (field.align === 'right') lineX = posX + boxWidth - lineWidth;

            // Y steps down for each line
            const lineY = pH - posY - leadingGap - ascent - (index * (lH * fontSize));

            // Render
            page.drawText(line, {
              x: Math.max(0, lineX),
              y: Math.max(0, lineY),
              size: fontSize,
              font: font,
              color: colorObj,
              opacity: opacityVal,
              rotate: rotationVal,
            });
        });
      }

      // Removed legacy hardcoded QR code - now handled via moveable fields

      const pdfBytes = await pdfDoc.save();
      if (outputPath) await fs.writeFile(outputPath, pdfBytes);
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('[CertificateEngine] Fatal:', error);
      throw error;
    }
  }
}

export default CertificateEngine;
