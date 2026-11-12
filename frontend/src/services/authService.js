import api from './api';

export const authService = {
  login: async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },
  forgotPassword: async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },
  resetPassword: async (token, newPassword) => {
    const { data } = await api.post('/auth/reset-password', { token, newPassword });
    return data;
  },
  changePassword: async (currentPassword, newPassword) => {
    const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
    return data;
  },
  refresh: async () => {
    const { data } = await api.post('/auth/refresh');
    return data;
  },
  getProfile: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
  listUsers: async () => {
    const { data } = await api.get('/admin/users');
    return data;
  },
  createUser: async (payload) => {
    const { data } = await api.post('/admin/users', payload);
    return data;
  },
  toggleUserStatus: async (id, active) => {
    const { data } = await api.patch(`/admin/users/${id}/status`, { active });
    return data;
  }
};