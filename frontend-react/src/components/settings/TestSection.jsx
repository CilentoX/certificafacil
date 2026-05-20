import { Zap, Loader2 } from 'lucide-react';

export default function TestSection({
  testPhone,
  setTestPhone,
  handleTestWpp,
  testingWpp,
  status,
  testEmail,
  setTestEmail,
  handleTestEmail,
  testingEmail,
  smtpMode
}) {
  return (
    <div className="card">
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Zap size={18} color="var(--primary)" /> Testar Integrações
      </h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Envie mensagens de teste para confirmar que suas conexões estão configuradas corretamente.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Teste WhatsApp */}
        <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>WhatsApp (com DDD)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              className="input" 
              placeholder="11999999999" 
              value={testPhone} 
              onChange={e => setTestPhone(e.target.value)} 
              style={{ fontSize: '0.85rem', padding: '8px 12px' }}
            />
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleTestWpp} 
              disabled={testingWpp || status !== 'ready'}
              style={{ minWidth: '100px' }}
            >
              {testingWpp ? <Loader2 size={14} className="animate-spin" /> : 'Testar'}
            </button>
          </div>
          {status !== 'ready' && (
            <p style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: '6px' }}>Conecte o WhatsApp primeiro.</p>
          )}
        </div>

        {/* Teste Email */}
        <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>E-mail de Destino</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              className="input" 
              placeholder="seu@email.com" 
              value={testEmail} 
              onChange={e => setTestEmail(e.target.value)} 
              style={{ fontSize: '0.85rem', padding: '8px 12px' }}
            />
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleTestEmail} 
              disabled={testingEmail}
              style={{ minWidth: '100px' }}
            >
              {testingEmail ? <Loader2 size={14} className="animate-spin" /> : 'Testar'}
            </button>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '6px' }}>Envia via {smtpMode === 'custom' ? 'SMTP Custom' : 'Brevo'}.</p>
        </div>
      </div>
    </div>
  );
}
