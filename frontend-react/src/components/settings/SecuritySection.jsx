import { Shield } from 'lucide-react';

export default function SecuritySection() {
  return (
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
  );
}
