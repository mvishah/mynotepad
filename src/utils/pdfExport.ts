import type { DrawingPath } from '../components/DrawingCanvas';

export interface PageAnnotations {
  pageNumber: number;
  paths: DrawingPath[];
}

const drawWritingPathToPDF = (
  ctx: CanvasRenderingContext2D,
  path: DrawingPath,
  scaleX: number,
  scaleY: number
) => {
  ctx.lineWidth = path.size * Math.min(scaleX, scaleY);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  if (path.points.length === 2) {
    ctx.moveTo(path.points[0].x * scaleX, path.points[0].y * scaleY);
    ctx.lineTo(path.points[1].x * scaleX, path.points[1].y * scaleY);
    ctx.stroke();
  } else {
    ctx.moveTo(path.points[0].x * scaleX, path.points[0].y * scaleY);
    
    for (let i = 0; i < path.points.length - 1; i++) {
      const p0 = path.points[Math.max(0, i - 1)];
      const p1 = path.points[i];
      const p2 = path.points[i + 1];
      const p3 = path.points[Math.min(path.points.length - 1, i + 2)];
      
      const cp1x = (p1.x + (p2.x - p0.x) / 6) * scaleX;
      const cp1y = (p1.y + (p2.y - p0.y) / 6) * scaleY;
      const cp2x = (p2.x - (p3.x - p1.x) / 6) * scaleX;
      const cp2y = (p2.y - (p3.y - p1.y) / 6) * scaleY;
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x * scaleX, p2.y * scaleY);
    }
    ctx.stroke();
  }
};

