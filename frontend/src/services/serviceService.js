import api from './api';

export const serviceService = {
  getPublicServices: async () => {
    const { data } = await api.get('/public/services');
    return data;
  },
  getAdminServices: async () => {
    const { data } = await api.get('/admin/services');
    return data;
  },
  createService: async (payload) => {
    const { data } = await api.post('/admin/services', payload);
    return data;
  },
  updateService: async (id, payload) => {
    const { data } = await api.put(`/admin/services/${id}`, payload);
    return data;
  },
  toggleServiceActive: async (id, active) => {
    const { data } = await api.patch(`/admin/services/${id}/status`, { active });
    return data;
  },
  softDeleteService: async (id) => {
    const { data } = await api.delete(`/admin/services/${id}`);
    return data;
  },
};