import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT access token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey) config.headers['X-API-Key'] = apiKey;

  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username, password) => api.post('/auth/login/', { username, password }),
  me: () => api.get('/auth/me/'),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  getUsers: () => api.get('/admin/users/'),
  createUser: (data) => api.post('/admin/users/', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}/`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}/`),
  getAnalyticsOverview: (period = 30) => api.get(`/admin/analytics/?period=${period}`),
};

// ── Tenants ───────────────────────────────────────────────────────────────────
export const tenantApi = {
  list: () => api.get('/tenants/'),
  create: (data) => api.post('/tenants/', data),
  getTenant: (id) => api.get(`/tenants/${id}/`),
  updateTenant: (id, data) => api.patch(`/tenants/${id}/`, data),
  update: (id, data) => api.patch(`/tenants/${id}/`, data),

  // Menu items
  getItems: (tenantId) => api.get(`/tenants/${tenantId}/items/`),
  createItem: (tenantId, data) => api.post(`/tenants/${tenantId}/items/`, data),
  updateItem: (tenantId, itemId, data) => api.patch(`/tenants/${tenantId}/items/${itemId}/`, data),
  deleteItem: (tenantId, itemId) => api.delete(`/tenants/${tenantId}/items/${itemId}/`),
  bulkPriceUpdate: (tenantId, data) => api.post(`/tenants/${tenantId}/items/bulk-price/`, data),

  // PDF menu
  uploadMenuPdf: (tenantId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/tenants/${tenantId}/upload-menu/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  parseMenuPdf: (tenantId) => api.post(`/tenants/${tenantId}/parse-menu/`),

  // Deals
  getDeals: (tenantId) => api.get(`/tenants/${tenantId}/deals/`),
  createDeal: (tenantId, data) => api.post(`/tenants/${tenantId}/deals/`, data),
  updateDeal: (tenantId, dealId, data) => api.patch(`/tenants/${tenantId}/deals/${dealId}/`, data),
  deleteDeal: (tenantId, dealId) => api.delete(`/tenants/${tenantId}/deals/${dealId}/`),

  // Analytics
  getAnalytics: (tenantId, period = 30) => api.get(`/tenants/${tenantId}/analytics/?period=${period}`),
  getInvoice: (tenantId, month) => api.get(`/tenants/${tenantId}/invoice/${month ? `?month=${month}` : ''}`),
};

// ── Kitchen / Orders ──────────────────────────────────────────────────────────
export const ordersApi = {
  getKitchenOrders: (tenantId) => api.get(`/kitchen/orders/?tenant_id=${tenantId}`),
  updateStatus: (orderId, tenantId, status) =>
    api.patch(`/orders/${orderId}/status/`, { tenant_id: tenantId, status }),
};

export const SSE_URL = (tenantId) => {
  const base = import.meta.env.VITE_API_BASE_URL;
  const apiKey = import.meta.env.VITE_API_KEY || '';
  return `${base}/kitchen/stream/?tenant_id=${tenantId}&api_key=${apiKey}`;
};
