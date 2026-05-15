import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function Validate() {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const validate = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const res = await fetch(`${API_URL}/public/validate/${code}`);
        const result = await res.json();
        
        if (!res.ok) {
          throw new Error(result.error || 'Certificado inválido');
        }
        
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    validate();
  }, [code]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'white' }}>
        <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '16px' }} />
        <p>Validando certificado na blockchain...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: '#f8fafc', padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '440px', width: '100%', background: '#12121a', border: '1px solid #1e293b', borderRadius: '24px', padding: '32px', boxShadow: '0 40px 80px rgba(0,0,0,0.6)', position: 'relative', overflow: 'hidden' }}>
        {error ? (
          <div style={{ textAlign: 'center' }}>
            <XCircle size={64} style={{ color: 'var(--danger)', margin: '0 auto 20px' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px' }}>Registro Não Encontrado</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
              {error}
            </p>
            <Link to="/" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: '12px', background: '#1e1e2e', color: '#f8fafc', textDecoration: 'none', fontWeight: 600, border: '1px solid #2a2a3e' }}>
              Voltar ao Início
            </Link>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ width: '88px', height: '88px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)' }}>
                <CheckCircle size={44} color="white" />
              </div>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0' }}>Documento Válido</h1>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '99px', color: '#10b981', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginTop: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                Autenticidade Confirmada
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Titular do Certificado</span>
                <span style={{ fontSize: '1.05rem', color: '#f1f5f9', fontWeight: 600 }}>{data.studentName}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Curso / Formação</span>
                <span style={{ fontSize: '1.05rem', color: '#f1f5f9', fontWeight: 600 }}>{data.courseName || 'Não especificado'}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Emissor</span>
                <span style={{ fontSize: '1.05rem', color: '#f1f5f9', fontWeight: 600 }}>{data.issuer}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Protocolo de Registro</span>
                <div style={{ background: '#0a0a0f', padding: '12px 16px', borderRadius: '10px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                   <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontSize: '0.95rem', fontWeight: 800 }}>{data.validationCode}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Data de Emissão</span>
                <span style={{ fontSize: '1.05rem', color: '#f1f5f9', fontWeight: 600 }}>
                  {new Date(data.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: '24px', color: '#475569', fontSize: '0.8rem' }}>
           Emitido e Validado via <strong style={{ color: '#f8fafc', letterSpacing: '1px' }}>CertificaFacil Engine</strong>
        </div>
      </div>
    </div>
  );
}
