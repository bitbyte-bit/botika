const API_BASE = '/api';

export const api = {
  async get(path: string) {
    const res = await fetch(`${API_BASE}${path}`);
    return res.json();
  },
  async post(path: string, data: any) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async patch(path: string, data?: any) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined
    });
    return res.json();
  },
  async delete(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE'
    });
    return res.json();
  }
};
