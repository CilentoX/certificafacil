import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function EditorSidebar({ activePanel, setActivePanel, NAV }) {
  const navigate = useNavigate();

  return (
    <nav className="editor-sidebar">
      <div className="sb-groups">
        <div className="sb-group">
          {NAV.map(n => (
            <button 
              key={n.id} 
              className={`sb-btn ${activePanel === n.id ? 'active' : ''}`}
              onClick={() => setActivePanel(n.id)} 
            >
              <n.icon size={20} strokeWidth={activePanel === n.id ? 2.5 : 2} />
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="sb-footer">
        <button className="sb-btn" onClick={() => navigate('/dashboard')} title="Dashboard">
          <Home size={20} />
          <span>Início</span>
        </button>
      </div>
    </nav>
  );
}
