const API_BASE_URL = 'http://localhost:4002';

export const api = {
  async request(endpoint, options = {}) {
    const token = new URLSearchParams(window.location.search).get('token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    return response.json();
  },
};