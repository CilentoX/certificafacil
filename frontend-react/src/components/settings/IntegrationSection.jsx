import { Layout, MessageSquare, Smartphone, RefreshCw, Zap, CheckCircle, AlertTriangle, Mail, Server, Edit2, EyeOff, Eye, Loader2, Save } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function IntegrationSection({
  status,
  loading,
  qrCode,
  wppInfo,
  connectWpp,
  disconnectWpp,
  smtpMode,
  setSmtpMode,
  smtpHost,
  setSmtpHost,
  smtpPort,
  setSmtpPort,
  smtpUser,
  setSmtpUser,
  smtpPass,
  setSmtpPass,
  smtpSecure,
  setSmtpSecure,
  smtpSenderEmail,
  setSmtpSenderEmail,
  smtpSenderName,
  setSmtpSenderName,
  smtpStatus,
  testSmtpConnection,
  smtpTesting,
  saving,
  handleSaveProfile,
  showSmtpPass,
  setShowSmtpPass,
  testEmail
}) {
  return (
    <div className="card">
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Layout size={18} color="var(--primary)" /> Integrações & Conexões
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Canal WhatsApp */}
        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ background: 'rgba(37, 211, 102, 0.05)', padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <MessageSquare size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontWeight: 'bold', fontSize: '1rem' }}>WhatsApp Bot</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Envios automáticos via Baileys</p>
            </div>
            <span style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
              background: status === 'ready' || status === 'authenticated' ? 'rgba(16,185,129,0.15)' : status === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
              color: status === 'ready' || status === 'authenticated' ? '#34d399' : status === 'error' ? '#ef4444' : 'var(--text-muted)'
            }}>
              {status === 'ready' || status === 'authenticated' ? '● Online' : status === 'loading' || status === 'qr' ? '◌ Conectando' : status === 'error' ? '● Erro' : '○ Offline'}
            </span>
          </div>

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'var(--bg-input)', minHeight: '280px', justifyContent: 'center' }}>
            {status === 'disconnected' && (
              <>
                <Smartphone size={40} style={{ color: 'var(--text-dim)', marginBottom: '16px' }} />
                <h4 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '0.95rem' }}>Instância Desconectada</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Conecte seu WhatsApp para enviar certificados automaticamente via mensagem.</p>
                <button className="btn btn-primary btn-sm" onClick={connectWpp} disabled={loading}>
                  {loading ? <><RefreshCw className="spin-slow" size={14} /> Iniciando...</> : <><Zap size={14} /> Conectar Agora</>}
                </button>
              </>
            )}

            {status === 'loading' && (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 <RefreshCw size={36} className="spin-slow" style={{ color: 'var(--primary)', marginBottom: '16px' }} />
                 <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>Iniciando sessão...</span>
                 <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>Pode levar até 40s no servidor</p>
               </div>
            )}

            {status === 'qr' && (
              <>
                <div style={{ background: 'white', padding: '12px', border: '4px solid white', borderRadius: '12px', marginBottom: '12px', boxShadow: 'var(--shadow-sm)' }}>
                  {qrCode ? <QRCodeSVG value={qrCode} size={150} /> : <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw className="spin-slow" /></div>}
                </div>
                <h4 style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px' }}>Escaneie o QR Code</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aparelhos Conectados {'→'} Conectar</p>
              </>
            )}

            {(status === 'authenticated' || status === 'ready') && (
              <>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '16px' }}>
                  <CheckCircle size={28} />
                </div>
                <h4 style={{ fontWeight: 'bold', marginBottom: '4px', color: '#34d399', fontSize: '0.95rem' }}>Dispositivo Conectado</h4>

                {wppInfo && (
                  <div style={{ width: '100%', margin: '12px 0', padding: '12px', borderRadius: '8px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', textAlign: 'left' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome</span>
                        <p style={{ fontWeight: 600, marginTop: '2px' }}>{wppInfo.pushName || '—'}</p>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Número</span>
                        <p style={{ fontWeight: 600, marginTop: '2px' }}>+{wppInfo.phone || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {!wppInfo && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Mensagens automáticas liberadas.</p>
                )}

                <button className="btn btn-danger btn-sm" onClick={disconnectWpp} style={{ marginTop: '8px' }}>
                  Desconectar Sessão
                </button>
              </>
            )}

            {status === 'error' && (
              <>
                <AlertTriangle size={40} style={{ color: '#ef4444', marginBottom: '16px' }} />
                <h4 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '0.95rem' }}>Erro no Serviço</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Falha ao iniciar o backend do bot.</p>
                <button className="btn btn-secondary btn-sm" onClick={connectWpp}>Tentar Novamente</button>
              </>
            )}
          </div>
        </div>

        {/* Canal Email / SMTP */}
        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Mail size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontWeight: 'bold', fontSize: '1rem' }}>Servidor de E-mail</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{smtpMode === 'custom' ? 'SMTP Customizado' : 'Padrão do Sistema (Brevo)'}</p>
            </div>
            {smtpMode === 'custom' && smtpStatus === 'ok' && (
              <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                ● Verificado
              </span>
            )}
            {smtpMode === 'default' && (
              <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
                ● Ativo
              </span>
            )}
          </div>

          <div style={{ padding: '20px', background: 'var(--bg-input)' }}>
            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                className={`btn btn-sm ${smtpMode === 'default' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSmtpMode('default')}
                style={{ flex: 1, fontSize: '0.8rem' }}
              >
                <Server size={14} /> Padrão (Brevo)
              </button>
              <button
                className={`btn btn-sm ${smtpMode === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSmtpMode('custom')}
                style={{ flex: 1, fontSize: '0.8rem' }}
              >
                <Edit2 size={14} /> SMTP Próprio
              </button>
            </div>

            {smtpMode === 'default' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', margin: '0 auto 12px' }}>
                  <CheckCircle size={24} />
                </div>
                <h4 style={{ fontWeight: 'bold', marginBottom: '6px', color: '#60a5fa', fontSize: '0.9rem' }}>API Brevo Conectada</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Remetente: <strong>certificafacil@cilentox.space</strong>
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                  Para alterar, edite as variáveis <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '3px' }}>BREVO_*</code> no <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '3px' }}>.env</code> do servidor.
                </p>
              </div>
            )}

            {smtpMode === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Host SMTP</label>
                    <input className="input" placeholder="smtp.gmail.com" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} style={{ fontSize: '0.85rem', padding: '8px 10px' }} />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Porta</label>
                    <input className="input" placeholder="587" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} style={{ fontSize: '0.85rem', padding: '8px 10px' }} />
                  </div>
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Usuário / Login</label>
                  <input className="input" placeholder="seu@email.com" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} style={{ fontSize: '0.85rem', padding: '8px 10px' }} />
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Senha / App Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" type={showSmtpPass ? 'text' : 'password'} placeholder="••••••••" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} style={{ fontSize: '0.85rem', padding: '8px 10px', paddingRight: '36px' }} />
                    <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px' }}>
                      {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>E-mail Remetente</label>
                    <input className="input" placeholder="noreply@suaempresa.com" value={smtpSenderEmail} onChange={e => setSmtpSenderEmail(e.target.value)} style={{ fontSize: '0.85rem', padding: '8px 10px' }} />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Nome Remetente</label>
                    <input className="input" placeholder="CertificaFacil" value={smtpSenderName} onChange={e => setSmtpSenderName(e.target.value)} style={{ fontSize: '0.85rem', padding: '8px 10px' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <input type="checkbox" id="smtp-secure" checked={smtpSecure} onChange={e => setSmtpSecure(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                  <label htmlFor="smtp-secure" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Usar SSL/TLS (porta 465)</label>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={testSmtpConnection} disabled={smtpTesting} style={{ flex: 1 }}>
                    {smtpTesting ? <><Loader2 size={14} className="animate-spin" /> Testando...</> : <><Zap size={14} /> Testar Conexão</>}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveProfile} disabled={saving} style={{ flex: 1 }}>
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar SMTP</>}
                  </button>
                </div>

                {smtpStatus === 'ok' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#34d399' }}>
                      <CheckCircle size={14} /> Conexão SMTP verificada com sucesso
                    </div>
                    {testEmail && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>Um e-mail de teste real foi enviado para <strong>{testEmail}</strong></p>}
                  </div>
                )}
                {smtpStatus === 'error' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.78rem', color: '#ef4444', marginTop: '4px' }}>
                    <AlertTriangle size={14} /> Falha na conexão — verifique as credenciais
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
