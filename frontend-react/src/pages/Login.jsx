import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/ToastContainer';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, error, clearError } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
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
          <p>Entre na sua conta</p>
        </div>
        {error && (
          <div className="auth-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>E-mail</label>
            <input type="email" className="input" placeholder="seu@email.com"
              value={email} onChange={e => { setEmail(e.target.value); clearError(); }} required />
          </div>
          <div className="input-group">
            <label>Senha</label>
            <input type="password" className="input" placeholder="••••••••"
              value={password} onChange={e => { setPassword(e.target.value); clearError(); }} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            <LogIn size={18} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <div className="auth-footer">
          Não tem conta? <Link to="/register">Cadastre-se grátis</Link>
        </div>
      </div>
    </div>
  );
}
