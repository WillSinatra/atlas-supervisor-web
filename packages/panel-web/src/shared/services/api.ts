import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores y refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  profile: () => api.get('/auth/profile'),
};

// Orders
export const ordersApi = {
  list: (params?: Record<string, unknown>) => api.get('/orders', { params }),
  byId: (id: string) => api.get(`/orders/${id}`),
  stats: () => api.get('/orders/stats'),
  updateStatus: (id: string, data: { status: string; reason?: string }) =>
    api.post(`/orders/${id}/status`, data),
  assign: (id: string, data: { crewId: string }) => api.post(`/orders/${id}/assign`, data),
};

// Crews
export const crewsApi = {
  list: (params?: Record<string, unknown>) => api.get('/crews', { params }),
  byId: (id: string) => api.get(`/crews/${id}`),
  map: () => api.get('/crews/map'),
  updateLocation: (id: string, data: { latitude: number; longitude: number }) =>
    api.post(`/crews/${id}/location`, data),
  updateStatus: (id: string, data: { status: string }) => api.post(`/crews/${id}/status`, data),
};

// Customers
export const customersApi = {
  list: (params?: Record<string, unknown>) => api.get('/customers', { params }),
  byId: (id: string) => api.get(`/customers/${id}`),
  byDocument: (documentNumber: string) => api.get(`/customers/document/${documentNumber}`),
};

// Dashboard
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

// Reports
export const reportsApi = {
  kpi: (params?: Record<string, unknown>) => api.get('/reports/kpi', { params }),
  productivity: (params?: Record<string, unknown>) => api.get('/reports/productivity', { params }),
  sla: (params?: Record<string, unknown>) => api.get('/reports/sla', { params }),
  materials: (params?: Record<string, unknown>) => api.get('/reports/materials', { params }),
};

// Settings
export const settingsApi = {
  configs: (category?: string) => api.get('/settings/configs', { params: { category } }),
  config: (key: string) => api.get(`/settings/configs/${key}`),
  setConfig: (key: string, data: { value: string; category?: string; description?: string }) =>
    api.post(`/settings/configs/${key}`, data),
  slas: () => api.get('/settings/slas'),
  createSla: (data: Record<string, unknown>) => api.post('/settings/slas', data),
  auditLogs: (params?: Record<string, unknown>) => api.get('/settings/audit-logs', { params }),
};

// Users
export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  byId: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  remove: (id: string) => api.delete(`/users/${id}`),
};

// Notifications
export const notificationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
};

export default api;