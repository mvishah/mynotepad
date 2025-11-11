import { useState, useEffect } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import PDFViewer from './components/PDFViewer';
import FileHistory from './components/FileHistory';
import SketchPad from './components/SketchPad';
import SketchGallery from './components/SketchGallery';
import type { DrawingPath, PenStyle } from './components/DrawingCanvas';
import type { TextAnnotation } from './components/TextAnnotation';
import { addToRecentFiles, saveAnnotatedFile } from './utils/fileStorage';
import type { Sketch } from './utils/sketchStorage';
import { saveSketch } from './utils/sketchStorage';
import { getPenFavorites, savePenFavorite, deletePenFavorite, type PenFavorite } from './utils/penFavorites';
import { recognizeShape } from './utils/shapeRecognition';

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1.0);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number } | null>(null);

  // Drawing state
  const [drawingTool, setDrawingTool] = useState<'pen' | 'eraser' | 'text'>('pen');
  const [penColor, setPenColor] = useState('#000000');
  const [penSize, setPenSize] = useState(2);
  const [penStyle, setPenStyle] = useState<PenStyle>('writing');
  const [penOpacity, setPenOpacity] = useState(1);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [history, setHistory] = useState<DrawingPath[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Text annotation state
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [textFontSize, setTextFontSize] = useState(16);
  const [textColor, setTextColor] = useState('#000000');
  const [textFontFamily, setTextFontFamily] = useState('Arial');

  // Store annotations for all pages
  const [allPageAnnotations, setAllPageAnnotations] = useState<Map<number, DrawingPath[]>>(new Map());
  const [allPageTextAnnotations, setAllPageTextAnnotations] = useState<Map<number, TextAnnotation[]>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  // Language support
  const [isRTL, setIsRTL] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Header visibility state
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  
  // Toolbar visibility state
  const [isToolbarHidden, setIsToolbarHidden] = useState(false);
  
  // File history
  const [showFileHistory, setShowFileHistory] = useState(false);
  
  // Sketch mode
  const [mode, setMode] = useState<'pdf' | 'sketch' | 'home'>('home');
  const [currentSketch, setCurrentSketch] = useState<Sketch | null>(null);
  const [showSketchGallery, setShowSketchGallery] = useState(false);
  
  // Pen favorites
  const [penFavorites, setPenFavorites] = useState<PenFavorite[]>([]);
  const [showPenFavorites, setShowPenFavorites] = useState(false);
  
  // Shape recognition
  const [shapeRecognitionEnabled, setShapeRecognitionEnabled] = useState(true);

  // Handle RTL direction changes
  useEffect(() => {
    document.body.className = isRTL ? 'rtl' : '';
  }, [isRTL]);

  // Load pen favorites on mount
  useEffect(() => {
    setPenFavorites(getPenFavorites());
  }, []);

  const toggleLanguage = () => {
    setIsRTL(prev => !prev);
  };

  const applyPenFavorite = (favorite: PenFavorite) => {
    setPenColor(favorite.color);
    setPenSize(favorite.size);
    setPenStyle(favorite.style);
    setPenOpacity(favorite.opacity);
  };

  const handleSavePenFavorite = () => {
    const name = prompt('Enter a name for this pen preset:');
    if (!name || !name.trim()) return;
    
    try {
      const newFavorite = savePenFavorite({
        name: name.trim(),
        color: penColor,
        size: penSize,
        style: penStyle,
        opacity: penOpacity,
      });
      setPenFavorites(getPenFavorites());
      alert(`✅ Saved "${newFavorite.name}"!`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save favorite');
    }
  };

  const handleDeletePenFavorite = (id: string) => {
    if (confirm('Delete this pen preset?')) {
      deletePenFavorite(id);
      setPenFavorites(getPenFavorites());
    }
  };

  const toggleHeader = () => {
    setIsHeaderHidden(!isHeaderHidden);
  };

  const toggleToolbar = () => {
    setIsToolbarHidden(!isToolbarHidden);
  };

  const handleFileSelect = async (file: File) => {
    setPdfFile(file);
    setCurrentPage(1);
    setNumPages(null);
    setDrawingPaths([]); // Reset drawing paths for new file
    setTextAnnotations([]); // Reset text annotations
    setHistory([[]]); // Reset history
    setHistoryIndex(0);
    setAllPageAnnotations(new Map()); // Reset all page annotations
    setAllPageTextAnnotations(new Map()); // Reset all text annotations
    setPdfDimensions(null);
    setShowFileHistory(false); // Close file history modal
    setMode('pdf'); // Switch to PDF mode
    
    // Add to recent files
    try {
      await addToRecentFiles(file);
    } catch (error) {
      console.error('Error tracking recent file:', error);
    }
  };

  const handleNewSketch = () => {
    setCurrentSketch(null);
    setShowSketchGallery(false);
    setMode('sketch');
  };

  const handleEditSketch = (sketch: Sketch) => {
    setCurrentSketch(sketch);
    setShowSketchGallery(false);
    setMode('sketch');
  };

  const handleSaveSketch = async (paths: DrawingPath[], thumbnail: string) => {
    try {
      let sketchName = currentSketch?.name || `Sketch ${new Date().toLocaleDateString()}`;
      
      // Prompt for name if it's a new sketch
      if (!currentSketch) {
        const name = prompt('Enter a name for your sketch:', sketchName);
        if (name && name.trim()) {
          sketchName = name.trim();
        }
      }

      const savedSketch = await saveSketch(
        currentSketch?.id || null,
        sketchName,
        paths,
        thumbnail
      );

      setCurrentSketch(savedSketch);
      alert('Sketch saved successfully!');
    } catch (error) {
      console.error('Error saving sketch:', error);
      alert('Failed to save sketch');
    }
  };

  const handleBackFromSketch = () => {
    setMode('home');
    setCurrentSketch(null);
  };

  const handleBackFromGallery = () => {
    setMode('home');
  };

  const handleOpenSketchGallery = () => {
    setShowSketchGallery(true);
    setMode('home');
  };

  const handleBackToHome = () => {
    setPdfFile(null);
    setMode('home');
  };

  const saveToHistory = (paths: DrawingPath[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...paths]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handlePathDrawn = (path: DrawingPath) => {
    let finalPath = path;
    
    // Apply shape recognition if enabled and it's a pen tool (not eraser)
    if (shapeRecognitionEnabled && path.tool === 'pen' && path.points.length >= 5) {
      const recognized = recognizeShape(path);
      if (recognized) {
        // Replace with perfect shape
        finalPath = {
          ...path,
          points: recognized.points,
          // Remove pressure data for perfect shapes
          pressure: undefined,
        };
      }
    }
    
    const newPaths = [...drawingPaths, finalPath];
    setDrawingPaths(newPaths);
    saveToHistory(newPaths);
  };

  const handlePathErased = (pathId: string) => {
    const newPaths = drawingPaths.filter(path => path.id !== pathId);
    setDrawingPaths(newPaths);
    saveToHistory(newPaths);
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

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when PDF is loaded
      if (!pdfFile) return;

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            event.preventDefault();
            redo();
            break;
          case 'p':
            event.preventDefault();
            setDrawingTool('pen');
            break;
            case 'e':
              event.preventDefault();
              setDrawingTool('eraser');
              break;
            case 't':
              event.preventDefault();
              setDrawingTool('text');
              break;
            case 'h':
              event.preventDefault();
              toggleHeader();
              break;
            case 'b':
              event.preventDefault();
              toggleToolbar();
              break;
        }
      }

      // Number keys for pen sizes
      if (event.key >= '1' && event.key <= '9') {
        const size = parseInt(event.key);
        setPenSize(size);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfFile, undo, redo]);

  const handleDocumentLoadSuccess = (pages: number) => {
    setNumPages(pages);
  };

  const goToPreviousPage = () => {
    // Save current page annotations before switching
    saveCurrentPageAnnotations();
    const newPage = Math.max(currentPage - 1, 1);
    setCurrentPage(newPage);
    setPageInput(String(newPage));
    loadPageAnnotations(newPage);
  };

  const goToNextPage = () => {
    // Save current page annotations before switching
    saveCurrentPageAnnotations();
    const newPage = Math.min(currentPage + 1, numPages || 1);
    setCurrentPage(newPage);
    setPageInput(String(newPage));
    loadPageAnnotations(newPage);
  };

  const goToPage = (page: number) => {
    if (!numPages || page < 1 || page > numPages) return;
    
    // Save current page annotations before switching
    saveCurrentPageAnnotations();
    setCurrentPage(page);
    setPageInput(String(page));
    loadPageAnnotations(page);
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(pageInput, 10);
      if (!isNaN(page) && numPages && page >= 1 && page <= numPages) {
        goToPage(page);
      } else {
        // Reset to current page if invalid
        setPageInput(String(currentPage));
      }
    }
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && numPages && page >= 1 && page <= numPages) {
      goToPage(page);
    } else {
      // Reset to current page if invalid
      setPageInput(String(currentPage));
    }
  };

  const saveCurrentPageAnnotations = () => {
    setAllPageAnnotations(prev => {
      const newMap = new Map(prev);
      newMap.set(currentPage, [...drawingPaths]);
      return newMap;
    });
    setAllPageTextAnnotations(prev => {
      const newMap = new Map(prev);
      newMap.set(currentPage, [...textAnnotations]);
      return newMap;
    });
  };

  const loadPageAnnotations = (pageNum: number) => {
    const paths = allPageAnnotations.get(pageNum) || [];
    const texts = allPageTextAnnotations.get(pageNum) || [];
    setDrawingPaths(paths);
    setTextAnnotations(texts);
    setHistory([paths]);
    setHistoryIndex(0);
  };

  const handleTextAdd = (annotation: TextAnnotation) => {
    setTextAnnotations(prev => [...prev, annotation]);
  };

  const handleTextDelete = (id: string) => {
    setTextAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const handleTextUpdate = (id: string, text: string) => {
    setTextAnnotations(prev => 
      prev.map(a => a.id === id ? { ...a, text } : a)
    );
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleSavePDF = async () => {
    if (!pdfFile || !pdfDimensions) {
      alert('Please load a PDF file first');
      return;
    }

    try {
      setIsSaving(true);
      
      // Save current page annotations before exporting
      saveCurrentPageAnnotations();
      
      // Import the export function dynamically
      const { exportAnnotatedPDF, downloadPDF } = await import('./utils/pdfExport');
      
      // Update the map with current page
      const finalAnnotations = new Map(allPageAnnotations);
      finalAnnotations.set(currentPage, [...drawingPaths]);
      
      // Export the PDF with annotations
      const annotatedPdfBlob = await exportAnnotatedPDF(
        pdfFile,
        finalAnnotations,
        pdfDimensions
      );
      
      // Download the file
      const originalFileName = pdfFile.name.replace('.pdf', '');
      const savedFileName = `${originalFileName}_annotated.pdf`;
      downloadPDF(annotatedPdfBlob, savedFileName);
      
      // Save to file history
      try {
        const totalAnnotations = Array.from(finalAnnotations.values())
          .reduce((sum, paths) => sum + paths.length, 0);
        await saveAnnotatedFile(annotatedPdfBlob, savedFileName, totalAnnotations);
      } catch (storageError) {
        console.error('Error saving to file history:', storageError);
        // Continue even if storage fails
      }
      
      alert('PDF saved successfully!');
    } catch (error) {
      console.error('Error saving PDF:', error);
      
      // More detailed error message
      let errorMessage = 'Failed to save PDF. ';
      if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      alert(errorMessage);
      
      // Log detailed error info for debugging
      console.error('PDF Export Error Details:', {
        error,
        pdfFile: pdfFile?.name,
        pdfDimensions,
        annotationCount: Array.from(allPageAnnotations.entries()).map(([page, paths]) => ({
          page,
          pathCount: paths.length
        }))
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app">
      <header className={`app-header ${isHeaderHidden ? 'header-hidden' : ''}`}>
        <h1>PDF Note Taking & Sketch App</h1>
        {mode === 'home' && (
          <div className="header-buttons">
            <button 
              className="file-history-btn"
              onClick={() => setShowFileHistory(true)}
              title="View Recent & Saved Files"
            >
              📁 Files
            </button>
            <button 
              className="sketch-gallery-btn"
              onClick={handleOpenSketchGallery}
              title="View Sketches"
            >
              🎨 Sketches
            </button>
          </div>
        )}
        {(mode === 'pdf' || mode === 'sketch') && (
          <button 
            onClick={toggleHeader} 
            className="toggle-header-btn"
            title={isHeaderHidden ? "Show Header (Ctrl+H)" : "Hide Header (Ctrl+H)"}
          >
            {isHeaderHidden ? '▼' : '▲'}
          </button>
        )}
      </header>

      {/* Floating toggle button when header is hidden */}
      {isHeaderHidden && (mode === 'pdf' || mode === 'sketch') && (
        <button 
          onClick={toggleHeader} 
          className="floating-header-toggle"
          title="Show Header (Ctrl+H)"
        >
          ▼ Show Header
        </button>
      )}

      <div className="app-content">
        {mode === 'home' && !pdfFile && !showSketchGallery ? (
          <div className="home-container">
            <FileUpload onFileSelect={handleFileSelect} selectedFile={pdfFile} />
            
            <div className="section-divider">
              <span>Or choose an option</span>
            </div>
            
            <div className="mode-selector">
              <div className="mode-card" onClick={() => setShowFileHistory(true)}>
                <div className="mode-icon">📄</div>
                <h3>PDF Annotation</h3>
                <p>Open and annotate PDF files</p>
              </div>
              <div className="mode-card" onClick={handleNewSketch}>
                <div className="mode-icon">🎨</div>
                <h3>New Sketch</h3>
                <p>Create a blank canvas sketch</p>
              </div>
              <div className="mode-card" onClick={handleOpenSketchGallery}>
                <div className="mode-icon">📂</div>
                <h3>My Sketches</h3>
                <p>Browse saved sketches</p>
              </div>
            </div>
          </div>
        ) : showSketchGallery ? (
          <SketchGallery
            onNewSketch={handleNewSketch}
            onEditSketch={handleEditSketch}
            onBack={handleBackFromGallery}
          />
        ) : mode === 'sketch' ? (
          <SketchPad
            sketchId={currentSketch?.id}
            initialPaths={currentSketch?.paths || []}
            onSave={handleSaveSketch}
            onBack={handleBackFromSketch}
          />
        ) : mode === 'pdf' && pdfFile ? (
          <div className="pdf-container">
            <div className={`pdf-toolbar ${isToolbarHidden ? 'toolbar-hidden' : ''}`}>
              <div className="page-controls">
                <button onClick={goToPreviousPage} disabled={currentPage <= 1}>
                  ← Prev
                </button>
                <div className="page-jump">
                  <span className="page-label">Page</span>
                  <input
                    type="number"
                    min="1"
                    max={numPages || 1}
                    value={pageInput}
                    onChange={handlePageInputChange}
                    onKeyDown={handlePageInputSubmit}
                    onBlur={handlePageInputBlur}
                    className="page-input"
                    title="Jump to page (press Enter)"
                  />
                  <span className="page-total">of {numPages}</span>
                </div>
                <button onClick={goToNextPage} disabled={currentPage >= (numPages || 1)}>
                  Next →
                </button>
              </div>

              <div className="drawing-controls">
                <div className="tool-selection">
                  <button
                    className={drawingTool === 'pen' ? 'active' : ''}
                    onClick={() => setDrawingTool('pen')}
                    title="Pen Tool"
                  >
                    ✏️
                  </button>
                  <button
                    className={drawingTool === 'eraser' ? 'active' : ''}
                    onClick={() => setDrawingTool('eraser')}
                    title="Eraser Tool"
                  >
                    🧽
                  </button>
                  <button
                    className={drawingTool === 'text' ? 'active' : ''}
                    onClick={() => setDrawingTool('text')}
                    title="Text Tool (Ctrl+T)"
                  >
                    📝
                  </button>
                </div>

                <div className="text-settings" style={{ display: drawingTool === 'text' ? 'flex' : 'none' }}>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    title="Text Color"
                  />
                  <label>Size:</label>
                  <input
                    type="range"
                    min="8"
                    max="48"
                    value={textFontSize}
                    onChange={(e) => setTextFontSize(Number(e.target.value))}
                    title="Font Size"
                  />
                  <span className="pen-size-display">{textFontSize}px</span>
                  <select 
                    value={textFontFamily}
                    onChange={(e) => setTextFontFamily(e.target.value)}
                    title="Font Family"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                </div>

                <div className="pen-settings">
                  <div className="pen-style-selector">
                    <label htmlFor="pen-style">Style:</label>
                    <select 
                      id="pen-style"
                      value={penStyle} 
                      onChange={(e) => setPenStyle(e.target.value as PenStyle)}
                      title="Pen Style"
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
                  </div>
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
                    max="20"
                    value={penSize}
                    onChange={(e) => setPenSize(Number(e.target.value))}
                    title="Pen Size"
                  />
                  <span className="pen-size-display">{penSize}px</span>
                  
                  <label>Opacity:</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={penOpacity * 100}
                    onChange={(e) => setPenOpacity(Number(e.target.value) / 100)}
                    title="Pen Opacity"
                  />
                  <span className="pen-size-display">{Math.round(penOpacity * 100)}%</span>
                  
                  <div className="pen-favorites-controls">
                    <button
                      onClick={() => setShowPenFavorites(!showPenFavorites)}
                      title="Pen Presets"
                      className="favorites-toggle-btn"
                    >
                      ⭐ {showPenFavorites ? 'Hide' : 'Presets'}
                    </button>
                    <button
                      onClick={handleSavePenFavorite}
                      title="Save Current Pen as Preset"
                      className="save-favorite-btn"
                    >
                      💾
                    </button>
                  </div>
                </div>

                {showPenFavorites && (
                  <div className="pen-favorites-list">
                    {penFavorites.map((fav) => (
                      <div key={fav.id} className="pen-favorite-item">
                        <button
                          onClick={() => applyPenFavorite(fav)}
                          className="apply-favorite-btn"
                          title={`${fav.name}\nStyle: ${fav.style}, Size: ${fav.size}px, Opacity: ${Math.round(fav.opacity * 100)}%`}
                        >
                          <span className="favorite-preview" style={{
                            backgroundColor: fav.color,
                            opacity: fav.opacity,
                            width: `${fav.size * 2}px`,
                            height: `${fav.size * 2}px`,
                          }}></span>
                          <span className="favorite-name">{fav.name}</span>
                        </button>
                        {!fav.id.startsWith('default_') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePenFavorite(fav.id);
                            }}
                            className="delete-favorite-btn"
                            title="Delete Preset"
                          >
                            ❌
                          </button>
                        )}
                      </div>
                    ))}
                    {penFavorites.length === 0 && (
                      <p className="no-favorites">No pen presets saved yet. Click 💾 to save current pen settings!</p>
                    )}
                  </div>
                )}

                <div className="history-controls">
                  <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
                    ↶ Undo
                  </button>
                  <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
                    ↷ Redo
                  </button>
                  <button 
                    onClick={() => setShapeRecognitionEnabled(!shapeRecognitionEnabled)}
                    className={shapeRecognitionEnabled ? 'shape-recognition-btn active' : 'shape-recognition-btn'}
                    title={`Shape Recognition: ${shapeRecognitionEnabled ? 'ON' : 'OFF'}\nAuto-correct lines, circles, rectangles & arrows`}
                  >
                    {shapeRecognitionEnabled ? '🔷 Shapes' : '⬜ Shapes'}
                  </button>
                </div>

                <button onClick={() => {
                  setDrawingPaths([]);
                  saveToHistory([]);
                }} className="clear-btn">
                  Clear All
                </button>
              </div>

              <div className="zoom-controls">
                <button onClick={zoomOut} disabled={scale <= 0.5}>-</button>
                <span>{Math.round(scale * 100)}%</span>
                <button onClick={zoomIn} disabled={scale >= 3.0}>+</button>
              </div>

              <button onClick={toggleLanguage} className="language-btn" title={isRTL ? 'Switch to LTR' : 'Switch to RTL (Arabic)'}>
                {isRTL ? 'LTR' : 'عربي'}
              </button>

              <button onClick={() => setShowHelp(true)} className="help-btn" title="Keyboard Shortcuts">
                ?
              </button>

              <button 
                onClick={handleSavePDF} 
                className="save-btn" 
                disabled={isSaving}
                title="Save PDF with Annotations"
              >
                {isSaving ? '💾 Saving...' : '💾 Save PDF'}
              </button>

              <button onClick={handleBackToHome} className="change-file-btn">
                ← Back to Home
              </button>

              <button 
                onClick={toggleToolbar} 
                className="toggle-toolbar-btn"
                title={isToolbarHidden ? "Show Toolbar (Ctrl+B)" : "Hide Toolbar (Ctrl+B)"}
              >
                {isToolbarHidden ? '▼' : '▲'}
              </button>
            </div>

            {/* Floating toolbar toggle button when toolbar is hidden */}
            {isToolbarHidden && (
              <button 
                onClick={toggleToolbar} 
                className="floating-toolbar-toggle"
                title="Show Toolbar (Ctrl+B)"
              >
                ▼ Show Tools
              </button>
            )}

            <div className="pdf-viewer-wrapper">
              <PDFViewer
                file={pdfFile}
                onDocumentLoadSuccess={handleDocumentLoadSuccess}
                currentPage={currentPage}
                scale={scale}
                tool={drawingTool}
                penColor={penColor}
                penSize={penSize}
                penStyle={penStyle}
                penOpacity={penOpacity}
                onPathDrawn={handlePathDrawn}
                onPathErased={handlePathErased}
                paths={drawingPaths}
                textAnnotations={textAnnotations}
                onTextAdd={handleTextAdd}
                onTextDelete={handleTextDelete}
                onTextUpdate={handleTextUpdate}
                textFontSize={textFontSize}
                textColor={textColor}
                textFontFamily={textFontFamily}
                onPageDimensionsChange={setPdfDimensions}
              />
            </div>
          </div>
        ) : null}

        {/* Help Modal */}
        {showHelp && (
          <div className="help-modal-overlay" onClick={() => setShowHelp(false)}>
            <div className="help-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Keyboard Shortcuts</h3>
              <div className="shortcuts-list">
                <div className="shortcut-item">
                  <kbd>Ctrl+Z</kbd> <span>Undo</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl+Shift+Z</kbd> or <kbd>Ctrl+Y</kbd> <span>Redo</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl+P</kbd> <span>Switch to Pen</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl+E</kbd> <span>Switch to Eraser</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl+T</kbd> <span>Switch to Text Tool</span>
                </div>
                <div className="shortcut-item">
                  <kbd>1-9</kbd> <span>Set pen size (1-9px)</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl+H</kbd> <span>Toggle Header</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl+B</kbd> <span>Toggle Toolbar</span>
                </div>
              </div>
              <button onClick={() => setShowHelp(false)} className="close-help-btn">
                Close
              </button>
            </div>
          </div>
        )}

        {/* File History Modal */}
        {showFileHistory && (
          <FileHistory 
            onFileSelect={handleFileSelect}
            onClose={() => setShowFileHistory(false)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
