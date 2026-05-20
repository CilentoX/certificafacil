import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Settings as SettingsIcon, PenTool, LogOut, Crown } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/ToastContainer';
import Api from '../services/api';

// Sections
import ProfileSection from '../components/settings/ProfileSection';
import IntegrationSection from '../components/settings/IntegrationSection';
import TestSection from '../components/settings/TestSection';
import TemplatesSection from '../components/settings/TemplatesSection';
import SecuritySection from '../components/settings/SecuritySection';

// Modals
import WhatsappBuilderModal from '../components/settings/WhatsappBuilderModal';
import EmailBuilderModal from '../components/settings/EmailBuilderModal';

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
    let safeText = formatted
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    safeText = safeText.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    safeText = safeText.replace(/_(.*?)_/g, '<em>$1</em>');
    safeText = safeText.replace(/~(.*?)~/g, '<del>$1</del>');
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
      if (smtpMode === 'custom' && smtpHost && smtpUser) {
        payload.smtpConfig = {
          host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass,
          secure: smtpSecure, senderEmail: smtpSenderEmail || smtpUser, senderName: smtpSenderName || 'CertificaFacil'
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
        host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, secure: smtpSecure,
        senderEmail: smtpSenderEmail || smtpUser, senderName: smtpSenderName || 'CertificaFacil', to: testEmail || null
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
      toast.error('Informe um número de WhatsApp'); return;
    }
    try {
      setTestingWpp(true);
      await Api.sendTestWhatsapp(testPhone);
      toast.success('Mensagem de teste enviada!');
    } catch (e) {
      toast.error(e.message);
    } finally { setTestingWpp(false); }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Informe um e-mail'); return;
    }
    try {
      setTestingEmail(true);
      await Api.sendTestEmail(testEmail);
      toast.success('E-mail de teste enviado!');
    } catch (e) {
      toast.error(e.message);
    } finally { setTestingEmail(false); }
  };

  const connectWpp = async () => {
    setLoading(true); setStatus('loading');
    try {
      const data = await Api.connectWhatsapp();
      if (data.ok) toast.info('Processo iniciado. Aguarde o QRCode...');
    } catch {
      toast.error('Erro de conexão ao backend.'); setStatus('disconnected');
    }
    setLoading(false);
  };

  const disconnectWpp = async () => {
    try {
      await Api.disconnectWhatsapp();
      setStatus('disconnected'); setQrCode(null); setWppInfo(null);
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
            <ProfileSection
              user={user} isEditing={isEditing} setIsEditing={setIsEditing}
              editName={editName} setEditName={setEditName} editPassword={editPassword} setEditPassword={setEditPassword}
              handleSaveProfile={handleSaveProfile} saving={saving}
            />

            <IntegrationSection
              status={status} loading={loading} qrCode={qrCode} wppInfo={wppInfo}
              connectWpp={connectWpp} disconnectWpp={disconnectWpp}
              smtpMode={smtpMode} setSmtpMode={setSmtpMode} smtpHost={smtpHost} setSmtpHost={setSmtpHost}
              smtpPort={smtpPort} setSmtpPort={setSmtpPort} smtpUser={smtpUser} setSmtpUser={setSmtpUser}
              smtpPass={smtpPass} setSmtpPass={setSmtpPass} smtpSecure={smtpSecure} setSmtpSecure={setSmtpSecure}
              smtpSenderEmail={smtpSenderEmail} setSmtpSenderEmail={setSmtpSenderEmail}
              smtpSenderName={smtpSenderName} setSmtpSenderName={setSmtpSenderName}
              smtpStatus={smtpStatus} testSmtpConnection={testSmtpConnection} smtpTesting={smtpTesting}
              saving={saving} handleSaveProfile={handleSaveProfile}
              showSmtpPass={showSmtpPass} setShowSmtpPass={setShowSmtpPass} testEmail={testEmail}
            />

            <TestSection
              testPhone={testPhone} setTestPhone={setTestPhone} handleTestWpp={handleTestWpp} testingWpp={testingWpp} status={status}
              testEmail={testEmail} setTestEmail={setTestEmail} handleTestEmail={handleTestEmail} testingEmail={testingEmail} smtpMode={smtpMode}
            />

            <TemplatesSection
              setShowWhatsappBuilder={setShowWhatsappBuilder} setShowEmailBuilder={setShowEmailBuilder}
              editWhatsappTemplate={editWhatsappTemplate} emailGreeting={emailGreeting} emailBody={emailBody} emailColor={emailColor}
            />

            <SecuritySection />
          </div>
        </div>
      </div>

      <WhatsappBuilderModal
        show={showWhatsappBuilder} onClose={() => setShowWhatsappBuilder(false)}
        editWhatsappTemplate={editWhatsappTemplate} setEditWhatsappTemplate={setEditWhatsappTemplate}
        handleSaveProfile={handleSaveProfile} saving={saving} renderWhatsAppPreview={renderWhatsAppPreview}
      />

      <EmailBuilderModal
        show={showEmailBuilder} onClose={() => setShowEmailBuilder(false)}
        emailGreeting={emailGreeting} setEmailGreeting={setEmailGreeting} emailBody={emailBody} setEmailBody={setEmailBody}
        emailBtnText={emailBtnText} setEmailBtnText={setEmailBtnText} emailColor={emailColor} setEmailColor={setEmailColor}
        emailFooter={emailFooter} setEmailFooter={setEmailFooter} handleSaveProfile={handleSaveProfile} saving={saving}
      />
    </div>
  );
}
