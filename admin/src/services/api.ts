// Admin API service — centralized HTTP client for all admin panel API calls
import type { EventField, EventRecord, EventRegistration, StreakRewardClaim } from '../types';

const API_BASE = '';  // Proxied through Next.js rewrites to backend

export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'AdminApiError';
  }
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && typeof options.body === 'string') headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'same-origin' });
  } catch {
    throw new AdminApiError(`Cannot connect to the TOP-X backend API at ${path}. Check the server and PostgreSQL connection.`, 503);
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

export const adminLogout = async () => request('/api/admin/logout', { method: 'POST' });

export const checkSession = async () => {
  return request('/api/admin/overview');
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

export const getTaskProgress = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/admin/tasks/progress${qs ? '?' + qs : ''}`);
};

export const createTask = (task: any) =>
  request('/api/admin/tasks', { method: 'POST', body: JSON.stringify(task) });

export const updateTask = (id: string, updates: any) =>
  request(`/api/admin/tasks/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(updates) });

export const deleteTask = (id: string) =>
  request(`/api/admin/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Audit
export const getAuditLog = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/admin/audit${qs ? '?' + qs : ''}`);
};

// Export
export const exportUsersCSV = (proOnly = false) => {
  const qs = proOnly ? '?proOnly=true' : '';
  return fetch(`${API_BASE}/api/admin/export/users${qs}`, { credentials: 'same-origin' });
};

// Event registration
export const getEvents = () =>
  request<{ events: EventRecord[] }>('/api/admin/events');

export const saveEvent = (event: {
  title: string;
  description: string;
  location: string;
  startsAt: string;
  imageUrl: string;
  imageData: string;
  eventUrl: string;
  eventLinkType: 'linkedin' | 'custom';
  eventLinkLabel: string;
  status: 'open' | 'closed';
  showOnWebsite?: boolean;
  fields: EventField[];
}, id?: string) =>
  request<{ event: EventRecord }>(id
    ? `/api/admin/events/${encodeURIComponent(id)}`
    : '/api/admin/events', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(event)
    });

export const deleteEvent = (id: string) =>
  request<{ success: boolean; deletedId: string }>(
    `/api/admin/events/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );

export const getEventRegistrations = (id: string, query = '') => {
  const qs = query ? `?q=${encodeURIComponent(query)}` : '';
  return request<{ registrations: EventRegistration[] }>(
    `/api/admin/events/${encodeURIComponent(id)}/registrations${qs}`
  );
};

export const exportEventRegistrations = (id: string) =>
  fetch(`${API_BASE}/api/admin/events/${encodeURIComponent(id)}/export`, {
    credentials: 'same-origin'
  });

export const getStreakRewardClaims = () =>
  request<{ claims: StreakRewardClaim[] }>('/api/admin/streak-rewards');
