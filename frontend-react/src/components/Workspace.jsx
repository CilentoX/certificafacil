import React from 'react';
import { Undo2, Redo2, ChevronLeft, ChevronRight } from 'lucide-react';

import CanvasEditor from './CanvasEditor';

const Workspace = () => {
  const mockFields = [
    { id: 1, content: 'Certificado de Conclusão', posX: 150, posY: 100, fontSize: 32, color: '#000000', align: 'center' },
    { id: 2, content: 'Certificamos que {nome} concluiu o curso com êxito.', posX: 100, posY: 200, fontSize: 18, color: '#333333', align: 'left' }
  ];

  return (
    <main className="workspace">
      <div className="canvas-container">
        <CanvasEditor templateImage={null} fields={mockFields} onFieldChange={()=>{}} onSelectField={()=>{}} />
      </div>

      <div className="bottombar">
        <div className="bb-left">
          <button className="tb-btn sm" title="Desfazer"><Undo2 size={16} /></button>
          <button className="tb-btn sm" title="Refazer"><Redo2 size={16} /></button>
        </div>
        <div className="bb-center">
          <button className="tb-btn sm"><ChevronLeft size={16} /></button>
          <span className="stu-nav">Participante 1 de 1</span>
          <button className="tb-btn sm"><ChevronRight size={16} /></button>
        </div>
        <div className="bb-right">
          <span className="info">X: 0 Y: 0</span>
          <span className="info">841 × 595 px</span>
        </div>
      </div>
    </main>
  );
};

export default Workspace;
