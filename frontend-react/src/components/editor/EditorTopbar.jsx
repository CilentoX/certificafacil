import { useNavigate } from 'react-router-dom';
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Users, Grid3X3, Magnet,
  Keyboard, Save, Download, Loader2, Cloud
} from 'lucide-react';
import useEditorStore from '../../stores/editorStore';
import useAuthStore from '../../stores/authStore';

export default function EditorTopbar({ 
  viewRealData, setViewRealData, 
  showGrid, setShowGrid, 
  snapToGrid, setSnapToGrid, 
  showShortcuts, setShowShortcuts,
  handleSave, saving, 
  setShowBatchModal 
}) {
  const navigate = useNavigate();
  const projectName = useEditorStore(s => s.projectName);
  const setProjectName = useEditorStore(s => s.setProjectName);
  const undo = useEditorStore(s => s.undo);
  const redo = useEditorStore(s => s.redo);
  const canUndo = useEditorStore(s => s.canUndo);
  const canRedo = useEditorStore(s => s.canRedo);
  const zoom = useEditorStore(s => s.zoom);
  const zoomIn = useEditorStore(s => s.zoomIn);
  const zoomOut = useEditorStore(s => s.zoomOut);
  const setZoom = useEditorStore(s => s.setZoom);

  const { user } = useAuthStore();
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <header className="editor-topbar">
      <div className="editor-topbar-left">
        <div className="logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <span className="logo-icon">C</span>
          <span className="logo-text">CertificaFacil</span>
        </div>
        <div className="topbar-sep" />
        <div className="project-name-group">
          <input 
            className="topbar-name-input" 
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)} 
            placeholder="Nome do projeto..."
          />
        </div>
      </div>

      <div className="editor-topbar-center">
        <div className="topbar-control-group">
          <button className="btn btn-icon btn-sm btn-ghost" onClick={undo} disabled={!canUndo()} title="Desfazer (Ctrl+Z)">
            <Undo2 size={16} />
          </button>
          <button className="btn btn-icon btn-sm btn-ghost" onClick={redo} disabled={!canRedo()} title="Refazer (Ctrl+Y)">
            <Redo2 size={16} />
          </button>
        </div>
        
        <div className="topbar-sep" />
        
        <div className="topbar-control-group">
          <button className="btn btn-icon btn-sm btn-ghost" onClick={zoomOut} title="Zoom -"><ZoomOut size={16} /></button>
          <span className="zoom-label">{zoom}%</span>
          <button className="btn btn-icon btn-sm btn-ghost" onClick={zoomIn} title="Zoom +"><ZoomIn size={16} /></button>
          <div className="zoom-presets">
             <button className="btn-xs btn-ghost" onClick={() => setZoom(100)}>100%</button>
             <button className="btn-xs btn-ghost" onClick={() => setZoom(50)}>50%</button>
          </div>
        </div>

        <div className="topbar-sep" />

        <div className="topbar-control-group">
          <button 
            className={`btn btn-icon btn-sm ${viewRealData ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewRealData(!viewRealData)}
            title={viewRealData ? 'Ver Variáveis' : 'Visualizar Dados Reais'}
          >
            <Users size={16} />
          </button>
          <button className={`btn btn-icon btn-sm ${showGrid ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setShowGrid(!showGrid)} title="Grade (G)">
            <Grid3X3 size={16} />
          </button>
          <button className={`btn btn-icon btn-sm ${snapToGrid ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setSnapToGrid(!snapToGrid)} title="Snap (M)">
            <Magnet size={16} />
          </button>
        </div>
      </div>

      <div className="editor-topbar-right">
        <button className="btn btn-icon btn-sm btn-ghost" onClick={() => setShowShortcuts(!showShortcuts)} title="Atalhos">
          <Keyboard size={16} />
        </button>
        <div className="topbar-sep" />
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: saving ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
            <span>{saving ? 'Salvando...' : 'Salvo na nuvem'}</span>
          </div>
          <button className="btn btn-premium btn-sm" onClick={() => setShowBatchModal(true)}>
            <Download size={14} /> 
            <span>Gerar Certificados</span>
          </button>
        </div>
        <div className="topbar-sep" />
        <div className="user-profile-lite" onClick={() => navigate('/dashboard')}>
          <div className="avatar">{initials}</div>
        </div>
      </div>
    </header>
  );
}
