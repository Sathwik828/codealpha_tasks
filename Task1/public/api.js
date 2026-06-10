const API = {
  BASE_URL: '/api',

  // Get auth headers
  getHeaders: () => {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // Perform request
  request: async (endpoint, method = 'GET', body = null) => {
    const url = `${API.BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: API.getHeaders()
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }
      
      return data;
    } catch (error) {
      console.error(`API Error on ${method} ${endpoint}:`, error);
      throw error;
    }
  },

  // HTTP helper methods
  get: (endpoint) => API.request(endpoint, 'GET'),
  post: (endpoint, body) => API.request(endpoint, 'POST', body),
  put: (endpoint, body) => API.request(endpoint, 'PUT', body),
  delete: (endpoint) => API.request(endpoint, 'DELETE')
};
