const TOKEN_KEY = 'topx_token';

function getBrowserStorage() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getBrowserStorage()?.getItem(TOKEN_KEY);
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { ...options, headers });
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(payload?.error || payload?.message || `Request failed (${response.status})`);
  return payload;
}

export function saveSession({ token, user }) {
  const storage = getBrowserStorage();
  if (!storage) return;
  try {
    if (token) storage.setItem(TOKEN_KEY, token);
    if (user) storage.setItem('topx_user', JSON.stringify(user));
  } catch {}
}

export function clearSession() {
  const storage = getBrowserStorage();
  if (!storage) return;
  try {
    storage.removeItem(TOKEN_KEY);
    storage.removeItem('topx_user');
  } catch {}
}
