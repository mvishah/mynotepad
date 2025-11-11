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
  isTextMode: boolean;
}

const TextAnnotationComponent = ({ 
  annotations, 
  scale, 
  onAdd: _onAdd, // Passed from parent but not used in this component
  onDelete, 
  onUpdate,
  isTextMode: _isTextMode // Passed from parent but not used in this component
}: TextAnnotationProps) => {
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
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid #ddd',
          }}
          onDoubleClick={() => {
            const newText = prompt('Edit text:', annotation.text);
            if (newText !== null && newText.trim()) {
              onUpdate(annotation.id, newText.trim());
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (confirm('Delete this text annotation?')) {
              onDelete(annotation.id);
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

