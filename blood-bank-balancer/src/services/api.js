/* eslint-disable no-unused-vars */
const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (response.status === 401) {
      // If unauthorized, clear token if expired (except during login/register attempts)
      if (endpoint !== '/auth/json-login' && endpoint !== '/auth/register') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
      }
    }

    if (!response.ok) {
      // Handle 502 Bad Gateway / 503 / 504 (Vite Proxy cannot reach backend on port 8000)
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        const error = new Error(
          'Backend server is unreachable (502 Bad Gateway). Please ensure the FastAPI backend is running on http://127.0.0.1:8000 via "python run_backend.py".'
        );
        error.status = response.status;
        throw error;
      }

      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { detail: response.statusText };
      }
      
      let detailMsg = errorData.detail || errorData.message || 'An unexpected error occurred';
      if (detailMsg === 'Bad Gateway') {
        detailMsg = 'Backend server is offline. Please start the backend with "python run_backend.py".';
      }
      
      const error = new Error(detailMsg);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const netError = new Error(
        'Cannot connect to API server. Please ensure the backend is started using "python run_backend.py".'
      );
      netError.status = 502;
      throw netError;
    }
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  auth: {
    login: (email, password) => apiRequest('/auth/json-login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    register: (userData) => apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    getMe: () => apiRequest('/auth/me'),
    updateProfile: (data) => apiRequest('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    getDemoUsers: () => apiRequest('/auth/demo-users')
  },
  facilities: {
    list: () => apiRequest('/facilities'),
    get: (id) => apiRequest(`/facilities/${id}`),
    update: (id, data) => apiRequest(`/facilities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    getStats: (id) => apiRequest(`/facilities/${id}/stats`),
    create: (data) => apiRequest('/facilities', { method: 'POST', body: JSON.stringify(data) })
  },
  inventory: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/inventory${query ? `?${query}` : ''}`);
    },
    getSummary: (facilityId) => {
      const query = facilityId ? `?scope_facility_id=${facilityId}` : '';
      return apiRequest(`/inventory/summary${query}`);
    },
    add: (data) => apiRequest('/inventory', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => apiRequest(`/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/inventory/${id}`, { method: 'DELETE' })
  },
  triage: {
    findMatch: (data) => apiRequest('/triage/find-match', { method: 'POST', body: JSON.stringify(data) }),
    requestTransfer: (data) => apiRequest('/triage/request-transfer', { method: 'POST', body: JSON.stringify(data) })
  },
  transfers: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/transfers${query ? `?${query}` : ''}`);
    },
    get: (id) => apiRequest(`/transfers/${id}`),
    approve: (id) => apiRequest(`/transfers/${id}/approve`, { method: 'POST' }),
    transit: (id) => apiRequest(`/transfers/${id}/transit`, { method: 'POST' }),
    complete: (id) => apiRequest(`/transfers/${id}/complete`, { method: 'POST' }),
    reject: (id) => apiRequest(`/transfers/${id}/reject`, { method: 'POST' }),
    cancel: (id) => apiRequest(`/transfers/${id}/cancel`, { method: 'POST' })
  },
  alerts: {
    list: (unackOnly = false) => apiRequest(`/alerts?unacknowledged_only=${unackOnly}`),
    acknowledge: (id) => apiRequest(`/alerts/${id}/ack`, { method: 'POST' })
  },
  his: {
    sync: (payload) => apiRequest('/his/sync-inventory', { method: 'POST', body: JSON.stringify(payload) })
  }
};
