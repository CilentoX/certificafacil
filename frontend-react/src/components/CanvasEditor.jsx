import React, { useState, useRef, useEffect } from 'react';

const CanvasEditor = ({ templateImage, fields, onFieldChange, onSelectField, zoom = 100 }) => {
  const containerRef = useRef(null);
  const scale = zoom / 100;

  const handleDrag = (id, e) => {
    // A simplified drag handler for illustration
  };

  return (
    <div className="canvas-container" style={{ 
      transform: `scale(${scale})`, 
      transformOrigin: 'top left',
      transition: 'transform 0.1s ease-out'
    }}>
      <div className="canvas-wrapper" ref={containerRef} style={{ position: 'relative' }}>
        {templateImage ? (
          <img src={templateImage} alt="Template" className="cert-preview" draggable="false" style={{ display: 'block' }} />
        ) : (
          <div className="empty-state" style={{ width: 842, height: 595, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', border: '2px dashed #ccc' }}>
            <h3>Nenhum template selecionado</h3>
            <p>Selecione ou envie um template PDF para começar a editar</p>
          </div>
        )}

        {templateImage && fields.map((field) => (
          <div
            key={field.id}
            className="draggable-field"
            style={{
              left: `${field.posX}px`,
              top: `${field.posY}px`,
              fontSize: `${field.fontSize}px`,
              color: field.color,
              textAlign: field.align,
              position: 'absolute',
              transform: `rotate(${field.rotation || 0}deg)`,
              opacity: (field.opacity || 100) / 100,
              cursor: 'move',
              border: '1px dashed transparent',
              whiteSpace: 'nowrap',
              pointerEvents: 'auto'
            }}
            onClick={() => onSelectField(field.id)}
            onMouseDown={(e) => handleDrag(field.id, e)}
          >
            {field.content.includes('{nome}') ? '{Nome do Participante}' : field.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CanvasEditor;
