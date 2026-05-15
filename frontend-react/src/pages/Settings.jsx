import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Home, Settings as SettingsIcon, PenTool, Layout, LogOut, User, Mail, Shield, Crown, Copy, CheckCircle, Save, Loader2, Edit2, MessageSquare, Smartphone, RefreshCw, AlertTriangle, Server, Eye, EyeOff, Zap, X, Palette, Send } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/ToastContainer';
import Api from '../services/api';

export default function Settings() {
  const { user, logout, initialize } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editWhatsappTemplate, setEditWhatsappTemplate] = useState('');
  const [editEmailTemplate, setEditEmailTemplate] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal states
  const [showEmailBuilder, setShowEmailBuilder] = useState(false);
  const [showWhatsappBuilder, setShowWhatsappBuilder] = useState(false);

  // Integrations state
  const [status, setStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [wppInfo, setWppInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // SMTP config state
  const [smtpMode, setSmtpMode] = useState('default');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpSenderEmail, setSmtpSenderEmail] = useState('');
  const [smtpSenderName, setSmtpSenderName] = useState('');
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  // Email visual builder state
  const [emailGreeting, setEmailGreeting] = useState('Parabéns, {nome}!');
  const [emailBody, setEmailBody] = useState('Seu certificado do curso {curso} foi gerado e está em anexo neste e-mail. Você também pode validá-lo clicando no botão abaixo.');
  const [emailBtnText, setEmailBtnText] = useState('Validar Certificado');
  const [emailColor, setEmailColor] = useState('#6366f1');
  const [emailFooter, setEmailFooter] = useState('© 2026 CertificaFacil — Todos os direitos reservados.');

  // Test deliveries state
  const [testPhone, setTestPhone] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testingWpp, setTestingWpp] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  // Build HTML template from visual builder fields
  const buildEmailHtml = () => {
    return `<div style="font-family:'Open Sans',Arial,sans-serif;background:#f4f4f5;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:${emailColor};padding:24px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#fff;">🎓 CertificaFacil</div>
    </div>
    <div style="padding:32px 24px;text-align:center;">
      <h2 style="font-size:18px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">${emailGreeting}</h2>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;">${emailBody}</p>
      <a href="{link}" style="display:inline-block;background:${emailColor};color:#fff;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">${emailBtnText}</a>
      <p style="font-size:12px;color:#999;margin-top:20px;">📎 O certificado em PDF está em anexo neste e-mail.</p>
    </div>
    <div style="border-top:1px solid #eee;padding:16px 24px;text-align:center;">
      <p style="font-size:11px;color:#aaa;margin:0;">${emailFooter}</p>
    </div>
  </div>
</div>`;
  };

  const renderWhatsAppPreview = (text) => {
    if (!text) return 'Olá {nome}, seu certificado está pronto! Acesse: {link}';
    
    let formatted = text
      .replace(/{nome}/g, 'Iago de Rezende Veras')
      .replace(/{link}/g, 'certificafacil.com/v/ETIC-2026')
      .replace(/{curso}/g, 'Desenvolvimento Web');

    // Escape HTML basic
    let safeText = formatted
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // Bold: *text*
    safeText = safeText.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    
    // Italic: _text_
    safeText = safeText.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Strike: ~text~
    safeText = safeText.replace(/~(.*?)~/g, '<del>$1</del>');

    // Blockquote: lines starting with >
    safeText = safeText.split('\n').map(line => {
      if (line.trim().startsWith('&gt;')) {
        return `<div style="border-left: 3px solid rgba(255,255,255,0.3); padding: 4px 12px; margin: 6px 0; color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.05); border-radius: 4px; font-style: italic;">${line.trim().substring(4).trim()}</div>`;
      }
      return line;
    }).join('\n');

    return safeText;
  };

  const fetchStatus = async () => {
    try {
      const data = await Api.getWhatsappStatus();
      if (data.ok) {
        setStatus(data.status);
        setQrCode(data.qr);
        if (data.info) setWppInfo(data.info);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditWhatsappTemplate(user.whatsappTemplate || 'Olá {nome}, seu certificado está pronto! Acesse: {link}');
      setEditEmailTemplate(user.emailTemplate || 'Olá {nome}, seu certificado está anexo.');

      // Try to extract email builder fields from saved HTML template
      if (user.emailTemplate && user.emailTemplate.includes('CertificaFacil')) {
        try {
          const greetMatch = user.emailTemplate.match(/margin:0 0 12px;">(.*?)<\/h2>/s);
          const bodyMatch = user.emailTemplate.match(/line-height:1\.7;margin:0 0 24px;">(.*?)<\/p>/s);
          const btnMatch = user.emailTemplate.match(/text-decoration:none;">(.*?)<\/a>/s);
          const colorMatch = user.emailTemplate.match(/background:(#[0-9a-fA-F]{6});padding:24px;text-align:center/);
          const footerMatch = user.emailTemplate.match(/margin:0;">(.*?)<\/p>\s*<\/div>\s*<\/div>\s*<\/div>/s);
          if (greetMatch) setEmailGreeting(greetMatch[1]);
          if (bodyMatch) setEmailBody(bodyMatch[1]);
          if (btnMatch) setEmailBtnText(btnMatch[1]);
          if (colorMatch) setEmailColor(colorMatch[1]);
          if (footerMatch) setEmailFooter(footerMatch[1]);
        } catch (e) { /* keep defaults */ }
      }

      // Load SMTP config
      if (user.smtpConfig && user.smtpConfig.host) {
        setSmtpMode('custom');
        setSmtpHost(user.smtpConfig.host || '');
        setSmtpPort(user.smtpConfig.port || '587');
        setSmtpUser(user.smtpConfig.user || '');
        setSmtpPass(user.smtpConfig.pass || '');
        setSmtpSecure(user.smtpConfig.secure || false);
        setSmtpSenderEmail(user.smtpConfig.senderEmail || '');
        setSmtpSenderName(user.smtpConfig.senderName || '');
        setSmtpStatus('ok');
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.error('O nome não pode ficar vazio.');
      return;
    }
    if (editPassword && editPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      setSaving(true);
      const payload = { 
        name: editName, 
        password: editPassword,
        whatsappTemplate: editWhatsappTemplate,
        emailTemplate: buildEmailHtml()
      };

      // Include SMTP config
      if (smtpMode === 'custom' && smtpHost && smtpUser) {
        payload.smtpConfig = {
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          pass: smtpPass,
          secure: smtpSecure,
          senderEmail: smtpSenderEmail || smtpUser,
          senderName: smtpSenderName || 'CertificaFacil'
        };
      } else if (smtpMode === 'default') {
        payload.smtpConfig = null;
      }

      await Api.updateUser(payload);
      toast.success('Perfil atualizado com sucesso!');
      setEditPassword('');
      setIsEditing(false);
      await initialize();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const testSmtpConnection = async () => {
    if (!smtpHost || !smtpUser || !smtpPass) {
      toast.error('Preencha Host, Usuário e Senha para testar.');
      return;
    }
    setSmtpTesting(true);
    setSmtpStatus(null);
    try {
      const res = await Api.testSmtp({ 
        host: smtpHost, 
        port: smtpPort, 
        user: smtpUser, 
        pass: smtpPass, 
        secure: smtpSecure,
        senderEmail: smtpSenderEmail || smtpUser,
        senderName: smtpSenderName || 'CertificaFacil',
        to: testEmail || null // Se tiver um email preenchido lá embaixo, já envia o teste real
      });
      if (res.ok) {
        setSmtpStatus('ok');
        toast.success(res.message || 'Conexão SMTP verificada com sucesso!');
      }
    } catch (err) {
      setSmtpStatus('error');
      toast.error(err.message);
    } finally {
      setSmtpTesting(false);
    }
  };

  const handleTestWpp = async () => {
    if (!testPhone) {
      toast.error('Informe um número de WhatsApp');
      return;
    }
    try {
      setTestingWpp(true);
      await Api.sendTestWhatsapp(testPhone);
      toast.success('Mensagem de teste enviada!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTestingWpp(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Informe um e-mail');
      return;
    }
    try {
      setTestingEmail(true);
      
      // Se estiver em modo customizado e tiver preenchido os campos mas talvez não salvou,
      // vamos oferecer usar os dados da tela para o teste se o usuário preferir,
      // mas por padrão o botão de "Testar" geral usa o que está no banco.
      // Para testar o "próprio" antes de salvar, usa-se o botão na área de SMTP.
      
      await Api.sendTestEmail(testEmail);
      toast.success('E-mail de teste enviado!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTestingEmail(false);
    }
  };

  const connectWpp = async () => {
    setLoading(true);
    setStatus('loading');
    try {
      const data = await Api.connectWhatsapp();
      if (data.ok) toast.info('Processo iniciado. Aguarde o QRCode...');
    } catch {
      toast.error('Erro de conexão ao backend.');
      setStatus('disconnected');
    }
    setLoading(false);
  };

  const disconnectWpp = async () => {
    try {
      await Api.disconnectWhatsapp();
      setStatus('disconnected');
      setQrCode(null);
      setWppInfo(null);
      toast.success('Dispositivo desconectado com sucesso.');
    } catch {
      toast.error('Falha ao desconectar.');
    }
  };

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>CertificaFacil</div>
        <div className="dash-header-right">
          <div className="user-pill">
            <div className="avatar">{initials}</div>
            <span>{user?.name || 'Usuário'}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <div className="dash-content">
        <div className="dash-welcome" style={{ marginBottom: '32px' }}>
          <h2>Configurações da Conta</h2>
          <p>Gerencie seus dados pessoais, plano e preferências de segurança.</p>
        </div>

        <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px', alignItems: 'start' }}>
          {/* Sidebar de Navegação Interna */}
          <div className="dash-sidebar-nav">
            <button className="nav-item" onClick={() => navigate('/dashboard')}>
              <Home size={18} /> Dashboard
            </button>
            <button className="nav-item" onClick={() => navigate('/editor')}>
              <PenTool size={18} /> Editor de Design
            </button>
            <button className="nav-item active">
              <SettingsIcon size={18} /> Configurações
            </button>
            <div className="sidebar-divider"></div>
            <div className="sidebar-premium-box">
              <Crown size={20} color="var(--warning)" />
              <p>Deseja mais recursos?</p>
              <button className="btn btn-primary btn-sm w-full mt-8" onClick={() => navigate('/#pricing')}>Upgrade</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Profile Info */}
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

            {/* Plan & Subscription */}
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

            {/* Integrações - WhatsApp & Email */}
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

                        {/* Device Info */}
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

            {/* Sistema de Teste de Integração */}
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

            {/* Modelos de Envio */}
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

            {/* Developer / Security */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="var(--accent)" /> Segurança
              </h3>
              
              <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 600 }}>Zona de Perigo</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Excluir sua conta removerá permanentemente todos os seus templates e certificados gerados.</p>
                <button className="btn btn-danger btn-sm" style={{ marginTop: '12px' }}>
                  Solicitar exclusão de conta
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ WhatsApp Builder Modal ═══ */}
      {showWhatsappBuilder && (
        <div className="shortcuts-overlay" onClick={() => setShowWhatsappBuilder(false)} style={{ zIndex: 1000 }}>
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
              <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setShowWhatsappBuilder(false)}><X size={18} /></button>
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
              <button className="btn btn-ghost btn-sm" onClick={() => setShowWhatsappBuilder(false)}>Cancelar</button>
              <button className="btn btn-sm" onClick={() => { handleSaveProfile(); setShowWhatsappBuilder(false); }} disabled={saving}
                style={{ background: '#25D366', color: '#fff', fontWeight: 600, border: 'none' }}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar Template</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Email Builder Modal ═══ */}
      {showEmailBuilder && (
        <div className="shortcuts-overlay" onClick={() => setShowEmailBuilder(false)} style={{ zIndex: 1000 }}>
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
              <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setShowEmailBuilder(false)}><X size={18} /></button>
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
                        <p style={{ fontSize: '0.72rem', color: '#999', marginTop: '16px' }}>📎 <em>Certificado_Lucas_Cilento.pdf</em> em anexo</p>
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
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEmailBuilder(false)}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={() => { handleSaveProfile(); setShowEmailBuilder(false); }} disabled={saving}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar Template</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
