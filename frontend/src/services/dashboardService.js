import api from './api';

export const dashboardService = {
  getOverview: async (params) => {
    const { data } = await api.get('/admin/dashboard', { params });
    return data;
  },
  getReports: async (params) => {
    const { data } = await api.get('/admin/reports', { params });
    return data;
  },
  exportReportCsv: async (params) => {
    const response = await api.get('/admin/reports/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};