import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
});

// Interceptor para adicionar o token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cf_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para tratar erros globais (ex: 401 Unauthorized)
api.interceptors.response.use((response) => {
  return response.data;
}, (error) => {
  const message = error.response?.data?.error || 'Erro na comunicação com o servidor';
  if (error.response?.status === 401) {
    // Logout automático em caso de token expirado ou sessão inválida
    localStorage.removeItem('cf_token');
    localStorage.removeItem('cf_user');
    window.location.href = '/login';
  } else if (error.response?.status === 429) {
    message = "🚨 Proteção Ativada: Muitas requisições sequenciais detectadas pelo Firewall. Aguarde 60 segundos antes de tentar novamente.";
  }
  return Promise.reject(new Error(message));
});

class Api {
  static getToken() {
    return localStorage.getItem('cf_token');
  }

  static setToken(token) {
    localStorage.setItem('cf_token', token);
  }

  static clearToken() {
    localStorage.removeItem('cf_token');
    localStorage.removeItem('cf_user');
  }

  static setUser(user) {
    localStorage.setItem('cf_user', JSON.stringify(user));
  }

  static getUser() {
    try { return JSON.parse(localStorage.getItem('cf_user')); } catch { return null; }
  }

  // Auth
  static login(email, password) {
    return api.post('/auth/login', { email, password });
  }

  static register(name, email, password) {
    return api.post('/auth/register', { name, email, password });
  }

  static getMe() {
    return api.get('/auth/me');
  }

  static updateUser(data) {
    return api.put('/users/me', data);
  }

  // Templates
  static getTemplates() {
    return api.get('/templates');
  }

  static uploadTemplate(file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/templates/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  static async downloadTemplateBlob(filename) {
    const token = this.getToken();
    // Como é um arquivo estático fora da rota /api, usamos a URL base
    const url = `${API_BASE.replace('/api', '')}/uploads/templates/${filename}`;
    const res = await axios.get(url, {
      responseType: 'blob',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.data;
  }

  // Stats
  static getStats() {
    return api.get('/users/stats');
  }

  // Mercado Pago
  static createCheckout(planSlug) {
    return api.post('/mp/checkout', { planSlug });
  }

  // Projects
  static getProjects() {
    return api.get('/projects');
  }

  static getProject(uid) {
    return api.get(`/projects/${uid}`);
  }

  static saveProject(data) {
    return api.post('/projects', data);
  }

  static deleteProject(uid) {
    return api.delete(`/projects/${uid}`);
  }

  static duplicateProject(uid) {
    return api.post(`/projects/${uid}/duplicate`);
  }

  // Assets
  static getAssets() {
    return api.get('/assets');
  }

  static uploadAsset(file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/assets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  static deleteAsset(filename) {
    return api.delete(`/assets/${filename}`);
  }

  // Integrations
  static getWhatsappStatus() {
    return api.get('/integrations/whatsapp/status');
  }

  static connectWhatsapp() {
    return api.post('/integrations/whatsapp/connect');
  }

  static disconnectWhatsapp() {
    return api.post('/integrations/whatsapp/disconnect');
  }

  static testSmtp(config) {
    return api.post('/integrations/smtp/test', config);
  }

  static sendTestEmail(to) {
    return api.post('/integrations/email/test', { to });
  }

  static sendTestWhatsapp(phone) {
    return api.post('/integrations/whatsapp/test', { phone });
  }

  // Generation
  static startBatch(data) {
    // We use raw api (axios) for SSE, or a stream-capable helper.
    // For SSE with fetch (needed for streaming reader), we just expose the helper:
    const token = this.getToken();
    return fetch(`${API_BASE}/generate/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  }

  static downloadZip(ids) {
    return api.post('/generate/zip', { ids }, { responseType: 'blob' });
  }

  // Fonts
  static getFonts() {
    return api.get('/fonts');
  }

  static uploadFont(file) {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/fonts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  static deleteFont(filename) {
    return api.delete(`/fonts/${filename}`);
  }
}

export default Api;
