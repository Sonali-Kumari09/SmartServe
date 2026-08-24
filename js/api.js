// File: js/api.js
const API = (() => {
  const TOKEN_KEY = 'smartserve_token';
  const USER_KEY = 'smartserve_user';

  /**
   * Resolve API base URL:
   * - Same origin when the page is served by Express (recommended)
   * - localhost:5000 when opened via Live Server / file:// / other port
   */
  function apiBase() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('api')) return params.get('api').replace(/\/$/, '');
      if (window.SMARTSERVE_API) return String(window.SMARTSERVE_API).replace(/\/$/, '');
    } catch (_) { /* ignore */ }

    const { protocol, hostname, port } = window.location;
    // Served by our Express app (default PORT 5000) → relative /api
    if (port === '5000' || port === '') {
      return '';
    }
    // Live Server (5500), VS Code preview, file://, etc. → talk to API on 5000
    if (protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:5000';
    }
    return '';
  }

  async function request(path, options = {}) {
    const headers = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;

    const url = `${apiBase()}/api${path}`;
    let response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (networkError) {
      throw new Error(
        'Cannot reach SmartServe API. Start the server with “npm start” (port 5000), ' +
          'then open http://localhost:5000 — not a Live Server or file:// URL.'
      );
    }

    let body = null;
    try {
      body = await response.json();
    } catch (error) {
      body = {};
    }
    if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
    return body;
  }

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function token() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function user() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch (error) {
      return null;
    }
  }

  return {
    request,
    apiBase,
    login: (email, password, role) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }),
    register: (data) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    menus: (query = '') => request(`/forecast/menus${query}`),
    studentMenus: () => request('/students/menus'),
    publicMenus: () => request('/public/menus'),
    forecast: (query = '') => request(`/forecast${query}`),
    createMenu: (data) => request('/forecast/menus', { method: 'POST', body: JSON.stringify(data) }),
    updateMenu: (id, data) => request(`/forecast/menus/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    inventory: (query = '') => request(`/inventory${query}`),
    createInventory: (data) => request('/inventory', { method: 'POST', body: JSON.stringify(data) }),
    updateInventory: (id, data) => request(`/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteInventory: (id) => request(`/inventory/${id}`, { method: 'DELETE' }),
    surplus: (query = '') => request(`/surplus${query}`),
    createSurplus: (data) => request('/surplus', { method: 'POST', body: JSON.stringify(data) }),
    recipients: () => request('/surplus/recipients'),
    createRecipient: (data) => request('/surplus/recipients', { method: 'POST', body: JSON.stringify(data) }),
    matchSurplus: (id, recipientId) =>
      request(`/surplus/${id}/match`, { method: 'PATCH', body: JSON.stringify({ recipientId }) }),
    updateSurplus: (id, status) =>
      request(`/surplus/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    reportSummary: () => request('/reports/summary'),
    getAttendance: (date) => request(`/students/attendance${date ? `?date=${encodeURIComponent(date)}` : ''}`),
    setAttendance: (data) =>
      request('/students/attendance', { method: 'POST', body: JSON.stringify(data) }),
    getFeedback: (date) => request(`/students/feedback${date ? `?date=${encodeURIComponent(date)}` : ''}`),
    submitFeedback: (data) =>
      request('/students/feedback', { method: 'POST', body: JSON.stringify(data) }),
    saveSession,
    clearSession,
    token,
    user
  };
})();
