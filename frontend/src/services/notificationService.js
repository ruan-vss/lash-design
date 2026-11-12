import api from './api';

export const notificationService = {
  getSettingsAndLogs: async (params) => {
    const { data } = await api.get('/admin/notifications', { params });
    return data;
  },
  updateTemplates: async (payload) => {
    const { data } = await api.put('/admin/notifications/templates', payload);
    return data;
  },
  testIntegration: async (phone) => {
    const { data } = await api.post('/admin/notifications/test', { phone });
    return data;
  },
};