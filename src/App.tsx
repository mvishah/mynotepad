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
import { isStandalone } from './pwaInstall';
import type { Sketch } from './utils/sketchStorage';
import { saveSketch } from './utils/sketchStorage';
import { getPenFavorites, savePenFavorite, deletePenFavorite, type PenFavorite } from './utils/penFavorites';
import { recognizeShape } from './utils/shapeRecognition';

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1.5);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number } | null>(null);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  // Drawing state
  const [drawingTool, setDrawingTool] = useState<'pen' | 'eraser' | 'text' | 'pan'>('pen');
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

  
  // Toolbar visibility state
  const [isToolbarHidden, setIsToolbarHidden] = useState(false);

  // Manual zoom tracking
  const [hasManualZoom, setHasManualZoom] = useState(false);
  
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

  // PDF view expansion state
  const [isExpandedView, setIsExpandedView] = useState(false);

  // Hamburger menu state
  const [isHamburgerMenuOpen, setIsHamburgerMenuOpen] = useState(false);

  // Handle RTL direction changes
  useEffect(() => {
    document.body.className = isRTL ? 'rtl' : '';
  }, [isRTL]);

  // Auto-scale PDF to fit available height (only when user hasn't manually zoomed)
  useEffect(() => {
    const updateScale = () => {
      if (pdfDimensions && pdfFile && !hasManualZoom) {
        // Calculate available height (viewport - header - toolbar - padding)
        const viewportHeight = window.innerHeight;
        const headerHeight = 40; // Header is always visible
        const toolbarHeight = isToolbarHidden ? 0 : 50;
        const padding = isExpandedView ? 10 : 40; // Reduced padding in expanded view

        let availableHeight = viewportHeight - headerHeight - toolbarHeight - padding;

        // In expanded view, use more of the available height
        const fillPercentage = isExpandedView ? 0.98 : 0.90;
        const optimalScale = (availableHeight * fillPercentage) / pdfDimensions.height;

        // Clamp between 0.5 and 10.0 for expanded view, 0.5-5.0 for normal view (auto-scaling limits)
        // Users can manually zoom up to 15.0x beyond these auto-scale limits
        const maxScale = isExpandedView ? 10.0 : 5.0;
        const newScale = Math.max(1.0, Math.min(maxScale, optimalScale));
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [pdfDimensions, pdfFile, isExpandedView, hasManualZoom]);

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
    setHasManualZoom(false); // Reset manual zoom flag for new PDF
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
            case 'm':
              event.preventDefault();
              setDrawingTool('pan');
              break;
            case 'b':
              event.preventDefault();
              toggleToolbar();
              break;
            case 'f':
              event.preventDefault();
              setIsExpandedView(prev => !prev);
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
    setScrollPosition({ x: 0, y: 0 }); // Reset scroll position
    loadPageAnnotations(newPage);
  };

  const goToNextPage = () => {
    // Save current page annotations before switching
    saveCurrentPageAnnotations();
    const newPage = Math.min(currentPage + 1, numPages || 1);
    setCurrentPage(newPage);
    setPageInput(String(newPage));
    setScrollPosition({ x: 0, y: 0 }); // Reset scroll position
    loadPageAnnotations(newPage);
  };

  const goToPage = (page: number) => {
    if (!numPages || page < 1 || page > numPages) return;

    // Save current page annotations before switching
    saveCurrentPageAnnotations();
    setCurrentPage(page);
    setPageInput(String(page));
    setScrollPosition({ x: 0, y: 0 }); // Reset scroll position
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

  const handleTextMove = (id: string, x: number, y: number) => {
    setTextAnnotations(prev =>
      prev.map(a => a.id === id ? { ...a, x, y } : a)
    );
  };

  const handlePWAInstall = () => {
    console.log('Install button clicked - using direct installation method');

    // Direct installation - no PWA dependencies
    installAppDirectly();
  };

  const installAppDirectly = () => {
    const userAgent = navigator.userAgent;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isWindows = navigator.platform.toLowerCase().indexOf('win') > -1;
    const isMac = navigator.platform.toLowerCase().indexOf('mac') > -1;

    // Desktop: Download shortcut file immediately
    if (!isMobile) {
      downloadShortcutFile(isWindows, isMac);
      return;
    }

    // Mobile: Open in app-like window + show instructions
    if (isIOS) {
      openAppWindow();
      showInstallModal('iOS Installation', 
        '1. Tap the Share button (⬆️) at the bottom\n' +
        '2. Scroll down and tap "Add to Home Screen"\n' +
        '3. Tap "Add" to install\n\n' +
        'The app is now open in a new window - you can bookmark it!');
    } else if (isAndroid) {
      openAppWindow();
      showInstallModal('Android Installation',
        '1. Tap the menu (⋮) in your browser\n' +
        '2. Select "Add to Home screen" or "Install app"\n' +
        '3. Tap "Add" or "Install"\n\n' +
        'The app is now open in a new window - you can bookmark it!');
    } else {
      openAppWindow();
      showInstallModal('Mobile Installation',
        'Press Ctrl+D (or Cmd+D on Mac) to bookmark this page for quick access.\n\n' +
        'The app is now open in a new window!');
    }
  };

  const downloadShortcutFile = (isWindows: boolean, isMac: boolean) => {
    let shortcutContent = '';
    let filename = '';
    let mimeType = '';

    if (isWindows) {
      // Windows .url file
      shortcutContent = `[InternetShortcut]\nURL=${window.location.href}\nIconFile=${window.location.href}\nIconIndex=0\n`;
      filename = 'PDF Note Taker.url';
      mimeType = 'text/plain';
    } else if (isMac) {
      // Mac .webloc file
      shortcutContent = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>URL</key>\n\t<string>${window.location.href}</string>\n</dict>\n</plist>`;
      filename = 'PDF Note Taker.webloc';
      mimeType = 'application/xml';
    } else {
      // Linux/Other - HTML shortcut
      shortcutContent = `<!DOCTYPE html>\n<html>\n<head>\n<meta http-equiv="refresh" content="0; url=${window.location.href}">\n<title>PDF Note Taker</title>\n</head>\n<body>\n<p><a href="${window.location.href}">Open PDF Note Taker</a></p>\n</body>\n</html>`;
      filename = 'PDF Note Taker.html';
      mimeType = 'text/html';
    }

    // Create and download
    const blob = new Blob([shortcutContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also open in new window
    openAppWindow();

    // Show success message
    showInstallModal('✅ Installation Complete!',
      `Shortcut file "${filename}" has been downloaded!\n\n` +
      `1. Find the file in your Downloads folder\n` +
      `2. Move it to your Desktop for easy access\n` +
      `3. Double-click to open your PDF app\n\n` +
      `The app is also open in a new window!`);
  };

  const openAppWindow = () => {
    // Open app in new window with app-like features
    const features = [
      'width=1200',
      'height=800',
      'scrollbars=yes',
      'resizable=yes',
      'status=yes',
      'location=no',
      'toolbar=no',
      'menubar=no',
      'titlebar=yes'
    ].join(',');

    try {
      const newWindow = window.open(window.location.href, 'PDFNoteTaker', features);
      if (newWindow) {
        // Focus the new window
        newWindow.focus();
        console.log('App opened in new window');
      }
    } catch (e) {
      console.log('Popup blocked - user can manually open in new tab');
    }
  };

  const showInstallModal = (title: string, message: string) => {
    // Remove any existing modals
    const existing = document.getElementById('install-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'install-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
      border-radius: 16px;
      padding: 2rem;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    `;

    content.innerHTML = `
      <h2 style="margin: 0 0 1rem 0; color: #667eea; font-size: 1.5rem;">${title}</h2>
      <pre style="text-align: left; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 0.95rem; line-height: 1.6; color: #2c3e50; background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 1rem 0;">${message}</pre>
      <button id="install-modal-close" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 8px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        margin-top: 1rem;
      ">Got it!</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close handlers
    const closeBtn = content.querySelector('#install-modal-close');
    closeBtn?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Auto-close after 15 seconds
    setTimeout(() => {
      if (modal.parentElement) modal.remove();
    }, 15000);
  };


  const zoomIn = () => {
    setHasManualZoom(true);
    setScale(prev => Math.min(prev + 0.25, 15.0)); // Increased max zoom to 15x
  };

  const zoomOut = () => {
    setHasManualZoom(true);
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handlePan = (deltaX: number, deltaY: number) => {
    setScrollPosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));
  };

  const handleAutoScrollNext = () => {
    if (currentPage < (numPages || 1)) {
      goToNextPage();
    }
  };

  const handleAutoScrollPrevious = () => {
    if (currentPage > 1) {
      goToPreviousPage();
    }
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
      <header className="app-header">
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
          <div className="header-controls">
          {!isStandalone() && (
            <button
              onClick={handlePWAInstall}
              className="pwa-install-btn"
              title="Install App"
            >
              📱 Install
            </button>
        )}
        {(mode === 'pdf' || mode === 'sketch' || mode === 'home') && (
            <button
              onClick={() => setIsHamburgerMenuOpen(!isHamburgerMenuOpen)}
              className="hamburger-btn"
              title={mode === 'home' ? "Settings & Help" : "Tools Menu"}
            >
              ☰
            </button>
        )}
        </div>
      </header>


      {/* Hamburger Menu Overlay */}
      {isHamburgerMenuOpen && (
        <div
          className="hamburger-overlay active"
          onClick={() => setIsHamburgerMenuOpen(false)}
        />
      )}

      {/* Hamburger Menu */}
      <div className={`hamburger-menu ${isHamburgerMenuOpen ? 'open' : ''}`}>
        <div className="hamburger-menu-content">
          <div className="hamburger-menu-header">
            <h3 className="hamburger-menu-title">{mode === 'home' ? 'Settings' : 'Tools'}</h3>
            <button
              className="hamburger-close-btn"
              onClick={() => setIsHamburgerMenuOpen(false)}
              title="Close Menu"
            >
              ✕
            </button>
          </div>

          {/* Drawing Tools - Only show in PDF/Sketch mode */}
          {(mode === 'pdf' || mode === 'sketch') && (
            <div className="hamburger-section">
              <div className="hamburger-section-title">Drawing Tools</div>
              <div className="drawing-controls" style={{ flexDirection: 'column', gap: '1rem' }}>
                <div className="tool-selection" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
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
                    className={drawingTool === 'pan' ? 'active' : ''}
                    onClick={() => setDrawingTool('pan')}
                    title="Pan Tool (Ctrl+M) - Move around the page without drawing"
                  >
                    🖐️
                  </button>
                  <button
                    className={drawingTool === 'text' ? 'active' : ''}
                    onClick={() => setDrawingTool('text')}
                    title="Text Tool (Ctrl+T)"
                  >
                    📝
                  </button>
                </div>

                <div className="pen-settings" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="pen-style-selector">
                    <label htmlFor="pen-style-hamburger">Style:</label>
                    <select
                      id="pen-style-hamburger"
                      value={penStyle}
                      onChange={(e) => setPenStyle(e.target.value as PenStyle)}
                      title="Pen Style"
                      style={{ width: '100%', marginTop: '0.25rem' }}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="color"
                      value={penColor}
                      onChange={(e) => setPenColor(e.target.value)}
                      title="Pen Color"
                      style={{ width: '50px', height: '40px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem' }}>Size:</label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={penSize}
                        onChange={(e) => setPenSize(Number(e.target.value))}
                        title="Pen Size"
                        style={{ width: '100%' }}
                      />
                      <span className="pen-size-display">{penSize}px</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label>Opacity:</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={penOpacity * 100}
                      onChange={(e) => setPenOpacity(Number(e.target.value) / 100)}
                      title="Pen Opacity"
                      style={{ flex: 1 }}
                    />
                    <span className="pen-size-display">{Math.round(penOpacity * 100)}%</span>
                  </div>

                  <div className="pen-favorites-controls" style={{ justifyContent: 'flex-start' }}>
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

                  {showPenFavorites && (
                    <div className="pen-favorites-list" style={{ position: 'static', marginTop: '0.5rem' }}>
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
                </div>
              </div>
            </div>
          )}

          {/* Page Navigation - Only show in PDF mode */}
          {mode === 'pdf' && (
            <div className="hamburger-section">
              <div className="hamburger-section-title">Navigation</div>
              <div className="page-controls" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                <button onClick={goToPreviousPage} disabled={currentPage <= 1}>
                  ← Previous Page
                </button>
                <div className="page-jump" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
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
                    style={{ width: '100%', margin: '0.25rem 0' }}
                  />
                  <span className="page-total">of {numPages}</span>
                </div>
                <button onClick={goToNextPage} disabled={currentPage >= (numPages || 1)}>
                  Next Page →
                </button>
              </div>
            </div>
          )}

          {/* History & Actions - Only show in PDF/Sketch mode */}
          {(mode === 'pdf' || mode === 'sketch') && (
            <div className="hamburger-section">
              <div className="hamburger-section-title">History & Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="history-controls" style={{ justifyContent: 'flex-start' }}>
                  <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
                    ↶ Undo
                  </button>
                  <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
                    ↷ Redo
                  </button>
                </div>

                <button onClick={() => {
                  setDrawingPaths([]);
                  saveToHistory([]);
                }} className="clear-btn" style={{ width: 'fit-content' }}>
                  🗑️ Clear All
                </button>
              </div>
            </div>
          )}

          {/* Zoom & View Controls - Only show in PDF mode */}
          {mode === 'pdf' && (
            <div className="hamburger-section">
              <div className="hamburger-section-title">View Controls</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="zoom-controls" style={{ justifyContent: 'center' }}>
                  <button onClick={zoomOut} disabled={scale <= 0.5}>-</button>
                  <span>{Math.round(scale * 100)}%</span>
                  <button onClick={zoomIn} disabled={scale >= 15.0}>+</button>
                </div>

                <div className="view-controls" style={{ justifyContent: 'center' }}>
                  <button
                    onClick={() => setIsExpandedView(!isExpandedView)}
                    className={`view-toggle-btn ${isExpandedView ? 'expanded' : ''}`}
                    title={isExpandedView ? "Normal View" : "Expanded View (Maximize PDF)"}
                  >
                    {isExpandedView ? '🪟' : '⛶'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Drawing Tools - Only show in PDF/Sketch mode */}
          {(mode === 'pdf' || mode === 'sketch') && (
            <div className="hamburger-section">
              <div className="hamburger-section-title">Advanced Drawing</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => setShapeRecognitionEnabled(!shapeRecognitionEnabled)}
                  className={shapeRecognitionEnabled ? 'shape-recognition-btn active' : 'shape-recognition-btn'}
                  title={`Shape Recognition: ${shapeRecognitionEnabled ? 'ON' : 'OFF'}\nAuto-correct lines, circles, rectangles & arrows`}
                  style={{ width: 'fit-content' }}
                >
                  {shapeRecognitionEnabled ? '🔷 Shapes ON' : '⬜ Shapes OFF'}
                </button>
              </div>
            </div>
          )}

          {/* Text Tools - Only show in PDF/Sketch mode when text tool is active */}
          {(mode === 'pdf' || mode === 'sketch') && drawingTool === 'text' && (
            <div className="hamburger-section">
              <div className="hamburger-section-title">Text Tools</div>
              <div className="text-settings" style={{ flexDirection: 'column', gap: '0.75rem', padding: '1rem', backgroundColor: 'rgba(52, 152, 219, 0.2)', border: '1px solid rgba(52, 152, 219, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    style={{ flex: 1 }}
                  />
                  <span className="pen-size-display">{textFontSize}px</span>
                </div>
                <select
                  value={textFontFamily}
                  onChange={(e) => setTextFontFamily(e.target.value)}
                  title="Font Family"
                  style={{ width: '100%' }}
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                </select>
              </div>
            </div>
          )}

          {/* Settings - Show in all modes */}
          <div className="hamburger-section">
            <div className="hamburger-section-title">Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={toggleLanguage} className="language-btn" title={isRTL ? 'Switch to LTR' : 'Switch to RTL (Arabic)'}>
                {isRTL ? 'LTR' : 'عربي'}
              </button>

              <button onClick={() => setShowHelp(true)} className="help-btn" title="Keyboard Shortcuts">
                ? Help
              </button>

              {/* Save PDF button - Only show in PDF mode */}
              {mode === 'pdf' && (
                <button
                  onClick={handleSavePDF}
                  className="save-btn"
                  disabled={isSaving}
                  title="Save PDF with Annotations"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  {isSaving ? '💾 Saving...' : '💾 Save PDF'}
                </button>
              )}

              {/* Back to Home button - Only show when not on home */}
              {mode !== 'home' && (
                <button onClick={handleBackToHome} className="change-file-btn" style={{ width: '100%' }}>
                  ← Back to Home
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
          <div className="pdf-container">
            <SketchPad
              sketchId={currentSketch?.id}
              initialPaths={currentSketch?.paths || []}
              onSave={handleSaveSketch}
              onBack={handleBackFromSketch}
            />
          </div>
        ) : mode === 'pdf' && pdfFile ? (
          <div className={`pdf-container ${isExpandedView ? 'expanded-view' : ''}`}>
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
                onTextMove={handleTextMove}
                textFontSize={textFontSize}
                textColor={textColor}
                textFontFamily={textFontFamily}
                onPageDimensionsChange={setPdfDimensions}
                isExpandedView={isExpandedView}
                onPan={handlePan}
                scrollPosition={scrollPosition}
                onAutoScrollNext={handleAutoScrollNext}
                onAutoScrollPrevious={handleAutoScrollPrevious}
                totalPages={numPages ?? undefined}
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
                  <kbd>Ctrl+M</kbd> <span>Switch to Pan Tool</span>
                </div>
                <div className="shortcut-item">
                  <kbd>1-9</kbd> <span>Set pen size (1-9px)</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl+B</kbd> <span>Toggle Toolbar</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl+F</kbd> <span>Toggle Expanded View</span>
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
