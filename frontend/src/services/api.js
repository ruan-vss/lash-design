import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const compactQueryParams = (params) => {
  if (!params || typeof params !== 'object') return params;

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    })
  );
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('@LashSaaS:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Filtros vazios significam "todos" no painel e não devem virar ?status=&method=&startDate=.
    // Isso evita que enums/datas opcionais sejam validados como strings vazias no backend.
    if (config.params) {
      config.params = compactQueryParams(config.params);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      const isAdminPath = window.location.pathname.startsWith('/admin');
      const isLoginPath = window.location.pathname.startsWith('/admin/login');
      localStorage.removeItem('@LashSaaS:token');
      localStorage.removeItem('@LashSaaS:user');
      if (isAdminPath && !isLoginPath) {
        window.location.href = '/admin/login?expired=true';
      }
    }
    if (status === 428 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      if (window.location.pathname !== '/admin/trocar-senha') {
        window.location.href = '/admin/trocar-senha';
      }
    }
    return Promise.reject(error);
  }
);

const humanizeApiMessage = (message) => {
  if (!message) return null;
  if (message.includes('Invalid enum value')) {
    return 'Um dos filtros selecionados não é válido. Limpe os filtros e tente novamente.';
  }
  if (message.includes('Expected') && message.includes('received')) {
    return 'Um dos valores enviados não é válido. Revise os campos e tente novamente.';
  }
  return message;
};

export const extractErrorMessage = (error, fallback = 'Não foi possível concluir a operação.') => {
  if (!error.response) {
    return 'Servidor indisponível no momento. Verifique sua conexão ou tente novamente.';
  }
  const data = error.response.data;
  if (data?.message) return humanizeApiMessage(data.message);
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((e) => humanizeApiMessage(e.message)).join(' | ');
  }
  return fallback;
};

export default api;
