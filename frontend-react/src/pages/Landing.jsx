import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, Zap, Shield, FileText, Users, Download, Check, ArrowRight, Sparkles, Search, Loader2 } from 'lucide-react';
import EditorPreview from '../components/EditorPreview';
import useAuthStore from '../stores/authStore';
import Api from '../services/api';

const features = [
  { icon: <FileText size={24} />, title: 'Editor Visual', desc: 'Arraste e solte textos sobre seus templates PDF com nosso editor intuitivo estilo Canva.' },
  { icon: <Users size={24} />, title: 'Importação em Lote', desc: 'Importe listas de participantes via CSV e gere centenas de certificados instantaneamente.' },
  { icon: <Download size={24} />, title: 'PDF de Alta Qualidade', desc: 'Certificados gerados em PDF vetorial, prontos para impressão profissional.' },
  { icon: <Zap size={24} />, title: 'Super Rápido', desc: 'Motor de geração otimizado que processa lotes em segundos, não minutos.' },
  { icon: <Shield size={24} />, title: 'Seguro & Confiável', desc: 'Autenticação JWT, dados criptografados e backups automáticos do seu trabalho.' },
  { icon: <Award size={24} />, title: 'Planos Flexíveis', desc: 'Do plano gratuito ao ilimitado — escale conforme sua necessidade cresce.' },
];

const plans = [
  { slug: 'trial', name: 'Trial', price: 'Grátis', period: '7 dias', features: ['5 certificados', '2 templates', 'Editor completo', 'Suporte por e-mail'], highlight: false },
  { slug: 'basic', name: 'Básico', price: 'R$ 29,90', period: '/mês', features: ['25 certificados', '5 templates', 'Geração em lote', 'Suporte prioritário'], highlight: false },
  { slug: 'pro', name: 'Profissional', price: 'R$ 59,90', period: '/mês', features: ['50 certificados', '20 templates', 'Fontes personalizadas', 'Geração em lote', 'API acesso'], highlight: true },
  { slug: 'unlimited', name: 'Ilimitado', price: 'R$ 99,90', period: '/mês', features: ['Certificados ilimitados', 'Templates ilimitados', 'Tudo do Pro', 'Suporte dedicado', 'White-label'], highlight: false },
];

export default function Landing() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [valCode, setValCode] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleVerify = (e) => {
    e.preventDefault();
    if (!valCode.trim()) return;
    // Redireciona para a rota de validação do backend
    window.location.href = `/v/${valCode.trim()}`;
  };

  const handlePlanSelect = async (plan) => {
    if (!user) {
      navigate('/register');
      return;
    }
    
    if (plan.slug === 'trial') {
      navigate('/dashboard');
      return;
    }

    try {
      setLoadingPlan(plan.slug);
      const res = await Api.createCheckout(plan.slug);
      if (res.init_point) {
        window.location.href = res.init_point;
      }
    } catch (err) {
      alert('Erro ao iniciar checkout: ' + err.message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <Sparkles size={20} style={{ display: 'inline', marginRight: 6 }} />
          CertificaFacil
        </div>
        <div className="nav-links">
          <a href="#preview">Demo</a>
          <a href="#features">Recursos</a>
          <a href="#verify">Validar</a>
          <a href="#pricing">Planos</a>
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Entrar</Link>
              <Link to="/register" className="btn btn-primary">Começar Grátis</Link>
            </>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-mesh"></div>
        <div className="hero-badge">
          <Sparkles size={14} /> 
          Plataforma #1 de Certificados Digitais
        </div>
        <h1>
          Crie certificados<br />
          <span className="text-gradient">profissionais em minutos</span>
        </h1>
        <p>
          O editor visual mais intuitivo do mercado. Arraste, solte e gere 
          centenas de certificados autenticados com apenas um clique.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="btn btn-primary btn-lg">
            Começar Grátis Agora <ArrowRight size={18} />
          </Link>
          <a href="#preview" className="btn btn-secondary btn-lg">
            Ver Demonstração
          </a>
        </div>
      </section>

      {/* ═══ Preview Animation ═══ */}
      <section className="preview-section" id="preview">
        <div className="preview-section-header">
          <h2>Veja como funciona</h2>
          <p>O editor mais intuitivo para criar certificados profissionais</p>
        </div>
        <EditorPreview />
      </section>

      {/* ═══ Features ═══ */}
      <section className="features" id="features">
        {features.map((f, i) => (
          <div className="feature-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ═══ Validation Section (WOW Factor) ═══ */}
      <section className="verify-section" id="verify">
        <div className="verify-container">
          <div className="verify-content">
            <h2>Validar Autenticidade</h2>
            <p>Recebeu um certificado do CertificaFacil? Digite o código de validação abaixo para confirmar sua veracidade.</p>
            <form onSubmit={handleVerify} className="verify-form">
              <div className="verify-input-wrapper">
                <Search className="verify-search-icon" size={20} />
                <input 
                  type="text" 
                  placeholder="Ex: ABC-123-XYZ" 
                  value={valCode}
                  onChange={(e) => setValCode(e.target.value.toUpperCase())}
                />
              </div>
              <button type="submit" className="btn btn-primary">Verificar Agora</button>
            </form>
          </div>
          <div className="verify-visual">
            <div className="verify-card-mockup">
              <Shield size={48} color="var(--primary-color)" />
              <span>100% Autêntico</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Pricing ═══ */}
      <section className="pricing-section" id="pricing">
        <div className="preview-section-header">
          <h2>Planos e preços</h2>
          <p>Escolha o plano ideal para sua instituição</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan, i) => (
            <div className={`pricing-card ${plan.highlight ? 'pricing-highlight' : ''}`} key={i}>
              {plan.highlight && <div className="pricing-badge">Mais Popular</div>}
              <h3>{plan.name}</h3>
              <div className="pricing-price">
                {plan.price}
                <span style={{ fontSize: '0.8rem', opacity: 0.6, marginLeft: 4 }}>{plan.period}</span>
              </div>
              <ul className="pricing-features">
                {plan.features.map((f, j) => (
                  <li key={j}><Check size={16} /> {f}</li>
                ))}
              </ul>
              <button 
                onClick={() => handlePlanSelect(plan)}
                disabled={loadingPlan === plan.slug}
                className={`btn w-full ${plan.highlight ? 'btn-premium' : 'btn-secondary'}`}
              >
                {loadingPlan === plan.slug ? (
                  <><Loader2 size={16} className="animate-spin" /> Processando...</>
                ) : (
                  user && plan.slug === 'trial' ? 'Acessar agora' : 'Assinar agora'
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">CertificaFacil</div>
          <p>© 2026 CertificaFacil — Tecnologia para Educação e Eventos.</p>
          <div className="footer-social">
            <Shield size={16} /> Sistema de Validação Ativo
          </div>
        </div>
      </footer>
    </div>
  );
}
