export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('launchpad_token');
}

export function getUser(): { userId: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('launchpad_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function authFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem('launchpad_token');
    localStorage.removeItem('launchpad_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  return res;
}

export function logout() {
  localStorage.removeItem('launchpad_token');
  localStorage.removeItem('launchpad_user');
  window.location.href = '/login';
}
