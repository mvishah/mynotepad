import React, { useState, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import DrawingCanvas from './DrawingCanvas';
import type { DrawingPath, PenStyle } from './DrawingCanvas';
import TextAnnotationComponent, { type TextAnnotation } from './TextAnnotation';

// Configure PDF.js worker - using local file for offline support
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

interface PDFViewerProps {
  file: File | null;
  onDocumentLoadSuccess: (numPages: number) => void;
  currentPage: number;
  scale: number;
  tool: 'pen' | 'eraser' | 'text' | 'pan';
  penColor: string;
  penSize: number;
  penStyle: PenStyle;
  penOpacity?: number;
  onPathDrawn: (path: DrawingPath) => void;
  onPathErased: (pathId: string) => void;
  paths: DrawingPath[];
  textAnnotations: TextAnnotation[];
  onTextAdd: (annotation: TextAnnotation) => void;
  onTextDelete: (id: string) => void;
  onTextUpdate: (id: string, text: string) => void;
  onTextMove: (id: string, x: number, y: number) => void;
  textFontSize: number;
  textColor: string;
  textFontFamily: string;
  onPageDimensionsChange?: (dimensions: { width: number; height: number }) => void;
  isExpandedView?: boolean;
  onPan?: (deltaX: number, deltaY: number) => void;
  scrollPosition?: { x: number; y: number };
  onAutoScrollNext?: () => void;
  totalPages?: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  onDocumentLoadSuccess,
  currentPage,
  scale,
  tool,
  penColor,
  penSize,
  penStyle,
  penOpacity = 1,
  onPathDrawn,
  onPathErased,
  paths,
  textAnnotations,
  onTextAdd,
  onTextDelete,
  onTextUpdate,
  onTextMove,
  textFontSize,
  textColor,
  textFontFamily,
  onPageDimensionsChange,
  isExpandedView = false,
  onPan,
  scrollPosition = { x: 0, y: 0 },
  onAutoScrollNext,
  totalPages,
}) => {
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Apply scroll position when it changes
  React.useEffect(() => {
    if (pageRef.current && tool === 'pan') {
      pageRef.current.scrollLeft = scrollPosition.x;
      pageRef.current.scrollTop = scrollPosition.y;
    }
  }, [scrollPosition, tool]);

  // Auto-scroll to next page when reaching bottom (Adobe-style continuous scrolling)
  React.useEffect(() => {
    const container = pageRef.current;
    if (!container || !onAutoScrollNext || !totalPages || currentPage >= totalPages) return;

    let scrollTimeout: number;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20; // Reduced threshold for more responsive scrolling
      const isOverscroll = scrollTop + clientHeight > scrollHeight; // User has scrolled past content

      // Clear previous timeout
      clearTimeout(scrollTimeout);

      if (isAtBottom || isOverscroll) {
        // Debounce the auto-scroll to prevent multiple calls
        scrollTimeout = setTimeout(() => {
          if (onAutoScrollNext) {
            console.log('Auto-advancing to next page (Adobe-style scrolling)');
            onAutoScrollNext();
          }
        }, 300); // 300ms delay to allow user to stop scrolling
      }
    };

    // Add wheel event listener for mouse wheel overscroll detection
    const handleWheel = (e: WheelEvent) => {
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

      // If at bottom and scrolling down, allow overscroll and auto-advance
      if (isAtBottom && e.deltaY > 0 && onAutoScrollNext) {
        e.preventDefault();
        console.log('Overscroll detected, auto-advancing to next page');
        onAutoScrollNext();
        return;
      }
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      clearTimeout(scrollTimeout);
    };
  }, [onAutoScrollNext, totalPages, currentPage]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== 'text' || !pageDimensions) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    console.log('Text click at screen coords:', e.clientX, e.clientY);
    console.log('Container rect:', rect);
    console.log('Calculated PDF coords:', x, y);
    console.log('Scale:', scale);

    const text = prompt('Enter text:');
    if (text && text.trim()) {
      const newAnnotation: TextAnnotation = {
        id: `text_${Date.now()}_${Math.random()}`,
        text: text.trim(),
        x,
        y,
        fontSize: textFontSize,
        color: textColor,
        fontFamily: textFontFamily,
      };
      console.log('Creating text annotation at:', x, y);
      onTextAdd(newAnnotation);
    }
  };

  const onDocumentLoadSuccessInternal = useCallback(
    ({ numPages }: { numPages: number }) => {
      onDocumentLoadSuccess(numPages);
    },
    [onDocumentLoadSuccess]
  );

  const onPageLoadSuccess = useCallback((page: any) => {
    const dimensions = {
      width: page.originalWidth,
      height: page.originalHeight,
    };
    setPageDimensions(dimensions);
    if (onPageDimensionsChange) {
      onPageDimensionsChange(dimensions);
    }
  }, [onPageDimensionsChange]);

  if (!file) {
    return (
      <div className="pdf-viewer-placeholder">
        <p>Please select a PDF file to view</p>
      </div>
    );
  }

  return (
    <div className={`pdf-viewer ${isExpandedView ? 'expanded-pdf-viewer' : ''}`}>
      <div
        className="pdf-page-container"
        ref={pageRef}
        style={{
          position: 'relative',
          width: 'fit-content',
          minWidth: '100%',
          height: 'fit-content',
          minHeight: '100%',
          cursor: tool === 'text' ? 'text' : 'default',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: isExpandedView ? '0' : '0.5rem',
          paddingBottom: isExpandedView ? '40px' : '2rem', // Extra space at bottom for Adobe-style scrolling
          overflow: tool === 'pan' ? 'auto' : 'visible',
          scrollBehavior: 'smooth'
        }}
        onClick={handleCanvasClick}
      >
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccessInternal}
          onLoadError={(error) => {
            console.error('Error loading PDF:', error);
          }}
          loading={
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#666',
              width: '100%'
            }}>
              Loading PDF...
            </div>
          }
          error={
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'red',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              width: '100%'
            }}>
              <h3>PDF Loading Error</h3>
              <p>Unable to load the PDF. The file may be corrupted or unsupported.</p>
              <p>Please check the browser console for more details.</p>
            </div>
          }
        >
          <div style={{
            position: 'relative',
            width: 'fit-content',
            height: 'fit-content'
          }}>
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onLoadSuccess={onPageLoadSuccess}
              onLoadError={(error) => {
                console.error('Error loading page:', error);
              }}
              loading={
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#666',
                  width: '100%'
                }}>
                  Loading page...
                </div>
              }
              error={
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'red',
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  width: '100%'
                }}>
                  <h3>Page Loading Error</h3>
                  <p>Unable to load page {currentPage}.</p>
                  <p>Please check the browser console for more details.</p>
                </div>
              }
            />
            {pageDimensions && (
              <>
                <DrawingCanvas
                  width={pageDimensions.width}
                  height={pageDimensions.height}
                  scale={scale}
                  tool={tool === 'text' ? 'pen' : tool}
                  penColor={penColor}
                  penSize={penSize}
                  penStyle={penStyle}
                  penOpacity={penOpacity}
                  onPathDrawn={onPathDrawn}
                  onPathErased={onPathErased}
                  paths={paths}
                  onPan={onPan}
                />
                <TextAnnotationComponent
                  annotations={textAnnotations}
                  scale={scale}
                  onAdd={onTextAdd}
                  onDelete={onTextDelete}
                  onUpdate={onTextUpdate}
                  onMove={onTextMove}
                  isTextMode={tool === 'text'}
                />
              </>
            )}
          </div>
        </Document>

        {/* Scroll continuation indicator (Adobe-style) */}
        {totalPages && currentPage < totalPages && (
          <div
            style={{
              position: 'absolute',
              bottom: isExpandedView ? '20px' : '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(102, 126, 234, 0.1)',
              color: '#667eea',
              padding: '6px 16px',
              borderRadius: '16px',
              fontSize: '0.8rem',
              fontWeight: '500',
              pointerEvents: 'none',
              opacity: 0.8,
              zIndex: 10,
              border: '1px solid rgba(102, 126, 234, 0.2)',
              backdropFilter: 'blur(4px)',
            }}
          >
            Continue scrolling ↓
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
