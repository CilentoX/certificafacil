import { Send, MessageSquare, Edit2, Mail, Palette } from 'lucide-react';

export default function TemplatesSection({
  setShowWhatsappBuilder,
  setShowEmailBuilder,
  editWhatsappTemplate,
  emailGreeting,
  emailBody,
  emailColor
}) {
  return (
    <div className="card">
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Send size={18} color="var(--primary)" /> Modelos de Envio
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* WhatsApp Card */}
        <div onClick={() => setShowWhatsappBuilder(true)} style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(37,211,102,0.25)', background: 'rgba(37,211,102,0.04)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,211,102,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(37,211,102,0.25)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37,211,102,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={18} color="#25D366" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>WhatsApp</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mensagem de entrega</div>
            </div>
          </div>
          <div style={{ background: '#DCF8C6', color: '#000', padding: '8px 12px', borderRadius: '0 10px 10px 10px', fontSize: '0.75rem', lineHeight: 1.5, maxHeight: '52px', overflow: 'hidden' }}>
            {(editWhatsappTemplate || 'Olá {nome}...').slice(0, 80)}{editWhatsappTemplate.length > 80 ? '...' : ''}
          </div>
          <button className="btn btn-sm" style={{ marginTop: '12px', width: '100%', background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)', fontWeight: 600 }}>
            <Edit2 size={13} /> Editar Template
          </button>
        </div>
        {/* Email Card */}
        <div onClick={() => setShowEmailBuilder(true)} style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.04)', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={18} color="#6366f1" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>E-mail</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Template visual</div>
            </div>
          </div>
          <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div style={{ background: emailColor, padding: '6px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: '#fff', fontWeight: 600 }}>🎓 CertificaFacil</span>
            </div>
            <div style={{ background: '#fff', padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#1a1a2e', fontWeight: 600 }}>{emailGreeting.slice(0, 30)}</div>
              <div style={{ fontSize: '0.6rem', color: '#888', marginTop: '2px' }}>{emailBody.slice(0, 40)}...</div>
            </div>
          </div>
          <button className="btn btn-sm" style={{ marginTop: '12px', width: '100%', background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)', fontWeight: 600 }}>
            <Palette size={13} /> Editar Template
          </button>
        </div>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '16px', textAlign: 'center' }}>
        Variáveis: <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>{'{nome}'}</code> · <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>{'{curso}'}</code> · <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>{'{link}'}</code>
      </p>
    </div>
  );
}
