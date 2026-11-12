import api from './api';

export const bookingService = {
  getMonthlyAvailability: async ({ year, month, serviceIds }) => {
    const { data } = await api.get('/public/availability/calendar', {
      params: { year, month, serviceIds: serviceIds.join(',') },
    });
    return data;
  },
  getAvailableSlots: async ({ date, serviceIds }) => {
    const { data } = await api.get('/public/availability/slots', {
      params: { date, serviceIds: serviceIds.join(',') },
    });
    return data;
  },
  calculateSummary: async ({ serviceIds, couponCode }) => {
    const { data } = await api.post('/public/bookings/preview', { serviceIds, couponCode });
    return data;
  },
  createBooking: async (payload) => {
    const { data } = await api.post('/public/bookings', payload);
    return data;
  },
  lookupClientBookings: async ({ bookingCode, phone }) => {
    const { data } = await api.post('/public/bookings/lookup', { bookingCode, phone });
    return data;
  },
  getClientBookingDetails: async (id, token) => {
    const { data } = await api.get(`/public/bookings/${id}`, {
      params: { token },
    });
    return data;
  },
  requestClientCancellation: async (id, { reason, token }) => {
    const { data } = await api.post(`/public/bookings/${id}/cancel`, { reason, token });
    return data;
  },
  requestClientReschedule: async (id, { newDate, newStartTime, token }) => {
    const { data } = await api.post(`/public/bookings/${id}/reschedule`, {
      newDate,
      newStartTime,
      token,
    });
    return data;
  },
  // Rotas Administrativas
  listAdminBookings: async (params) => {
    const { data } = await api.get('/admin/bookings', { params });
    return data;
  },
  createManualBooking: async (payload) => {
    const { data } = await api.post('/admin/bookings/manual', payload);
    return data;
  },
  updateBookingStatus: async (id, { status, reason, internalNotes } = {}) => {
    const { data } = await api.patch(`/admin/bookings/${id}/status`, {
      status,
      reason,
      internalNotes,
    });
    return data;
  },
};