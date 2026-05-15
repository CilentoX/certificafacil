import { useCallback, useRef, useEffect, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import useEditorStore from '../../stores/editorStore';
import CanvasField from './CanvasField';

export default function EditorWorkspace({
  fileInputRef,
  setActivePanel,
  showGrid,
  snapToGrid,
  resolveContent,
  editingFieldId,
  setEditingFieldId,
  handleSave
}) {
  const canvasRef = useRef(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [fieldStart, setFieldStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [guides, setGuides] = useState({ x: null, y: null });

  const zoom = useEditorStore(s => s.zoom);
  const setZoom = useEditorStore(s => s.setZoom);
  const scale = zoom / 100;

  const storeCanvasSize = useEditorStore(s => s.canvasSize);
  const canvasSize = {
    w: typeof storeCanvasSize?.w === 'object' ? storeCanvasSize.w.w : (storeCanvasSize?.w || 841),
    h: typeof storeCanvasSize?.w === 'object' ? storeCanvasSize.w.h : (storeCanvasSize?.h || 595)
  };

  const templateImage = useEditorStore(s => s.templateImage);
  const fields = useEditorStore(s => s.fields);
  const selectedFieldId = useEditorStore(s => s.selectedFieldId);

  const addField = useEditorStore(s => s.addField);
  const updateField = useEditorStore(s => s.updateField);
  const removeField = useEditorStore(s => s.removeField);
  const selectField = useEditorStore(s => s.selectField);
  const deselectField = useEditorStore(s => s.deselectField);
  const commitField = useEditorStore(s => s.commitField);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);

  // ── Keyboard Hotkeys ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingFieldId) return;

      // Ignore if user is typing in an input/textarea or editing a field directly
      const activeElement = document.activeElement;
      if (activeElement) {
        const activeTag = activeElement.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || activeElement.isContentEditable) {
          return;
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFieldId) {
        e.preventDefault();
        removeField(selectedFieldId);
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          if (handleSave) handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldId, editingFieldId, removeField, undo, redo, handleSave]);

  // ── Drag-and-drop ──
  const onFieldMouseDown = (e, fieldId, localPos, localSize) => {
    e.stopPropagation();
    document.activeElement?.blur(); // Blur any focused input
    if (editingFieldId === fieldId) return;
    selectField(fieldId);
    setDragging(fieldId);
    setDragStart({ x: e.clientX, y: e.clientY });
    setFieldStart({ x: localPos.x, y: localPos.y, w: localSize.w, h: localSize.h });
    setGuides({ x: null, y: null });
  };

  const onResizeMouseDown = (e, fieldId, localPos, localSize) => {
    e.stopPropagation();
    e.preventDefault();
    document.activeElement?.blur(); // Blur any focused input
    selectField(fieldId);
    setResizing(fieldId);
    setDragStart({ x: e.clientX, y: e.clientY });
    setFieldStart({ x: localPos.x, y: localPos.y, w: localSize.w, h: localSize.h });
    setGuides({ x: null, y: null });
  };

  const onWorkspaceMouseMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setCursorPos({
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    });
  };

  const onMouseMove = useCallback((e) => {
    if (dragging) {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;
      
      let newX = fieldStart.x + dx;
      let newY = fieldStart.y + dy;
      
      let snapX = null;
      let snapY = null;
      const threshold = 5 / scale;

      if (snapToGrid) {
        newX = Math.round(newX / 10) * 10;
        newY = Math.round(newY / 10) * 10;
        snapX = newX;
        snapY = newY;
      } else {
        // Smart Alignment
        const centerX = newX + fieldStart.w / 2;
        const centerY = newY + fieldStart.h / 2;
        const rightX = newX + fieldStart.w;
        const bottomY = newY + fieldStart.h;

        for (const f of fields) {
          if (f.id === dragging) continue;
          
          // X alignment
          if (Math.abs(newX - f.posX) < threshold) { newX = f.posX; snapX = f.posX; }
          else if (Math.abs(centerX - (f.posX + f.width/2)) < threshold) { newX = f.posX + f.width/2 - fieldStart.w/2; snapX = f.posX + f.width/2; }
          else if (Math.abs(rightX - (f.posX + f.width)) < threshold) { newX = f.posX + f.width - fieldStart.w; snapX = f.posX + f.width; }
          
          // Y alignment
          if (Math.abs(newY - f.posY) < threshold) { newY = f.posY; snapY = f.posY; }
          else if (Math.abs(centerY - (f.posY + f.height/2)) < threshold) { newY = f.posY + f.height/2 - fieldStart.h/2; snapY = f.posY + f.height/2; }
          else if (Math.abs(bottomY - (f.posY + f.height)) < threshold) { newY = f.posY + f.height - fieldStart.h; snapY = f.posY + f.height; }
        }
      }

      setGuides({ x: snapX, y: snapY });

      updateField(dragging, {
        posX: Math.round(newX),
        posY: Math.round(newY),
      });
    } else if (resizing) {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;

      let newWidth = fieldStart.w + dx;
      let newHeight = fieldStart.h + dy;

      if (snapToGrid) {
        newWidth = Math.round(newWidth / 10) * 10;
        newHeight = Math.round(newHeight / 10) * 10;
      }

      const updates = { 
        width: Math.max(20, Math.round(newWidth)), 
        height: Math.max(20, Math.round(newHeight)) 
      };
      
      updateField(resizing, updates);
    }
  }, [dragging, resizing, dragStart, fieldStart, scale, updateField, snapToGrid, fields]);

  const onMouseUp = useCallback(() => {
    if (dragging || resizing) {
      commitField();
      setDragging(null);
      setResizing(null);
      setGuides({ x: null, y: null });
    }
  }, [dragging, resizing, commitField]);

  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [dragging, resizing, onMouseMove, onMouseUp]);

  // ── Zoom via scroll wheel ──
  const onCanvasWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(zoom + (e.deltaY < 0 ? 5 : -5));
    }
  }, [zoom, setZoom]);

  const onFieldDoubleClick = (e, fieldId) => {
    e.stopPropagation();
    setEditingFieldId(fieldId);
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);

  // ── Ruler Renderer ──
  const Ruler = ({ orientation, size, zoom }) => {
    const isH = orientation === 'horizontal';
    const zoomFactor = (zoom / 100);
    const step = zoom < 50 ? 100 : zoom < 100 ? 50 : 20;
    const ticks = [];
    
    for (let i = 0; i <= size; i += step) {
      const pos = i * zoomFactor;
      const isLarge = i % (step * 5) === 0;
      ticks.push(
        <line 
          key={`l-${i}`}
          x1={isH ? pos : (isLarge ? 0 : 15)} 
          y1={isH ? (isLarge ? 0 : 15) : pos}
          x2={isH ? pos : 25}
          y2={isH ? 25 : pos}
          stroke="#94a3b8"
          strokeWidth="1"
        />
      );
      if (isLarge && i > 0) {
        ticks.push(
          <text 
            key={`t-${i}`}
            x={isH ? pos + 2 : (isH ? 0 : 2)}
            y={isH ? 12 : pos + 10}
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
            textAnchor={isH ? "start" : "start"}
            transform={!isH ? `rotate(-90, 5, ${pos + 10})` : undefined}
          >
            {i}
          </text>
        );
      }
    }

    const currentPos = (isH ? cursorPos.x : cursorPos.y) * zoomFactor;

    return (
      <div 
        className={`ruler-${isH ? 'h' : 'v'}`} 
        style={{ 
          [isH ? 'width' : 'height']: `${size * zoomFactor}px`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <svg width={isH ? size * zoomFactor : 25} height={isH ? 25 : size * zoomFactor} style={{ display: 'block' }}>
          {ticks}
          <rect 
            x={isH ? currentPos - 1 : 0} y={isH ? 0 : currentPos - 1} 
            width={isH ? 2 : 25} height={isH ? 25 : 2} 
            fill="var(--primary)" style={{ opacity: 0.4 }}
          />
        </svg>
        <div className={`ruler-cursor-${isH ? 'v' : 'h'}`} style={{ [isH ? 'left' : 'top']: `${currentPos}px` }} />
      </div>
    );
  };

  return (
    <div className="editor-workspace" onWheel={onCanvasWheel} onMouseMove={onWorkspaceMouseMove}>
      <div className="ruler-container">
        <div className="ruler-corner"></div>
        <Ruler orientation="horizontal" size={canvasSize.w} zoom={zoom} />
        <Ruler orientation="vertical" size={canvasSize.h} zoom={zoom} />

        <div className="canvas-area" onClick={() => { deselectField(); setEditingFieldId(null); }}>
          <div className="canvas-viewport" ref={canvasRef}
            style={{ 
              width: canvasSize.w, 
              height: canvasSize.h, 
              transform: `scale(${scale})`, 
              transformOrigin: 'center center' 
            }}>
            
            {showGrid && <div className="canvas-grid" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />}

            {(dragging || resizing) && (
              <>
                {guides.y !== null && (
                  <div className="guide-line-h" style={{ top: guides.y }} />
                )}
                {guides.x !== null && (
                  <div className="guide-line-v" style={{ left: guides.x }} />
                )}
              </>
            )}

            {templateImage ? (
              <div className="canvas-page" onClick={e => e.stopPropagation()}>
                <img src={templateImage} alt="Template" draggable="false" className="canvas-img" />

                {fields.map(f => (
                  <CanvasField
                    key={f.id}
                    field={f}
                    selectedFieldId={selectedFieldId}
                    dragging={dragging}
                    resizing={resizing}
                    editingFieldId={editingFieldId}
                    scale={scale}
                    snapToGrid={snapToGrid}
                    onFieldMouseDown={onFieldMouseDown}
                    onResizeMouseDown={onResizeMouseDown}
                    onFieldDoubleClick={onFieldDoubleClick}
                    selectField={selectField}
                    updateField={updateField}
                    commitField={commitField}
                    setEditingFieldId={setEditingFieldId}
                    resolveContent={resolveContent}
                  />
                ))}
              </div>
            ) : (
              <div className="canvas-empty" onClick={e => e.stopPropagation()}>
                <div className="canvas-empty-icon"><FileText size={28} /></div>
                <h3>Nenhum template selecionado</h3>
                <p>Envie um PDF para começar a editar</p>
                <button className="btn btn-primary btn-sm mt-16"
                  onClick={() => { setActivePanel('templates'); fileInputRef.current?.click(); }}>
                  <UploadCloud size={14} /> Enviar Template
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
