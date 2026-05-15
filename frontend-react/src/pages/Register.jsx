import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/ToastContainer';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, error, clearError } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Conta criada com sucesso!');
      navigate('/dashboard');
    } catch {
      // error is set in the store
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>CertificaFacil</h1>
          <p>Crie sua conta gratuita</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Nome completo</label>
            <input type="text" className="input" placeholder="Seu nome"
              value={name} onChange={e => { setName(e.target.value); clearError(); }} required />
          </div>
          <div className="input-group">
            <label>E-mail</label>
            <input type="email" className="input" placeholder="seu@email.com"
              value={email} onChange={e => { setEmail(e.target.value); clearError(); }} required />
          </div>
          <div className="input-group">
            <label>Senha</label>
            <input type="password" className="input" placeholder="Mínimo 6 caracteres"
              value={password} onChange={e => { setPassword(e.target.value); clearError(); }} minLength={6} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            <UserPlus size={18} />
            {loading ? 'Criando conta...' : 'Criar conta grátis'}
          </button>
        </form>
        <div className="auth-footer">
          Já tem conta? <Link to="/login">Faça login</Link>
        </div>
      </div>
    </div>
  );
}
