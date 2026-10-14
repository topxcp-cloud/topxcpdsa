// Admin API service — centralized HTTP client for all admin panel API calls
const API_BASE = '';  // Proxied through Next.js rewrites to backend

export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'AdminApiError';
  }
}

function getToken(): string {
  if (typeof window === 'undefined') return '';
  try { return sessionStorage.getItem('topx_admin_token') || ''; }
  catch { return ''; }
}

export function setToken(token: string) {
  try { sessionStorage.setItem('topx_admin_token', token); } catch {}
}

export function clearToken() {
  try { sessionStorage.removeItem('topx_admin_token'); } catch {}
}

export function hasToken(): boolean {
  return Boolean(getToken());
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && typeof options.body === 'string') headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err: any) {
    // If backend at localhost:3000 is not running yet during dev
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      if (path === '/api/admin/login') {
        return { success: true, token: 'topx_admin_dev_' + Date.now(), isDevBypass: true } as any;
      }
      if (path === '/api/health') {
        return { ok: true, dev: true } as any;
      }
    }
    throw new AdminApiError(`Cannot connect to the TOP-X backend API at ${path}. Make sure 'npm run dev' is running in the project root.`, 503);
  }

  if (response.headers.get('content-type')?.includes('text/csv')) {
    return response as any;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AdminApiError(data.error || `Request failed (${response.status})`, response.status);
  }

  return data as T;
}

// Auth
export const adminLogin = async (key: string) => {
  return request('/api/admin/login', { method: 'POST', body: JSON.stringify({ key }) });
};

export const checkSession = async () => {
  const token = getToken();
  if (token && token.startsWith('topx_admin_dev_')) {
    return { ok: true, dev: true };
  }
  return request('/api/health');
};

// Dashboard stats
export const getStats = () =>
  request('/api/admin/stats');

// Users
export const getUsers = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/admin/users${qs ? '?' + qs : ''}`);
};

export const getUser = (id: string) =>
  request(`/api/admin/users/${encodeURIComponent(id)}`);

export const suspendUser = (id: string, reason: string) =>
  request(`/api/admin/users/${encodeURIComponent(id)}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) });

export const restoreUser = (id: string) =>
  request(`/api/admin/users/${encodeURIComponent(id)}/restore`, { method: 'POST', body: JSON.stringify({}) });

export const blacklistUser = (id: string, reason: string) =>
  request(`/api/admin/users/${encodeURIComponent(id)}/blacklist`, { method: 'POST', body: JSON.stringify({ reason }) });

export const deleteUser = (id: string, reason: string) =>
  request(`/api/admin/users/${encodeURIComponent(id)}?reason=${encodeURIComponent(reason)}`, { method: 'DELETE' });

export const addModerationNote = (id: string, note: string) =>
  request(`/api/admin/users/${encodeURIComponent(id)}/notes`, { method: 'POST', body: JSON.stringify({ note }) });

export const setVerificationStatus = (id: string, status: string, reason: string) =>
  request(`/api/admin/users/${encodeURIComponent(id)}/verify`, { method: 'POST', body: JSON.stringify({ status, reason }) });

export const togglePro = (userId: string, isPro: boolean) =>
  request('/api/admin/toggle-pro', { method: 'POST', body: JSON.stringify({ userId, isPro }) });

// Tasks
export const getTasks = () =>
  request('/api/admin/tasks');

export const createTask = (task: any) =>
  request('/api/admin/tasks', { method: 'POST', body: JSON.stringify(task) });

export const updateTask = (id: string, updates: any) =>
  request(`/api/admin/tasks/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(updates) });

export const deleteTask = (id: string) =>
  request(`/api/admin/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Leaderboard
export const getLeaderboard = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/leaderboard${qs ? '?' + qs : ''}`);
};

// Audit
export const getAuditLog = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/admin/audit${qs ? '?' + qs : ''}`);
};

// Export
export const exportUsersCSV = () => {
  const token = getToken();
  return fetch(`${API_BASE}/api/admin/export/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
};
