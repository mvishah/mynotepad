import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface Point {
  x: number;
  y: number;
}

export type PenStyle = 'writing' | 'drawing' | 'calligraphy' | 'fountain' | 'ballpoint' | 'brush' | 'pencil' | 'highlighter';

export interface DrawingPath {
  id: string;
  points: Point[];
  color: string;
  size: number;
  tool: 'pen' | 'eraser';
  penStyle?: PenStyle;
  opacity?: number;
  pressure?: number[];
}

interface DrawingCanvasProps {
  width: number;
  height: number;
  scale: number;
  tool: 'pen' | 'eraser' | 'pan';
  penColor: string;
  penSize: number;
  penStyle: PenStyle;
  penOpacity?: number;
  onPathDrawn: (path: DrawingPath) => void;
  onPathErased: (pathId: string) => void;
  paths: DrawingPath[];
  onPan?: (deltaX: number, deltaY: number) => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width,
  height,
  scale,
  tool,
  penColor,
  penSize,
  penStyle,
  penOpacity = 1, // Used in drawPath functions
  onPathDrawn,
  onPathErased,
  paths,
  onPan,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [isErasing, setIsErasing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);

  // Redraw all paths when paths change or canvas dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { 
      alpha: true,
      willReadFrequently: false,
      desynchronized: false
    });
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size with high DPI support for crisp rendering
    const dpr = window.devicePixelRatio || 1;

    // Set the actual canvas resolution (backing store)
    canvas.width = width * scale * dpr;
    canvas.height = height * scale * dpr;

    // Set canvas display size (CSS size)
    canvas.style.width = `${width * scale}px`;
    canvas.style.height = `${height * scale}px`;

    // Scale context to account for device pixel ratio and drawing scale
    ctx.scale(dpr, dpr);

    // Configure for crisp rendering - disable smoothing for sharp lines
    ctx.imageSmoothingEnabled = false; // Disable smoothing for sharp, crisp lines
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Set global composite operation for better blending
    ctx.globalCompositeOperation = 'source-over';

    // Configure canvas for Arabic support
    ctx.textAlign = 'start';
    ctx.direction = 'ltr';

    // Draw all existing paths
    paths.forEach(path => {
      drawPath(ctx, path, scale);
    });
  }, [width, height, scale, paths]);

  const drawPath = (ctx: CanvasRenderingContext2D, path: DrawingPath, scale: number) => {
    if (path.points.length < 1) return;

    const pathStyle = path.penStyle || 'writing';
    const opacity = path.opacity !== undefined ? path.opacity : 1;

    ctx.save();
    // Context is scaled by DPI in the main useEffect
    // We need to scale by the PDF zoom level to match the stored coordinates
    ctx.scale(scale, scale);

    console.log('Drawing path:', {
      id: path.id,
      pointsCount: path.points.length,
      firstPoint: path.points[0],
      scale: scale
    });
    ctx.strokeStyle = path.tool === 'eraser' ? '#ffffff' : path.color;
    ctx.fillStyle = path.tool === 'eraser' ? '#ffffff' : path.color;
    ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';

    // Configure pen style characteristics and dispatch to appropriate renderer
    // Each drawing function handles its own opacity internally
    if (pathStyle === 'fountain') {
      drawFountainPenPath(ctx, path, opacity);
    } else if (pathStyle === 'ballpoint') {
      drawBallpointPath(ctx, path, opacity);
    } else if (pathStyle === 'brush') {
      drawBrushPath(ctx, path, opacity);
    } else if (pathStyle === 'pencil') {
      drawPencilPath(ctx, path, opacity);
    } else if (pathStyle === 'highlighter') {
      drawHighlighterPath(ctx, path, opacity);
    } else if (pathStyle === 'calligraphy') {
      // Calligraphy: variable width based on stroke direction
      drawCalligraphyPath(ctx, path, opacity);
    } else if (pathStyle === 'drawing') {
      // Drawing: add texture with multiple overlapping strokes
      drawDrawingPath(ctx, path, opacity);
    } else {
      // Writing: smooth, consistent stroke
      drawWritingPath(ctx, path, opacity);
    }

    ctx.restore();
  };

  const drawWritingPath = (ctx: CanvasRenderingContext2D, path: DrawingPath, opacity: number) => {
    ctx.globalAlpha = opacity;
    ctx.lineWidth = path.size;
    ctx.beginPath();

    if (path.points.length === 2) {
      ctx.moveTo(path.points[0].x, path.points[0].y);
      ctx.lineTo(path.points[1].x, path.points[1].y);
      ctx.stroke();
    } else {
      ctx.moveTo(path.points[0].x, path.points[0].y);
      
      for (let i = 0; i < path.points.length - 1; i++) {
        const p0 = path.points[Math.max(0, i - 1)];
        const p1 = path.points[i];
        const p2 = path.points[i + 1];
        const p3 = path.points[Math.min(path.points.length - 1, i + 2)];
        
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
      ctx.stroke();
    }
  };

  const drawDrawingPath = (ctx: CanvasRenderingContext2D, path: DrawingPath, opacity: number) => {
    ctx.globalAlpha = opacity;
    // Drawing style: create texture with multiple slightly offset strokes
    const baseWidth = path.size;
    const numStrokes = 3;
    
    for (let s = 0; s < numStrokes; s++) {
      ctx.lineWidth = baseWidth * (0.7 + s * 0.15);
      ctx.globalAlpha = 0.4 + s * 0.2;
      ctx.beginPath();

      if (path.points.length === 2) {
        const offset = (s - 1) * 0.3;
        ctx.moveTo(path.points[0].x + offset, path.points[0].y + offset);
        ctx.lineTo(path.points[1].x + offset, path.points[1].y + offset);
        ctx.stroke();
      } else {
        const offset = (s - 1) * 0.3;
        ctx.moveTo(path.points[0].x + offset, path.points[0].y + offset);
        
        for (let i = 0; i < path.points.length - 1; i++) {
          const p0 = path.points[Math.max(0, i - 1)];
          const p1 = path.points[i];
          const p2 = path.points[i + 1];
          const p3 = path.points[Math.min(path.points.length - 1, i + 2)];
          
          const cp1x = p1.x + (p2.x - p0.x) / 6 + offset;
          const cp1y = p1.y + (p2.y - p0.y) / 6 + offset;
          const cp2x = p2.x - (p3.x - p1.x) / 6 + offset;
          const cp2y = p2.y - (p3.y - p1.y) / 6 + offset;
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x + offset, p2.y + offset);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;
  };

  const drawCalligraphyPath = (ctx: CanvasRenderingContext2D, path: DrawingPath, opacity: number) => {
    ctx.globalAlpha = opacity;
    // Calligraphy: elegant brush strokes with variable width
    if (path.points.length < 2) return;

    ctx.fillStyle = ctx.strokeStyle;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Create smooth path with variable width
    for (let i = 0; i < path.points.length - 1; i++) {
      const p1 = path.points[i];
      const p2 = path.points[i + 1];
      
      // Calculate stroke direction
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 0.1) continue;
      
      const angle = Math.atan2(dy, dx);
      
      // Width varies smoothly based on stroke direction
      // Thin on horizontal strokes, thick on vertical strokes (classic calligraphy)
      const directionFactor = Math.abs(Math.sin(angle));
      const width = path.size * (0.25 + directionFactor * 0.75);
      
      // Calculate perpendicular direction for width
      const perpAngle = angle + Math.PI / 2;
      const perpX = Math.cos(perpAngle) * width / 2;
      const perpY = Math.sin(perpAngle) * width / 2;
      
      // Draw smooth ribbon-like stroke
      ctx.beginPath();
      ctx.moveTo(p1.x - perpX, p1.y - perpY);
      ctx.lineTo(p1.x + perpX, p1.y + perpY);
      ctx.lineTo(p2.x + perpX, p2.y + perpY);
      ctx.lineTo(p2.x - perpX, p2.y - perpY);
      ctx.closePath();
      ctx.fill();
      
      // Add smooth end caps
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, width / 2, 0, Math.PI * 2);
      ctx.fill();
      
      if (i === path.points.length - 2) {
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, width / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // ✨ NEW PEN STYLES ✨

  const drawFountainPenPath = (ctx: CanvasRenderingContext2D, path: DrawingPath, opacity: number) => {
    // Fountain Pen: Elegant, flowing strokes with distinctive ink characteristics
    if (path.points.length < 1) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Single point - elegant ink drop
    if (path.points.length === 1) {
      const pressure = path.pressure?.[0] || 0.5;
      const size = path.size * (0.8 + pressure * 0.6);

      // Main ink drop with elegant shape
      ctx.globalAlpha = opacity * 0.95;
      ctx.beginPath();
      ctx.ellipse(path.points[0].x, path.points[0].y, size / 2.2, size / 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Add distinctive fountain pen ink spread
      ctx.globalAlpha = opacity * 0.4;
      ctx.beginPath();
      ctx.ellipse(path.points[0].x, path.points[0].y, size / 1.2, size / 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Small ink fleck for character
      ctx.globalAlpha = opacity * 0.6;
      ctx.beginPath();
      ctx.arc(path.points[0].x + size * 0.3, path.points[0].y - size * 0.2, size / 6, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Multi-point path with pressure sensitivity
    for (let i = 0; i < path.points.length - 1; i++) {
      const p1 = path.points[i];
      const p2 = path.points[i + 1];
      const pressure1 = path.pressure?.[i] || 0.5;
      const pressure2 = path.pressure?.[i + 1] || 0.5;
      
      // Calculate width based on pressure
      const width1 = path.size * (0.5 + pressure1 * 0.9);
      const width2 = path.size * (0.5 + pressure2 * 0.9);
      
      // Calculate stroke direction
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 0.1) continue;
      
      const angle = Math.atan2(dy, dx);
      const perpAngle = angle + Math.PI / 2;
      
      // Create tapered stroke segment
      const perpX1 = Math.cos(perpAngle) * width1 / 2;
      const perpY1 = Math.sin(perpAngle) * width1 / 2;
      const perpX2 = Math.cos(perpAngle) * width2 / 2;
      const perpY2 = Math.sin(perpAngle) * width2 / 2;
      
      // Main ink stroke
      ctx.globalAlpha = (path.opacity || 1) * 0.95;
      ctx.beginPath();
      ctx.moveTo(p1.x - perpX1, p1.y - perpY1);
      ctx.lineTo(p1.x + perpX1, p1.y + perpY1);
      ctx.lineTo(p2.x + perpX2, p2.y + perpY2);
      ctx.lineTo(p2.x - perpX2, p2.y - perpY2);
      ctx.closePath();
      ctx.fill();
      
      // Subtle ink flow effect
      ctx.globalAlpha = (path.opacity || 1) * 0.2;
      ctx.lineWidth = width1 * 1.3;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.globalAlpha = path.opacity || 1;
  };

  const drawBallpointPath = (ctx: CanvasRenderingContext2D, path: DrawingPath, opacity: number) => {
    // Ballpoint Pen: Bold, consistent lines with slight ink bleed effect
    if (path.points.length < 1) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Single point - distinctive ballpoint dot
    if (path.points.length === 1) {
      // Main ink dot
      ctx.globalAlpha = opacity * 0.9;
      ctx.beginPath();
      ctx.arc(path.points[0].x, path.points[0].y, path.size / 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Ink bleed halo (ballpoint characteristic)
      ctx.globalAlpha = opacity * 0.4;
      ctx.beginPath();
      ctx.arc(path.points[0].x, path.points[0].y, path.size / 1.6, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Bold, consistent stroke with subtle texture
    ctx.lineWidth = path.size * 1.1; // Slightly thicker than base size
    ctx.globalAlpha = opacity * 0.95;

    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);

    for (let i = 0; i < path.points.length - 1; i++) {
      const p0 = path.points[Math.max(0, i - 1)];
      const p1 = path.points[i];
      const p2 = path.points[i + 1];
      const p3 = path.points[Math.min(path.points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.stroke();

    // Add characteristic ballpoint ink bleed along the stroke
    ctx.globalAlpha = opacity * 0.25;
    ctx.lineWidth = path.size * 1.4;
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();
  };

  const drawBrushPath = (ctx: CanvasRenderingContext2D, path: DrawingPath, opacity: number) => {
    // Brush Pen: Dramatic pressure-sensitive strokes with brush bristle effects
    if (path.points.length < 1) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Single point - distinctive brush dab with bristles
    if (path.points.length === 1) {
      const pressure = path.pressure?.[0] || 0.5;
      const size = path.size * (0.4 + pressure * 2.0); // Very high pressure variation

      // Main brush dab
      ctx.globalAlpha = opacity * 0.9;
      ctx.beginPath();
      ctx.ellipse(path.points[0].x, path.points[0].y, size / 2.5, size / 1.8, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Add bristle marks for brush character
      ctx.globalAlpha = opacity * 0.7;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = size * (0.3 + Math.random() * 0.4);
        const bristleX = path.points[0].x + Math.cos(angle) * distance;
        const bristleY = path.points[0].y + Math.sin(angle) * distance;

        ctx.beginPath();
        ctx.arc(bristleX, bristleY, size / 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = path.opacity || 1;
      return;
    }

    // Variable width based on pressure
    for (let i = 0; i < path.points.length - 1; i++) {
      const p1 = path.points[i];
      const p2 = path.points[i + 1];
      const pressure1 = path.pressure?.[i] || 0.5;
      const pressure2 = path.pressure?.[i + 1] || 0.5;
      
      // Brush has high pressure sensitivity
      const width1 = path.size * (0.2 + pressure1 * 1.8);
      const width2 = path.size * (0.2 + pressure2 * 1.8);
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 0.1) continue;
      
      const angle = Math.atan2(dy, dx);
      const perpAngle = angle + Math.PI / 2;
      
      // Create brush stroke segment
      const perpX1 = Math.cos(perpAngle) * width1 / 2;
      const perpY1 = Math.sin(perpAngle) * width1 / 2;
      const perpX2 = Math.cos(perpAngle) * width2 / 2;
      const perpY2 = Math.sin(perpAngle) * width2 / 2;
      
      // Main brush stroke with texture
      ctx.globalAlpha = (path.opacity || 1) * 0.8;
      ctx.beginPath();
      ctx.moveTo(p1.x - perpX1, p1.y - perpY1);
      ctx.lineTo(p1.x + perpX1, p1.y + perpY1);
      ctx.lineTo(p2.x + perpX2, p2.y + perpY2);
      ctx.lineTo(p2.x - perpX2, p2.y - perpY2);
      ctx.closePath();
      ctx.fill();
      
      // Add brush bristle effect
      ctx.globalAlpha = (path.opacity || 1) * 0.4;
      ctx.lineWidth = width1 * 0.7;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      
      // End caps for smooth transitions
      ctx.globalAlpha = (path.opacity || 1) * 0.8;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, width1 / 2, 0, Math.PI * 2);
      ctx.fill();
      if (i === path.points.length - 2) {
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, width2 / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = path.opacity || 1;
  };

  const drawPencilPath = (ctx: CanvasRenderingContext2D, path: DrawingPath, opacity: number) => {
    // Pencil: Rough, grainy strokes with wood texture and graphite characteristics
    if (path.points.length < 1) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Single point - rough graphite mark with wood grain
    if (path.points.length === 1) {
      const pressure = path.pressure?.[0] || 0.5;
      const size = path.size * (0.7 + pressure * 0.8);

      // Main graphite mark
      ctx.globalAlpha = opacity * 0.8;
      ctx.beginPath();
      ctx.ellipse(path.points[0].x, path.points[0].y, size / 2.8, size / 2.2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // Add wood grain texture particles
      ctx.globalAlpha = opacity * 0.6;
      for (let j = 0; j < 12; j++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * size * 0.8;
        const particleX = path.points[0].x + Math.cos(angle) * distance;
        const particleY = path.points[0].y + Math.sin(angle) * distance;

        ctx.beginPath();
        ctx.arc(particleX, particleY, size / 12 + Math.random() * size / 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add graphite sheen
      ctx.globalAlpha = opacity * 0.3;
      ctx.beginPath();
      ctx.ellipse(path.points[0].x, path.points[0].y, size / 1.8, size / 3.5, Math.PI / 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Create pencil texture with multiple overlapping strokes
    const numLayers = 4;
    for (let layer = 0; layer < numLayers; layer++) {
      ctx.globalAlpha = opacity * (0.15 + layer * 0.15);
      
      for (let i = 0; i < path.points.length - 1; i++) {
        const p1 = path.points[i];
        const p2 = path.points[i + 1];
        const pressure = path.pressure?.[i] || 0.5;
        
        const width = path.size * (0.6 + pressure * 0.6) * (0.7 + layer * 0.15);
        
        // Add random offset for grainy texture
        const offsetX = (Math.random() - 0.5) * width * 0.2;
        const offsetY = (Math.random() - 0.5) * width * 0.2;
        
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(p1.x + offsetX, p1.y + offsetY);
        ctx.lineTo(p2.x + offsetX, p2.y + offsetY);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = path.opacity || 1;
  };

  const drawHighlighterPath = (ctx: CanvasRenderingContext2D, path: DrawingPath, opacity: number) => {
    // Highlighter: Bright, fluorescent ink with chisel tip and glow effect
    if (path.points.length < 1) return;

    ctx.lineCap = 'butt'; // Flat ends like a chisel tip
    ctx.lineJoin = 'miter';

    // Highlighters are bright and fluorescent
    const highlighterOpacity = Math.min(opacity, 0.7);

    // Single point - chisel-tip highlighter mark with glow
    if (path.points.length === 1) {
      // Main bright highlighter mark
      ctx.globalAlpha = highlighterOpacity;
      ctx.fillStyle = path.color; // Use the selected color
      ctx.fillRect(
        path.points[0].x - path.size / 2.2,
        path.points[0].y - path.size / 6,
        path.size * 1.1,
        path.size / 3
      );

      // Add fluorescent glow effect
      ctx.globalAlpha = highlighterOpacity * 0.4;
      ctx.fillRect(
        path.points[0].x - path.size / 1.8,
        path.points[0].y - path.size / 4,
        path.size * 1.4,
        path.size / 2.2
      );

      // Add bright center highlight
      ctx.globalAlpha = highlighterOpacity * 0.8;
      ctx.fillRect(
        path.points[0].x - path.size / 3,
        path.points[0].y - path.size / 8,
        path.size / 1.5,
        path.size / 6
      );

      ctx.globalAlpha = path.opacity || 1;
      return;
    }

    // Draw wide, flat, semi-transparent stroke
    ctx.globalAlpha = highlighterOpacity;
    ctx.lineWidth = path.size * 1.5; // Highlighters are wider
    
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    
    // Use straight lines for highlighter (less smooth than pen)
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();
    
    // Add a second layer for more solid appearance
    ctx.globalAlpha = highlighterOpacity * 0.6;
    ctx.lineWidth = path.size * 1.2;
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();
    
    ctx.globalAlpha = path.opacity || 1;
  };

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Handle touch events
    if ('touches' in event && event.touches.length > 0) {
      return {
        x: (event.touches[0].clientX - rect.left) / scale,
        y: (event.touches[0].clientY - rect.top) / scale,
      };
    }
    
    // Handle mouse events
    const mouseEvent = event as React.MouseEvent<HTMLCanvasElement>;
    return {
      x: (mouseEvent.clientX - rect.left) / scale,
      y: (mouseEvent.clientY - rect.top) / scale,
    };
  };

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault(); // Prevent scrolling on touch
    const point = getCanvasCoordinates(event);

    // Capture pressure from pointer events (stylus support)
    let pressure = 0.5; // Default for mouse
    if ('pressure' in event && event.pressure > 0) {
      pressure = event.pressure;
    }

    const newPath: DrawingPath = {
      id: `path_${Date.now()}_${Math.random()}`,
      points: [point],
      color: penColor,
      size: penSize,
      tool: tool === 'pan' ? 'pen' : tool, // Convert pan to pen for drawing paths
      penStyle: penStyle,
      opacity: penOpacity,
      pressure: [pressure],
    };

    setCurrentPath(newPath);
    setIsDrawing(true);
  }, [penColor, penSize, tool, penStyle, penOpacity, scale]);

  const continueDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentPath) return;
    event.preventDefault(); // Prevent scrolling on touch

    const point = getCanvasCoordinates(event);
    
    // Skip duplicate points for smoother rendering
    const lastPoint = currentPath.points[currentPath.points.length - 1];
    const distance = Math.sqrt(
      Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
    );
    
    // Reduce threshold for more points = smoother curves
    if (distance < 0.5) return;

    // Capture pressure from pointer events (stylus support)
    let pressure = 0.5; // Default for mouse
    if ('pressure' in event && event.pressure > 0) {
      pressure = event.pressure;
    }

    const updatedPath = {
      ...currentPath,
      points: [...currentPath.points, point],
      pressure: [...(currentPath.pressure || []), pressure],
    };

    setCurrentPath(updatedPath);

    // Draw the current segment in real-time with smooth Bezier curves
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && updatedPath.points.length >= 2) {
      const points = updatedPath.points;
      const len = points.length;
      
      ctx.save();
      // ctx is already scaled by DPI, just apply PDF zoom
      ctx.scale(scale, scale);
      ctx.strokeStyle = updatedPath.tool === 'eraser' ? '#ffffff' : updatedPath.color;
      ctx.fillStyle = updatedPath.tool === 'eraser' ? '#ffffff' : updatedPath.color;
      ctx.globalCompositeOperation = updatedPath.tool === 'eraser' ? 'destination-out' : 'source-over';

      // Enable anti-aliasing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const currentStyle = updatedPath.penStyle || 'writing';

      // Configure based on pen style
      if (currentStyle === 'calligraphy') {
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
      } else {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = updatedPath.size;
      }

      // Draw smooth curve through the last few points
      if (currentStyle === 'calligraphy' && len >= 2) {
        // Draw calligraphy segment for last two points
        const p1 = points[len - 2];
        const p2 = points[len - 1];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance >= 0.1) {
          const angle = Math.atan2(dy, dx);
          
          // Width varies based on direction
          const directionFactor = Math.abs(Math.sin(angle));
          const width = updatedPath.size * (0.25 + directionFactor * 0.75);
          
          const perpAngle = angle + Math.PI / 2;
          const perpX = Math.cos(perpAngle) * width / 2;
          const perpY = Math.sin(perpAngle) * width / 2;
          
          // Draw ribbon segment
          ctx.beginPath();
          ctx.moveTo(p1.x - perpX, p1.y - perpY);
          ctx.lineTo(p1.x + perpX, p1.y + perpY);
          ctx.lineTo(p2.x + perpX, p2.y + perpY);
          ctx.lineTo(p2.x - perpX, p2.y - perpY);
          ctx.closePath();
          ctx.fill();
          
          // End cap
          ctx.beginPath();
          ctx.arc(p2.x, p2.y, width / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (currentStyle === 'drawing' && len >= 2) {
        // Drawing style with texture
        for (let s = 0; s < 2; s++) {
          ctx.lineWidth = updatedPath.size * (0.8 + s * 0.2);
          ctx.globalAlpha = 0.5 + s * 0.3;
          const offset = (s - 0.5) * 0.3;
          
          ctx.beginPath();
          if (len >= 4) {
            const p0 = points[len - 4];
            const p1 = points[len - 3];
            const p2 = points[len - 2];
            const p3 = points[len - 1];
            
            const cp1x = p1.x + (p2.x - p0.x) / 6 + offset;
            const cp1y = p1.y + (p2.y - p0.y) / 6 + offset;
            const cp2x = p2.x - (p3.x - p1.x) / 6 + offset;
            const cp2y = p2.y - (p3.y - p1.y) / 6 + offset;
            
            ctx.moveTo(p1.x + offset, p1.y + offset);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x + offset, p2.y + offset);
          } else {
            ctx.moveTo(points[len - 2].x + offset, points[len - 2].y + offset);
            ctx.lineTo(points[len - 1].x + offset, points[len - 1].y + offset);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      } else {
        // Writing style - smooth stroke
        ctx.beginPath();
        
        if (len >= 4) {
          const p0 = points[len - 4];
          const p1 = points[len - 3];
          const p2 = points[len - 2];
          const p3 = points[len - 1];
          
          const cp1x = p1.x + (p2.x - p0.x) / 6;
          const cp1y = p1.y + (p2.y - p0.y) / 6;
          const cp2x = p2.x - (p3.x - p1.x) / 6;
          const cp2y = p2.y - (p3.y - p1.y) / 6;
          
          ctx.moveTo(p1.x, p1.y);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        } else if (len >= 2) {
          ctx.moveTo(points[len - 2].x, points[len - 2].y);
          ctx.lineTo(points[len - 1].x, points[len - 1].y);
        }
        
        ctx.stroke();
      }
      
      ctx.restore();
    }
  }, [isDrawing, currentPath, scale]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && currentPath) {
      console.log('Finishing drawing path:', {
        id: currentPath.id,
        pointsCount: currentPath.points.length,
        firstPoint: currentPath.points[0],
        lastPoint: currentPath.points[currentPath.points.length - 1],
        scale: scale
      });
      onPathDrawn(currentPath);
    }
    setIsDrawing(false);
    setCurrentPath(null);
  }, [isDrawing, currentPath, onPathDrawn, scale]);

  // Handle eraser tool for existing paths
  const handleEraserStart = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'eraser') return;
    event.preventDefault();
    setIsErasing(true);

    const point = getCanvasCoordinates(event);

    // Find paths that intersect with the eraser point
    const pathsToErase = paths.filter(path => {
      return path.points.some(p => {
        const distance = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2));
        return distance <= penSize * 3; // Larger hit area for easier erasing
      });
    });

    pathsToErase.forEach(path => onPathErased(path.id));
  }, [tool, paths, penSize, onPathErased]);

  const handleEraserMove = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    if (!isErasing || tool !== 'eraser') return;
    event.preventDefault();

    const point = getCanvasCoordinates(event);

    // Find paths that intersect with the eraser point
    const pathsToErase = paths.filter(path => {
      return path.points.some(p => {
        const distance = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2));
        return distance <= penSize * 3;
      });
    });

    pathsToErase.forEach(path => onPathErased(path.id));
  }, [isErasing, tool, paths, penSize, onPathErased]);

  const handleEraserEnd = useCallback(() => {
    setIsErasing(false);
  }, []);

  // Unified pointer event handlers (works with mouse, touch, and stylus)
  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'eraser') {
      handleEraserStart(event);
    } else if (tool === 'pan') {
      event.preventDefault();
      setIsPanning(true);
      setLastPanPoint(getCanvasCoordinates(event));
    } else {
      startDrawing(event);
    }
  }, [tool, handleEraserStart, startDrawing]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'eraser') {
      handleEraserMove(event);
    } else if (tool === 'pan' && isPanning && lastPanPoint && onPan) {
      event.preventDefault();
      const currentPoint = getCanvasCoordinates(event);
      const deltaX = currentPoint.x - lastPanPoint.x;
      const deltaY = currentPoint.y - lastPanPoint.y;
      onPan(deltaX, deltaY);
      setLastPanPoint(currentPoint);
    } else {
      continueDrawing(event);
    }
  }, [tool, handleEraserMove, continueDrawing, isPanning, lastPanPoint, onPan]);

  const handlePointerUp = useCallback(() => {
    if (tool === 'eraser') {
      handleEraserEnd();
    } else if (tool === 'pan') {
      setIsPanning(false);
      setLastPanPoint(null);
    } else {
      stopDrawing();
    }
  }, [tool, handleEraserEnd, stopDrawing]);

  return (
    <canvas
      ref={canvasRef}
      className="drawing-canvas"
      // Use unified PointerEvents for mouse, touch, and stylus support
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: tool === 'eraser' ? 'not-allowed' : tool === 'pan' ? 'grab' : 'crosshair',
        pointerEvents: 'auto',
        touchAction: 'none', // Prevent default touch behaviors
      }}
    />
  );
};

export default DrawingCanvas;
