import { User, Edit2, Save, Loader2, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfileSection({
  user,
  isEditing,
  setIsEditing,
  editName,
  setEditName,
  editPassword,
  setEditPassword,
  handleSaveProfile,
  saving
}) {
  const navigate = useNavigate();

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--primary)" /> Informações do Perfil
          </h3>
          {!isEditing ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>
              <Edit2 size={14} /> Editar
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setIsEditing(false); setEditName(user?.name); setEditPassword(''); }}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
              </button>
            </div>
          )}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="input-group">
            <label>Nome Completo</label>
            <input 
              className="input" 
              value={isEditing ? editName : (user?.name || '')} 
              onChange={e => setEditName(e.target.value)}
              readOnly={!isEditing} 
              style={{ background: isEditing ? 'var(--bg-input)' : 'transparent', border: isEditing ? '1px solid var(--border)' : '1px solid transparent' }}
            />
          </div>
          <div className="input-group">
            <label>E-mail Principal</label>
            <input className="input" value={user?.email || ''} readOnly style={{ opacity: 0.7 }} title="O e-mail não pode ser alterado" />
          </div>
          {isEditing && (
            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label>Nova Senha (opcional)</label>
              <input 
                type="password"
                className="input" 
                placeholder="Deixe em branco para não alterar"
                value={editPassword} 
                onChange={e => setEditPassword(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Crown size={18} color="var(--warning)" /> Plano & Assinatura
        </h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '1.2rem' }}>
                {(user?.role === 'admin' || user?.role === 'superadmin') ? 'Administrador' : (user?.plan?.name || 'Trial')}
              </strong>
              <span className="badge badge-primary">Ativo</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {(user?.role === 'admin' || user?.role === 'superadmin') ? (
                'Acesso ilimitado ao sistema.'
              ) : (
                `Seu plano atual permite até ${user?.plan?.maxTemplates || 2} projetos e ${user?.plan?.maxCerts || 5} certificados.`
              )}
            </p>
          </div>
          {user?.role !== 'admin' && user?.role !== 'superadmin' && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/#pricing')}>
              Fazer Upgrade
            </button>
          )}
        </div>
      </div>
    </>
  );
}
