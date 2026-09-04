const BASE_URL = '/api/v1'; // Use Vite proxy to hit backend

export const apiClient = async (endpoint, { body, ...customConfig } = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  };

  if (body) {
    // If body is FormData (like for OAuth2PasswordRequestForm), don't stringify and let browser set Content-Type
    if (body instanceof FormData) {
      config.body = body;
      delete config.headers['Content-Type'];
    } else if (body instanceof URLSearchParams) {
      config.body = body;
      config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (typeof body === 'string') {
      config.body = body;
    } else {
      config.body = JSON.stringify(body);
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    if (response.status === 401) {
      // Handle unauthorized (e.g. logout)
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth-error'));
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'API request failed');
  }

  return response.json().catch(() => ({}));
};
