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
  tool: 'pen' | 'eraser' | 'text';
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
  textFontSize: number;
  textColor: string;
  textFontFamily: string;
  onPageDimensionsChange?: (dimensions: { width: number; height: number }) => void;
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
  textFontSize,
  textColor,
  textFontFamily,
  onPageDimensionsChange,
}) => {
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool !== 'text' || !pageDimensions) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

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
    <div className="pdf-viewer">
      <div 
        className="pdf-page-container" 
        ref={pageRef} 
        style={{ position: 'relative', cursor: tool === 'text' ? 'text' : 'default' }}
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
              color: '#666'
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
              border: '1px solid #fcc'
            }}>
              <h3>PDF Loading Error</h3>
              <p>Unable to load the PDF. The file may be corrupted or unsupported.</p>
              <p>Please check the browser console for more details.</p>
            </div>
          }
        >
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
                color: '#666'
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
                border: '1px solid #fcc'
              }}>
                <h3>Page Loading Error</h3>
                <p>Unable to load page {currentPage}.</p>
                <p>Please check the browser console for more details.</p>
              </div>
            }
          />
        </Document>
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
            />
            <TextAnnotationComponent
              annotations={textAnnotations}
              scale={scale}
              onAdd={onTextAdd}
              onDelete={onTextDelete}
              onUpdate={onTextUpdate}
              isTextMode={tool === 'text'}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
