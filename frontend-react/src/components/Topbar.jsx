import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Grid3X3, Ruler, Magnet, Save, Download, ChevronDown } from 'lucide-react';

const Topbar = () => {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="logo-placeholder">CertificaFacil</div>
        <div className="topbar-sep"></div>
        <span className="topbar-file">Projeto Sem Título</span>
      </div>
      
      <div className="topbar-center">
        <button className="tb-btn" title="Zoom -"><ZoomOut size={18} /></button>
        <button className="tb-btn zoom-lbl"><span>100</span>%</button>
        <button className="tb-btn" title="Zoom +"><ZoomIn size={18} /></button>
        <button className="tb-btn" title="Fit to Screen"><Maximize2 size={18} /></button>
      </div>

      <div className="topbar-right">
        <span className="status-indicator online">
          <span className="dot"></span> Online
        </span>
        <div className="topbar-sep"></div>
        
        <button className="tb-btn" title="Grade"><Grid3X3 size={18} /></button>
        <button className="tb-btn" title="Réguas"><Ruler size={18} /></button>
        <button className="tb-btn" title="Snap à grade"><Magnet size={18} /></button>
        
        <div className="topbar-sep"></div>
        
        <button className="btn-secondary">
          <Save size={16} /> Salvar
        </button>
        <button className="btn-primary">
          <Download size={16} /> Gerar Lote
        </button>
        
        <div className="topbar-sep"></div>
        
        <div className="user-menu-trigger">
          <div className="avatar">A</div>
          <span>Admin</span>
          <ChevronDown size={14} />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
