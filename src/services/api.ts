const API_BASE = '/api';

export const api = {
  async get(path: string) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error: ${res.status} - ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },
  async post(path: string, data: any) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error: ${res.status} - ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },
  async patch(path: string, data?: any) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error: ${res.status} - ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },
  async delete(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error: ${res.status} - ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
};
