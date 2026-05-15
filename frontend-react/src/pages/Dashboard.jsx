import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  PenTool, Plus, LogOut, Award, Clock, TrendingUp, 
  FileText, Users, Crown, Trash2, Calendar, Layout, Loader2,
  Home, MessageSquare, Settings, Sparkles, Copy
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import Api from '../services/api';
import { useToast } from '../components/ToastContainer';

export default function Dashboard() {
  const { user, logout, initialize } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    initialize(); 
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await Api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (e, uid) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    
    try {
      await Api.deleteProject(uid);
      setProjects(projects.filter(p => p.uid !== uid));
      toast.success('Projeto excluído!');
    } catch (err) {
      toast.error('Erro ao excluir: ' + err.message);
    }
  };

  const handleDuplicateProject = async (e, uid) => {
    e.stopPropagation();
    try {
      const newProject = await Api.duplicateProject(uid);
      setProjects([newProject, ...projects]);
      toast.success('Projeto duplicado com sucesso!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const trialEnd = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const trialDays = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / (86400000))) : null;

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="logo" onClick={() => navigate('/')}>
          <Sparkles size={18} style={{ marginRight: '8px' }} />
          CertificaFacil
        </div>
        <div className="dash-header-right">
          {user?.plan?.slug === 'trial' && trialDays !== null && user?.role !== 'admin' && user?.role !== 'superadmin' && (
            <div className="badge badge-warning">
              <Clock size={12} /> {trialDays} dias restantes
            </div>
          )}
          <div className="user-pill">
            <div className="avatar">{initials}</div>
            <span>{user?.name || 'Usuário'}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="dash-content">
        <div className="dash-welcome" style={{ marginBottom: '32px' }}>
          <h2>Olá, {user?.name?.split(' ')[0] || 'Usuário'}! 👋</h2>
          <p>Gerencie seus certificados e templates de forma rápida e fácil.</p>
        </div>

        <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px', alignItems: 'start' }}>
          <div className="dash-sidebar-nav">
            <button className="nav-item active">
              <Home size={18} /> Dashboard
            </button>
            <button className="nav-item" onClick={() => navigate('/editor')}>
              <PenTool size={18} /> Editor de Design
            </button>
            <button className="nav-item" onClick={() => navigate('/settings')}>
              <Settings size={18} /> Configurações
            </button>
            <div className="sidebar-divider"></div>
            <div className="sidebar-premium-box">
              <Crown size={20} color="var(--warning)" />
              <p>Deseja mais recursos?</p>
              <button className="btn btn-primary btn-sm w-full mt-8" onClick={() => navigate('/#pricing')}>Upgrade</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Stats no topo da área de conteúdo */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '0' }}>
              <div className="stat-card">
                <div className="stat-label">Emitidos (Total)</div>
                <div className="stat-value">{user?.stats?.certificates || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Últimos 7 dias</div>
                <div className="stat-value" style={{ color: 'var(--primary)' }}>+{user?.stats?.recentCertificates || 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Projetos</div>
                <div className="stat-value">{projects.length} / {user?.plan?.maxTemplates || 2}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Plano</div>
                <div className="stat-value" style={{ fontSize: '1rem' }}>{user?.plan?.name || 'Trial'}</div>
              </div>
            </div>

            <div className="dash-section" style={{ marginTop: 0 }}>
              <div className="section-header">
                <h3>Meus Projetos Recentes</h3>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/editor')}>
                  <Plus size={16} /> Novo Projeto
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                  <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
                  <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Sincronizando seus projetos...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="card empty-state">
                  <Layout size={48} />
                  <h4>Nenhum projeto ainda</h4>
                  <p>Comece criando seu primeiro design de certificado.</p>
                  <button className="btn btn-primary mt-16" onClick={() => navigate('/editor')}>
                    Criar Agora
                  </button>
                </div>
              ) : (
                <div className="project-grid">
                  {projects.map(p => (
                    <div key={p.uid} className="project-card" onClick={() => navigate(`/editor/${p.uid}`)}>
                      <div className="project-thumb">
                        <FileText size={32} />
                      </div>
                      <div className="project-info">
                        <div className="project-meta">
                          <strong>{p.name}</strong>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn-delete" style={{ color: 'var(--primary)' }} onClick={(e) => handleDuplicateProject(e, p.uid)} title="Duplicar Projeto">
                              <Copy size={14} />
                            </button>
                            <button className="btn-delete" onClick={(e) => handleDeleteProject(e, p.uid)} title="Excluir Projeto">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="project-date">
                          <Calendar size={12} /> {new Date(p.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plan upgrade CTA */}
        {user?.plan?.slug === 'trial' && user?.role !== 'admin' && user?.role !== 'superadmin' && (
          <div className="upgrade-banner" style={{ marginTop: '40px' }}>
            <div>
              <strong>🚀 Faça upgrade do seu plano</strong>
              <p>Desbloqueie mais certificados, templates e fontes personalizadas.</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/#pricing')}>
              Ver Planos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
