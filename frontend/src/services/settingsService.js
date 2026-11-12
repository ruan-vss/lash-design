import api from './api';

export const settingsService = {
  getPublicStudioConfig: async () => {
    const { data } = await api.get('/public/studio');
    return data;
  },
  getAdminSettings: async () => {
    const { data } = await api.get('/admin/settings');
    return data;
  },
  updateAdminSettings: async (payload) => {
    const { data } = await api.put('/admin/settings', payload);
    return data;
  },
  getWorkingHours: async () => {
    const { data } = await api.get('/admin/availability/hours');
    return data;
  },
  updateWorkingHours: async (payload) => {
    const { data } = await api.put('/admin/availability/hours', payload);
    return data;
  },
  getBlockings: async () => {
    const { data } = await api.get('/admin/availability/blockings');
    return data;
  },
  createBlocking: async (payload) => {
    const { data } = await api.post('/admin/availability/blockings', payload);
    return data;
  },
  deleteBlocking: async (id) => {
    const { data } = await api.delete(`/admin/availability/blockings/${id}`);
    return data;
  },
  listPromotions: async () => {
    const { data } = await api.get('/admin/promotions');
    return data;
  },
  createPromotion: async (payload) => {
    const { data } = await api.post('/admin/promotions', payload);
    return data;
  },
  togglePromotion: async (id, active) => {
    const { data } = await api.patch(`/admin/promotions/${id}`, { active });
    return data;
  },
};