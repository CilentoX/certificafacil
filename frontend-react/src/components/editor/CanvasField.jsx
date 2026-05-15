import { useState, useEffect, useRef } from 'react';
import { Move, QrCode } from 'lucide-react';

export default function CanvasField({
  field,
  selectedFieldId,
  dragging,
  resizing,
  editingFieldId,
  scale,
  snapToGrid,
  onFieldMouseDown,
  onResizeMouseDown,
  onFieldDoubleClick,
  selectField,
  updateField,
  commitField,
  setEditingFieldId,
  resolveContent
}) {
  const isSelected = selectedFieldId === field.id;
  const isDraggingThis = dragging === field.id;
  const isResizingThis = resizing === field.id;

  // Local state para performance durante drag/resize
  const [localPos, setLocalPos] = useState({ x: field.posX, y: field.posY });
  const [localSize, setLocalSize] = useState({ w: field.width || 100, h: field.height || 40 });
  const [autoScaleFactor, setAutoScaleFactor] = useState(1);
  const contentRef = useRef(null);

  // Sincronizar estado local quando o Zustand muda externamente (ex: Undo/Painel)
  useEffect(() => {
    if (!isDraggingThis && !isResizingThis) {
      setLocalPos({ x: field.posX, y: field.posY });
      setLocalSize({ w: field.width || 100, h: field.height || 40 });
    }
  }, [field.posX, field.posY, field.width, field.height, isDraggingThis, isResizingThis]);

  const renderedContent = resolveContent(field.content);

  // Efeito para calcular o auto-scale no editor
  useEffect(() => {
    if (field.autoScale && contentRef.current && !editingFieldId) {
        // Reset factor for measurement
        setAutoScaleFactor(1);
        
        const timer = setTimeout(() => {
            if (!contentRef.current) return;
            const parentWidth = localSize.w;
            const contentWidth = contentRef.current.getBoundingClientRect().width;
            
            if (contentWidth > parentWidth && parentWidth > 0) {
                setAutoScaleFactor(parentWidth / (contentWidth + 1));
            } else {
                setAutoScaleFactor(1);
            }
        }, 30);
        return () => clearTimeout(timer);
    } else {
        setAutoScaleFactor(1);
    }
  }, [field.autoScale, renderedContent, localSize.w, editingFieldId]);

  const rotation = field.rotation ? `rotate(${field.rotation}deg)` : '';
  const currentFontSize = field.fontSize * autoScaleFactor;

  return (
    <div
      className={`canvas-field ${isSelected ? 'selected' : ''} ${isDraggingThis ? 'dragging' : ''} type-${field.type || 'text'}`}
      style={{
        left: localPos.x,
        top: localPos.y,
        fontSize: currentFontSize, // Use the scaled font size directly
        color: field.color,
        textAlign: field.align,
        width: field.width ? localSize.w : 'auto',
        height: (!field.type || field.type === 'text') ? (field.height ? localSize.h : 'auto') : (field.height ? localSize.h : 'auto'),
        display: 'flex',
        alignItems: 'center', // Vertical center
        justifyContent: field.align === 'center' ? 'center' : field.align === 'right' ? 'flex-end' : 'flex-start',
        fontFamily: field.fontFamily || 'Inter',
        fontWeight: field.fontWeight || 'normal',
        fontStyle: field.fontStyle || 'normal',
        lineHeight: 1, // Reset line height for better centering
        letterSpacing: field.letterSpacing ? `${field.letterSpacing}px` : 'normal',
        opacity: (field.opacity || 100) / 100,
        transform: rotation || 'none',
        position: 'absolute',
        cursor: 'move',
        userSelect: 'none',
        backgroundColor: field.type === 'shape' ? field.backgroundColor : undefined,
        borderColor: field.type === 'shape' ? field.borderColor : undefined,
        borderWidth: field.type === 'shape' ? (field.borderWidth || 0) : undefined,
        borderStyle: field.type === 'shape' ? 'solid' : undefined,
        borderRadius: field.type === 'shape' ? (field.borderRadius || 0) : undefined,
        whiteSpace: field.autoScale ? 'nowrap !important' : undefined,
        overflow: field.autoScale ? 'hidden' : 'visible' // Hide overflow when auto-scaling to keep it clean
      }}
      onMouseDown={e => onFieldMouseDown(e, field.id, localPos, localSize)}
      onClick={e => { e.stopPropagation(); selectField(field.id); }}
      onDoubleClick={e => field.type !== 'image' && field.type !== 'shape' && onFieldDoubleClick(e, field.id)}
    >
      {field.type === 'image' ? (
        <img src={field.imageUrl} alt="Asset" style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
      ) : field.type === 'qrcode' ? (
        <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd' }}>
          <QrCode size={Math.min(localSize.w, localSize.h) * 0.8} color="#000" />
          <div style={{ position: 'absolute', bottom: -12, fontSize: '8px', color: '#6366f1', fontWeight: 'bold' }}>QR CODE VALIDAÇÃO</div>
        </div>
      ) : field.type === 'shape' ? (
        <div style={{ width: '100%', height: '100%' }} />
      ) : (
        editingFieldId === field.id ? (
          <div
            contentEditable
            suppressContentEditableWarning
            className="field-inline-input"
            onBlur={(e) => {
              updateField(field.id, { content: e.currentTarget.innerText });
              setEditingFieldId(null);
              commitField();
            }}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            ref={el => {
              if (el && document.activeElement !== el) {
                el.focus();
                // Move cursor to end
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(el);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }}
            style={{
              fontSize: 'inherit', color: 'inherit', textAlign: 'inherit',
              fontFamily: 'inherit', fontWeight: 'inherit', fontStyle: 'inherit',
              width: '100%', outline: 'none',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              minHeight: '1em', cursor: 'text'
            }}
            onClick={e => e.stopPropagation()}
          >
            {field.content}
          </div>
        ) : (
          <span 
            ref={contentRef} 
            style={{ 
                display: 'inline-block', 
                width: field.autoScale ? 'max-content' : '100%',
                whiteSpace: field.autoScale ? 'nowrap' : 'normal',
                textAlign: 'inherit'
            }}
          >
            {renderedContent}
          </span>
        )
      )}

      {isSelected && !editingFieldId && (
        <>
          <div className="field-handles"><Move size={10} className="field-move-icon" /></div>
          <div className="resizer-handle br" onMouseDown={e => onResizeMouseDown(e, field.id, localPos, localSize)} />
        </>
      )}
    </div>
  );
}
