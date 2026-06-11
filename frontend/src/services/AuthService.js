const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function extractError(data) {
  if (typeof data === 'string') return data;
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (Array.isArray(val)) return val[0];
    if (typeof val === 'string') return val;
  }
  return 'Something went wrong.';
}

class AuthServiceClass {
  async register(userData) {
    const response = await fetch(`${API_URL}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(extractError(data));
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  }

  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(extractError(data));
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.removeItem('staffProfile');
    return data;
  }

  saveStaffSession(data) {
    // assigned_pages and subjects may come as JSON strings from FormData round-trips
    const parseArr = v => {
      if (Array.isArray(v)) return v;
      try { return JSON.parse(v); } catch { return []; }
    };
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('staffProfile', JSON.stringify({
      staff_id:        data.staff_id,
      full_name:       data.full_name,
      subjects:        parseArr(data.subjects),
      assigned_classes: parseArr(data.assigned_classes),
      assigned_pages:  parseArr(data.assigned_pages),
      additional_role: data.additional_role || '',
      business_id:     data.business_id,
    }));
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('staffProfile');
  }

  getToken() {
    return localStorage.getItem('authToken');
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  getStaffProfile() {
    const p = localStorage.getItem('staffProfile');
    return p ? JSON.parse(p) : null;
  }

  async refreshStaffProfile() {
    try {
      const res = await fetch(`${API_URL}/staff/auth/me/`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const parseArr = v => Array.isArray(v) ? v : (JSON.parse(v) || []);
      const updated = {
        staff_id:        data.staff_id,
        full_name:       data.full_name,
        subjects:        parseArr(data.subjects),
        assigned_classes: parseArr(data.assigned_classes),
        assigned_pages:  parseArr(data.assigned_pages),
        additional_role: data.additional_role || '',
        business_id:     data.business_id,
        business:        data.business || null,
      };
      localStorage.setItem('staffProfile', JSON.stringify(updated));
      return updated;
    } catch {
      return null;
    }
  }

  isStaff() {
    return !!this.getStaffProfile();
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  getAuthHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Token ${token}` }),
    };
  }

  getAuthHeadersNoContent() {
    const token = this.getToken();
    return token ? { Authorization: `Token ${token}` } : {};
  }
}

const AuthService = new AuthServiceClass();
export default AuthService;