const drawDrawingPathToPDF = (
  ctx: CanvasRenderingContext2D,
  path: DrawingPath,
  scaleX: number,
  scaleY: number
) => {
  const baseWidth = path.size * Math.min(scaleX, scaleY);
  const numStrokes = 3;
  
  for (let s = 0; s < numStrokes; s++) {
    ctx.lineWidth = baseWidth * (0.7 + s * 0.15);
    ctx.globalAlpha = 0.4 + s * 0.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    if (path.points.length === 2) {
      const offset = (s - 1) * 0.3;
      ctx.moveTo(path.points[0].x * scaleX + offset, path.points[0].y * scaleY + offset);
      ctx.lineTo(path.points[1].x * scaleX + offset, path.points[1].y * scaleY + offset);
      ctx.stroke();
    } else {
      const offset = (s - 1) * 0.3;
      ctx.moveTo(path.points[0].x * scaleX + offset, path.points[0].y * scaleY + offset);
      
      for (let i = 0; i < path.points.length - 1; i++) {
        const p0 = path.points[Math.max(0, i - 1)];
        const p1 = path.points[i];
        const p2 = path.points[i + 1];
        const p3 = path.points[Math.min(path.points.length - 1, i + 2)];
        
        const cp1x = (p1.x + (p2.x - p0.x) / 6) * scaleX + offset;
        const cp1y = (p1.y + (p2.y - p0.y) / 6) * scaleY + offset;
        const cp2x = (p2.x - (p3.x - p1.x) / 6) * scaleX + offset;
        const cp2y = (p2.y - (p3.y - p1.y) / 6) * scaleY + offset;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x * scaleX + offset, p2.y * scaleY + offset);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1.0;
};

const drawCalligraphyPathToPDF = (
  ctx: CanvasRenderingContext2D,
  path: DrawingPath,
  scaleX: number,
  scaleY: number
) => {
  if (path.points.length < 2) return;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < path.points.length - 1; i++) {
    const p1 = path.points[i];
    const p2 = path.points[i + 1];
    
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 0.1) continue;
    
    const angle = Math.atan2(dy, dx);
    const directionFactor = Math.abs(Math.sin(angle));
    const width = path.size * (0.25 + directionFactor * 0.75) * Math.min(scaleX, scaleY);
    
    const perpAngle = angle + Math.PI / 2;
    const perpX = Math.cos(perpAngle) * width / 2;
    const perpY = Math.sin(perpAngle) * width / 2;
    
    // Draw ribbon segment
    ctx.beginPath();
    ctx.moveTo(p1.x * scaleX - perpX, p1.y * scaleY - perpY);
    ctx.lineTo(p1.x * scaleX + perpX, p1.y * scaleY + perpY);
    ctx.lineTo(p2.x * scaleX + perpX, p2.y * scaleY + perpY);
    ctx.lineTo(p2.x * scaleX - perpX, p2.y * scaleY - perpY);
    ctx.closePath();
    ctx.fill();
    
    // Add end caps
    ctx.beginPath();
    ctx.arc(p1.x * scaleX, p1.y * scaleY, width / 2, 0, Math.PI * 2);
    ctx.fill();
    
    if (i === path.points.length - 2) {
      ctx.beginPath();
      ctx.arc(p2.x * scaleX, p2.y * scaleY, width / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

export const exportAnnotatedPDF = async (
  originalPdfFile: File,
  allPageAnnotations: Map<number, DrawingPath[]>,
  pdfDimensions: { width: number; height: number }
): Promise<Blob> => {
  try {
    console.log('Starting PDF export...', {
      fileName: originalPdfFile.name,
      fileSize: originalPdfFile.size,
      pdfDimensions,
      annotationPages: Array.from(allPageAnnotations.keys())
    });

    const { PDFDocument } = await import('pdf-lib');
    
    // Load the original PDF
    const originalPdfBytes = await originalPdfFile.arrayBuffer();
    console.log('PDF loaded into memory, size:', originalPdfBytes.byteLength);
    
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    console.log('PDF parsed successfully');
    
    const pages = pdfDoc.getPages();
    console.log('Total pages:', pages.length);
  
    // Add annotations to each page
    for (let pageNum = 0; pageNum < pages.length; pageNum++) {
      const paths = allPageAnnotations.get(pageNum + 1) || [];
      if (paths.length === 0) continue;
      
      console.log(`Processing page ${pageNum + 1} with ${paths.length} paths`);
      
      const page = pages[pageNum];
      const { width, height } = page.getSize();
    
    // Create a canvas to render the annotations
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    
    // Scale context for high quality
    ctx.scale(dpr, dpr);
    
    // Set up drawing context
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Calculate scale factor from canvas coordinates to PDF coordinates
    const scaleX = width / pdfDimensions.width;
    const scaleY = height / pdfDimensions.height;
    
    // Draw all paths for this page
    paths.forEach(path => {
      if (path.points.length < 1) return;
      
      const pathStyle = path.penStyle || 'writing';
      
      ctx.save();
      ctx.strokeStyle = path.color;
      ctx.fillStyle = path.color;
      
      // Single point - draw a dot
      if (path.points.length === 1) {
        if (pathStyle === 'calligraphy') {
          const size = path.size * Math.min(scaleX, scaleY);
          ctx.fillRect(
            path.points[0].x * scaleX - size / 3,
            path.points[0].y * scaleY - size / 2,
            size / 1.5,
            size
          );
        } else {
          ctx.beginPath();
          ctx.arc(
            path.points[0].x * scaleX,
            path.points[0].y * scaleY,
            (path.size * Math.min(scaleX, scaleY)) / 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      } else if (pathStyle === 'calligraphy') {
        // Calligraphy style
        drawCalligraphyPathToPDF(ctx, path, scaleX, scaleY);
      } else if (pathStyle === 'drawing') {
        // Drawing style
        drawDrawingPathToPDF(ctx, path, scaleX, scaleY);
      } else {
        // Writing style
        drawWritingPathToPDF(ctx, path, scaleX, scaleY);
      }
      
      ctx.restore();
    });
    
      // Convert canvas to image
      console.log(`Converting canvas to image for page ${pageNum + 1}`);
      const imageDataUrl = canvas.toDataURL('image/png');
      const imageBytes = await fetch(imageDataUrl).then(res => res.arrayBuffer());
      
      // Embed image in PDF
      console.log(`Embedding image in PDF for page ${pageNum + 1}`);
      const image = await pdfDoc.embedPng(imageBytes);
      
      // Draw the image on the PDF page
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });
      
      console.log(`Page ${pageNum + 1} processed successfully`);
    }
    
    // Save the PDF
    console.log('Saving PDF...');
    const pdfBytes = await pdfDoc.save();
    console.log('PDF saved successfully, size:', pdfBytes.length);
    
    return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error in exportAnnotatedPDF:', error);
    throw error;
  }
};

export const downloadPDF = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

