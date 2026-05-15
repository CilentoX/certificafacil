import { create } from 'zustand';
import Api from '../services/api';

const useAuthStore = create((set) => ({
  user: Api.getUser(),
  loading: true,
  error: null,

  initialize: async () => {
    const token = Api.getToken();
    if (!token) {
      set({ loading: false, user: null });
      return;
    }
    try {
      const data = await Api.getMe();
      Api.setUser(data);
      set({ user: data, loading: false });
    } catch {
      Api.clearToken();
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const data = await Api.login(email, password);
      Api.setToken(data.token);
      Api.setUser(data.user);
      set({ user: data.user });
      return data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ error: null });
    try {
      const data = await Api.register(name, email, password);
      Api.setToken(data.token);
      Api.setUser(data.user);
      set({ user: data.user });
      return data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  logout: () => {
    Api.clearToken();
    set({ user: null });
  },

  clearError: () => set({ error: null })
}));

export default useAuthStore;
