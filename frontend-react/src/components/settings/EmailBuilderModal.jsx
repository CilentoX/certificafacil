import { Mail, X, Save, Loader2 } from 'lucide-react';

export default function EmailBuilderModal({
  show,
  onClose,
  emailGreeting,
  setEmailGreeting,
  emailBody,
  setEmailBody,
  emailBtnText,
  setEmailBtnText,
  emailColor,
  setEmailColor,
  emailFooter,
  setEmailFooter,
  handleSaveProfile,
  saving
}) {
  if (!show) return null;

  return (
    <div className="shortcuts-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px', width: '860px', maxWidth: '94vw', maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={20} color="#6366f1" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Email Template Builder</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monte o e-mail que acompanha cada certificado</p>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        {/* Body */}
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Editor side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)' }}>✏️ Campos do E-mail</h4>
            <div className="input-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '3px' }}>Saudação</label>
              <input className="input" value={emailGreeting} onChange={e => setEmailGreeting(e.target.value)} placeholder="Parabéns, {nome}!" style={{ fontSize: '0.9rem', padding: '10px 12px' }} />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '3px' }}>Mensagem principal</label>
              <textarea className="input" rows="3" value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Seu certificado do curso {curso} está em anexo..." style={{ fontSize: '0.9rem', padding: '10px 12px', resize: 'vertical', lineHeight: 1.6 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '3px' }}>Texto do Botão</label>
                <input className="input" value={emailBtnText} onChange={e => setEmailBtnText(e.target.value)} placeholder="Validar Certificado" style={{ fontSize: '0.9rem', padding: '10px 12px' }} />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '3px' }}>Cor principal</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="color" value={emailColor} onChange={e => setEmailColor(e.target.value)} style={{ width: '40px', height: '40px', border: '2px solid var(--border)', borderRadius: '8px', cursor: 'pointer', padding: '2px', background: 'var(--bg-input)' }} />
                  <input className="input" value={emailColor} onChange={e => setEmailColor(e.target.value)} style={{ fontSize: '0.85rem', padding: '10px 12px', flex: 1 }} />
                </div>
              </div>
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '3px' }}>Rodapé</label>
              <input className="input" value={emailFooter} onChange={e => setEmailFooter(e.target.value)} placeholder="© 2026 CertificaFacil" style={{ fontSize: '0.9rem', padding: '10px 12px' }} />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['{nome}', '{curso}', '{link}'].map(v => (
                <span key={v} style={{ fontSize: '0.72rem', background: 'var(--bg-input)', padding: '3px 8px', borderRadius: '4px', color: 'var(--text-muted)' }}>{v}</span>
              ))}
            </div>
          </div>
          {/* Preview side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)' }}>👁️ Pré-visualização</h4>
            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', flex: 1 }}>
              <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginLeft: '8px' }}>Inbox — certificafacil@email.com</span>
              </div>
              <div style={{ background: '#f4f4f5', padding: '16px' }}>
                <div style={{ background: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  <div style={{ background: emailColor, padding: '20px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>🎓 CertificaFacil</div>
                  </div>
                  <div style={{ padding: '24px', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>
                      {(emailGreeting || 'Parabéns, {nome}!').replace(/{nome}/g, 'Lucas Cilento').replace(/{curso}/g, 'Design UI/UX')}
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.6, margin: '0 0 20px' }}>
                      {(emailBody || 'Seu certificado...').replace(/{nome}/g, 'Lucas Cilento').replace(/{curso}/g, 'Design UI/UX').replace(/{link}/g, 'certificafacil.com/v/ABCD')}
                    </p>
                    <div style={{ display: 'inline-block', background: emailColor, color: '#fff', padding: '10px 28px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                      {emailBtnText || 'Validar Certificado'}
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#999', margin: '16px 0 0 0' }}>📎 <em>Certificado_Lucas_Cilento.pdf</em> em anexo</p>
                  </div>
                  <div style={{ borderTop: '1px solid #eee', padding: '12px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.68rem', color: '#aaa', margin: 0 }}>{emailFooter || '© 2026 CertificaFacil'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={() => { handleSaveProfile(); onClose(); }} disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar Template</>}
          </button>
        </div>
      </div>
    </div>
  );
}
