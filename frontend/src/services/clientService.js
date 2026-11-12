import api from './api';

export const clientService = {
  listClients: async (params) => {
    const { data } = await api.get('/admin/clients', { params });
    return data;
  },
  getClientDetails: async (id) => {
    const { data } = await api.get(`/admin/clients/${id}`);
    return data;
  },
  updateClientNotes: async (id, payload) => {
    const { data } = await api.patch(`/admin/clients/${id}/notes`, payload);
    return data;
  },
};