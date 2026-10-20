export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers, credentials: 'same-origin' });
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}
