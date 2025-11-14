import React, { useState } from 'react';
import './TextAnnotation.css';

export interface TextAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

interface TextAnnotationProps {
  annotations: TextAnnotation[];
  scale: number;
  onAdd: (annotation: TextAnnotation) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  isTextMode: boolean;
}

const TextAnnotationComponent = ({
  annotations,
  scale,
  onAdd: _onAdd, // Passed from parent but not used in this component
  onDelete,
  onUpdate,
  onMove,
  isTextMode: _isTextMode // Passed from parent but not used in this component
}: TextAnnotationProps) => {
  const [draggedAnnotation, setDraggedAnnotation] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, annotation: TextAnnotation) => {
    // Don't start drag if double-clicking (for editing) or right-clicking (for context menu)
    if (e.detail === 2 || e.button === 2) return;

    console.log('Starting drag for annotation:', annotation.id, 'at position:', annotation.x, annotation.y);
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    // Calculate offset from the center of the annotation
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const annotationCenterX = rect.left + rect.width / 2;
    const annotationCenterY = rect.top + rect.height / 2;

    setDragOffset({
      x: e.clientX - annotationCenterX,
      y: e.clientY - annotationCenterY
    });
    setDraggedAnnotation(annotation.id);

    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggedAnnotation) {
      const container = document.querySelector('.pdf-page-container') as HTMLElement;
      if (container) {
        const rect = container.getBoundingClientRect();

        // Calculate position based on mouse position minus the offset from annotation center
        const mouseX = e.clientX - dragOffset.x;
        const mouseY = e.clientY - dragOffset.y;

        // Convert to PDF coordinates
        const x = (mouseX - rect.left) / scale;
        const y = (mouseY - rect.top) / scale;

        // Ensure annotation stays within bounds
        const clampedX = Math.max(0, Math.min(x, (rect.width / scale) - 100));
        const clampedY = Math.max(0, Math.min(y, (rect.height / scale) - 50));

        console.log('Moving annotation to:', clampedX, clampedY);
        onMove(draggedAnnotation, clampedX, clampedY);
      }
    }
  };

  const handleMouseUp = () => {
    console.log('Drag ended');
    setDraggedAnnotation(null);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    // Restore text selection
    document.body.style.userSelect = '';
  };

  return (
    <>
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className="text-annotation"
          style={{
            position: 'absolute',
            left: annotation.x * scale,
            top: annotation.y * scale,
            fontSize: annotation.fontSize * scale,
            color: annotation.color,
            fontFamily: annotation.fontFamily,
            cursor: draggedAnnotation === annotation.id ? 'grabbing' : 'grab',
            padding: '2px 4px',
            borderRadius: '2px',
            backgroundColor: draggedAnnotation === annotation.id ? 'rgba(102, 126, 234, 0.9)' : 'rgba(255, 255, 255, 0.8)',
            border: draggedAnnotation === annotation.id ? '2px solid #667eea' : '1px solid #ddd',
            boxShadow: draggedAnnotation === annotation.id ? '0 2px 8px rgba(102, 126, 234, 0.3)' : 'none',
            zIndex: draggedAnnotation === annotation.id ? 1000 : 'auto',
            userSelect: 'none',
          }}
          title="Click and drag to move text"
          onMouseDown={(e) => handleMouseDown(e, annotation)}
          onDoubleClick={(e) => {
            if (draggedAnnotation !== annotation.id) {
              e.stopPropagation();
              const newText = prompt('Edit text:', annotation.text);
              if (newText !== null && newText.trim()) {
                onUpdate(annotation.id, newText.trim());
              }
            }
          }}
          onContextMenu={(e) => {
            if (draggedAnnotation !== annotation.id) {
              e.preventDefault();
              if (confirm('Delete this text annotation?')) {
                onDelete(annotation.id);
              }
            }
          }}
        >
          {annotation.text}
        </div>
      ))}
    </>
  );
};

export default TextAnnotationComponent;

