import * as pdfjsLib from 'pdfjs-dist';

// Use local worker if possible or a more reliable CDN link
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Renders the first page of a PDF file or blob to a data URL image.
 * @param {File|Blob} file - The PDF file or blob
 * @param {number} scale - Render scale (default 2 for high DPI)
 * @returns {Promise<{dataUrl: string, width: number, height: number}>}
 */
export async function pdfToImage(file, scale = 2) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: Math.round(viewport.width / scale),
      height: Math.round(viewport.height / scale),
    };
  } catch (error) {
    console.error('pdfToImage Error:', error);
    throw error;
  }
}
