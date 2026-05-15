import { createContext, useContext, useState, useEffect } from 'react';
import Api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(Api.getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Api.getToken();
    if (token) {
      Api.getMe()
        .then(data => {
          setUser(data);
          Api.setUser(data);
        })
        .catch(() => {
          Api.clearToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await Api.login(email, password);
    Api.setToken(data.token);
    Api.setUser(data.user);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const data = await Api.register(name, email, password);
    Api.setToken(data.token);
    Api.setUser(data.user);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    Api.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
