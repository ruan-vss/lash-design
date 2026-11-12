import api from './api';

export const paymentService = {
  listTransactions: async (params) => {
    const { data } = await api.get('/admin/payments', { params });
    return data;
  },
  createAuditAdjustment: async (bookingId, payload) => {
    const { data } = await api.post(`/admin/payments/${bookingId}/audit-adjustment`, payload);
    return data;
  },
  registerDeposit: async (bookingId, payload) => {
    const { data } = await api.post(`/admin/bookings/${bookingId}/deposit`, payload);
    return data;
  },
  exportTransactionsCsv: async (params) => {
    const response = await api.get('/admin/payments/export-csv', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};