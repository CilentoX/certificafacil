import { MessageSquare, X, Save, Loader2 } from 'lucide-react';

export default function WhatsappBuilderModal({
  show,
  onClose,
  editWhatsappTemplate,
  setEditWhatsappTemplate,
  handleSaveProfile,
  saving,
  renderWhatsAppPreview
}) {
  if (!show) return null;

  return (
    <div className="shortcuts-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px', width: '720px', maxWidth: '94vw', maxHeight: '85vh', overflow: 'auto', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37,211,102,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={20} color="#25D366" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>WhatsApp Template Builder</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configure a mensagem enviada junto com o certificado</p>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        {/* Body */}
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Editor side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)' }}>✏️ Mensagem</h4>
            <textarea
              className="input"
              rows="8"
              value={editWhatsappTemplate}
              onChange={e => setEditWhatsappTemplate(e.target.value)}
              placeholder="Olá {nome}, seu certificado do curso {curso} está pronto! Acesse: {link}"
              style={{ fontSize: '0.9rem', padding: '12px', resize: 'vertical', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['{nome}', '{curso}', '{link}'].map(v => (
                <button key={v} className="btn btn-sm btn-ghost" onClick={() => setEditWhatsappTemplate(prev => prev + ' ' + v)}
                  style={{ fontSize: '0.75rem', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px' }}>
                  + {v}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
              💡 Use as variáveis acima para personalizar a mensagem automaticamente para cada participante.
            </p>
          </div>
          {/* Preview side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)' }}>📱 Pré-visualização</h4>
            <div style={{ background: '#0b141a', borderRadius: '16px', padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '280px', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h200v200H0z\' fill=\'%230b141a\'/%3E%3Cpath d=\'M0 0h100v100H0zM100 100h100v100H100z\' fill=\'%230d1a22\' fill-opacity=\'.3\'/%3E%3C/svg%3E")', backgroundSize: '30px' }}>
              {/* Chat bubble */}
              <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                <div style={{ 
                  background: '#005C4B', 
                  color: '#e9edef', 
                  padding: '8px 12px', 
                  borderRadius: '8px 0 8px 8px', 
                  fontSize: '0.82rem', 
                  lineHeight: 1.6, 
                  position: 'relative', 
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
                }}
                dangerouslySetInnerHTML={{ __html: renderWhatsAppPreview(editWhatsappTemplate) }}
                />
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', textAlign: 'right', marginTop: '4px' }}>
                  16:35 ✓✓
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm" onClick={() => { handleSaveProfile(); onClose(); }} disabled={saving}
            style={{ background: '#25D366', color: '#fff', fontWeight: 600, border: 'none' }}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar Template</>}
          </button>
        </div>
      </div>
    </div>
  );
}
