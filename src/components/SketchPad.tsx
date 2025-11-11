import { useState, useRef, useEffect } from 'react';
import './SketchPad.css';
import type { DrawingPath, PenStyle } from './DrawingCanvas';

interface SketchPadProps {
  sketchId?: string;
  initialPaths?: DrawingPath[];
  onSave: (paths: DrawingPath[], thumbnail: string) => void;
  onBack: () => void;
}

const SketchPad = ({ sketchId, initialPaths = [], onSave, onBack }: SketchPadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>(initialPaths);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  
  // Drawing settings
  const [tool, setTool] = useState<'pen' | 'eraser' | 'pan'>('pen');
  const [penColor, setPenColor] = useState('#000000');
  const [penSize, setPenSize] = useState(3);
  const [penStyle, setPenStyle] = useState<PenStyle>('writing');
  const [penOpacity, setPenOpacity] = useState(1);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  
  // Grid/Ruler settings
  const [showGrid, setShowGrid] = useState(false);
  const [gridType, setGridType] = useState<'lines' | 'dots' | 'ruled'>('lines');
  const [gridSpacing, setGridSpacing] = useState(20);
  
  // History
  const [history, setHistory] = useState<DrawingPath[][]>([initialPaths]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [drawingPaths, backgroundColor, showGrid, gridType, gridSpacing]);

  const updateCanvasSize = () => {
    const container = canvasRef.current?.parentElement;
    if (container) {
      const width = Math.min(container.clientWidth - 40, 1400);
      const height = Math.min(container.clientHeight - 40, 1000);
      setCanvasSize({ width, height });
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid/ruler if enabled
    if (showGrid) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Draw all paths
    drawingPaths.forEach(path => {
      drawPath(ctx, path);
    });
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    
    if (gridType === 'lines') {
      // Draw grid lines
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let x = 0; x <= width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let y = 0; y <= height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (gridType === 'dots') {
      // Draw grid dots
      ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
      
      for (let x = 0; x <= width; x += gridSpacing) {
        for (let y = 0; y <= height; y += gridSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (gridType === 'ruled') {
      // Draw ruled lines (like notebook paper)
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.6)';
      ctx.lineWidth = 1;
      
      // Horizontal lines
      for (let y = 0; y <= height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Add a red margin line
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gridSpacing * 2, 0);
      ctx.lineTo(gridSpacing * 2, height);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  const drawPath = (ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (path.points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = path.opacity !== undefined ? path.opacity : 1;

    const pathStyle = path.penStyle || 'writing';

    if (pathStyle === 'calligraphy') {
      // Calligraphy style with variable width
      for (let i = 1; i < path.points.length; i++) {
        const prevPoint = path.points[i - 1];
        const point = path.points[i];
        
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.size * (1 + Math.sin(i * 0.3) * 0.3);
        
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    } else if (pathStyle === 'drawing') {
      // Drawing style with smooth curves
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.size;
      
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      
      for (let i = 1; i < path.points.length - 1; i++) {
        const xMid = (path.points[i].x + path.points[i + 1].x) / 2;
        const yMid = (path.points[i].y + path.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(path.points[i].x, path.points[i].y, xMid, yMid);
      }
      
      const lastPoint = path.points[path.points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
      ctx.stroke();
    } else {
      // Default rendering for writing and all new pen styles
      // (Fountain, ballpoint, brush, pencil, highlighter will use basic rendering in SketchPad)
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.size;
      
      // Highlighter gets special semi-transparent treatment
      if (pathStyle === 'highlighter') {
        ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.4);
        ctx.lineWidth = path.size * 1.5;
        ctx.lineCap = 'butt';
      }
      
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      
      ctx.stroke();
    }
    
    ctx.restore();
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return null;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const startDrawing = (pos: { x: number; y: number } | null) => {
    if (!pos || tool === 'pan') return; // Don't draw in pan mode

    setIsDrawing(true);
    const newPath: DrawingPath = {
      id: `path_${Date.now()}_${Math.random()}`,
      points: [pos],
      color: tool === 'eraser' ? backgroundColor : penColor,
      size: tool === 'eraser' ? penSize * 3 : penSize,
      tool: tool === 'eraser' ? 'eraser' : 'pen',
      penStyle: penStyle,
      opacity: penOpacity,
      pressure: [0.5], // Default pressure for mouse/touch
    };
    setCurrentPath(newPath);
  };

  const draw = (pos: { x: number; y: number } | null) => {
    if (!isDrawing || !pos || !currentPath || tool === 'pan') return; // Don't draw in pan mode

    const updatedPath = {
      ...currentPath,
      points: [...currentPath.points, pos],
      pressure: [...(currentPath.pressure || []), 0.5], // Default pressure for mouse/touch
    };
    setCurrentPath(updatedPath);

    // Draw current stroke in real-time
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawPath(ctx, updatedPath);
  };

  const stopDrawing = () => {
    if (isDrawing && currentPath && currentPath.points.length > 1) {
      const newPaths = [...drawingPaths, currentPath];
      setDrawingPaths(newPaths);
      saveToHistory(newPaths);
    }
    setIsDrawing(false);
    setCurrentPath(null);
  };

  const saveToHistory = (paths: DrawingPath[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...paths]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDrawingPaths(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDrawingPaths(history[newIndex]);
    }
  };

  const clearCanvas = () => {
    if (confirm('Are you sure you want to clear the canvas?')) {
      setDrawingPaths([]);
      saveToHistory([]);
    }
  };

  const generateThumbnail = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    
    // Create a smaller thumbnail
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 300;
    thumbCanvas.height = 200;
    const ctx = thumbCanvas.getContext('2d');
    if (!ctx) return '';
    
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 300, 200);
    return thumbCanvas.toDataURL('image/png');
  };

  const handleSave = () => {
    const thumbnail = generateThumbnail();
    onSave(drawingPaths, thumbnail);
  };

  const handleExportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sketch_${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="sketch-pad">
      <div className="sketch-toolbar">
        <div className="sketch-toolbar-section">
          <button onClick={onBack} className="back-btn" title="Back to Gallery">
            ← Back
          </button>
          <h2 className="sketch-title">
            {sketchId ? '✏️ Edit Sketch' : '🎨 New Sketch'}
          </h2>
        </div>

        <div className="sketch-toolbar-section">
          <div className="tool-selection">
            <button
              className={tool === 'pen' ? 'active' : ''}
              onClick={() => setTool('pen')}
              title="Pen Tool - Draw"
            >
              ✏️
            </button>
            <button
              className={tool === 'pan' ? 'active' : ''}
              onClick={() => setTool('pan')}
              title="Pan Tool - Navigate & Zoom (Touch Safe)"
            >
              ✋
            </button>
            <button
              className={tool === 'eraser' ? 'active' : ''}
              onClick={() => setTool('eraser')}
              title="Eraser Tool"
            >
              🧽
            </button>
          </div>

          <div className="pen-controls">
            <label>Style:</label>
            <select 
              value={penStyle} 
              onChange={(e) => setPenStyle(e.target.value as PenStyle)}
            >
              <optgroup label="Classic">
                <option value="writing">✍️ Writing</option>
                <option value="drawing">🎨 Drawing</option>
                <option value="calligraphy">🖋️ Calligraphy</option>
              </optgroup>
              <optgroup label="Premium Pens">
                <option value="fountain">🖋️ Fountain Pen</option>
                <option value="ballpoint">🖊️ Ballpoint</option>
                <option value="brush">🖌️ Brush</option>
                <option value="pencil">✏️ Pencil</option>
                <option value="highlighter">💡 Highlighter</option>
              </optgroup>
            </select>

            <input
              type="color"
              value={penColor}
              onChange={(e) => setPenColor(e.target.value)}
              title="Pen Color"
            />

            <label>Size:</label>
            <input
              type="range"
              min="1"
              max="30"
              value={penSize}
              onChange={(e) => setPenSize(Number(e.target.value))}
              title="Pen Size"
            />
            <span className="size-display">{penSize}px</span>

            <label>Opacity:</label>
            <input
              type="range"
              min="0"
              max="100"
              value={penOpacity * 100}
              onChange={(e) => setPenOpacity(Number(e.target.value) / 100)}
              title="Pen Opacity"
            />
            <span className="size-display">{Math.round(penOpacity * 100)}%</span>

            {tool === 'pan' && (
              <div className="tool-indicator" style={{
                background: '#27ae60',
                color: 'white',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ✋ Pan Mode - Touch Safe (Zoom Enabled)
              </div>
            )}

            <label>Background:</label>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              title="Background Color"
            />
          </div>

          <div className="grid-controls">
            <label>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Grid
            </label>
            
            {showGrid && (
              <>
                <select 
                  value={gridType} 
                  onChange={(e) => setGridType(e.target.value as 'lines' | 'dots' | 'ruled')}
                  title="Grid Type"
                >
                  <option value="lines">📏 Lines</option>
                  <option value="dots">⚫ Dots</option>
                  <option value="ruled">📝 Ruled</option>
                </select>
                
                <label>Spacing:</label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={gridSpacing}
                  onChange={(e) => setGridSpacing(Number(e.target.value))}
                  title="Grid Spacing"
                />
                <span className="size-display">{gridSpacing}px</span>
              </>
            )}
          </div>
        </div>

        <div className="sketch-toolbar-section">
          <div className="action-controls">
            <button onClick={undo} disabled={!canUndo} title="Undo">
              ↶
            </button>
            <button onClick={redo} disabled={!canRedo} title="Redo">
              ↷
            </button>
            <button onClick={clearCanvas} className="clear-btn" title="Clear Canvas">
              🗑️
            </button>
            <button onClick={handleExportImage} className="export-btn" title="Export as Image">
              📥 Export
            </button>
            <button onClick={handleSave} className="save-sketch-btn" title="Save Sketch">
              💾 Save
            </button>
          </div>
        </div>
      </div>

      <div className="sketch-canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="sketch-canvas"
          style={{ cursor: tool === 'pan' ? 'grab' : 'crosshair' }}
          onMouseDown={(e) => startDrawing(getMousePos(e))}
          onMouseMove={(e) => draw(getMousePos(e))}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            if (tool !== 'pan') {
              e.preventDefault();
            }
            startDrawing(getTouchPos(e));
          }}
          onTouchMove={(e) => {
            if (tool !== 'pan') {
              e.preventDefault();
            }
            draw(getTouchPos(e));
          }}
          onTouchEnd={(e) => {
            if (tool !== 'pan') {
              e.preventDefault();
            }
            stopDrawing();
          }}
        />
      </div>
    </div>
  );
};

export default SketchPad;

