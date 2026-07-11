async function req(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
    body: options.body != null ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  me: () => req('/api/me'),
  login: (password) => req('/api/login', { method: 'POST', body: { password } }),
  logout: () => req('/api/logout', { method: 'POST' }),
  jobs: () => req('/api/jobs'),
  createJob: (body) => req('/api/jobs', { method: 'POST', body }),
  updateJob: (id, body) => req(`/api/jobs/${id}`, { method: 'PUT', body }),
  deleteJob: (id) => req(`/api/jobs/${id}`, { method: 'DELETE' }),
  candidates: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
    return req(`/api/candidates${qs.toString() ? '?' + qs : ''}`);
  },
  createCandidate: (body) => req('/api/candidates', { method: 'POST', body }),
  candidate: (id) => req(`/api/candidates/${id}`),
  updateCandidate: (id, body) => req(`/api/candidates/${id}`, { method: 'PATCH', body }),
  deleteCandidate: (id) => req(`/api/candidates/${id}`, { method: 'DELETE' }),
  addNote: (id, body) => req(`/api/candidates/${id}/notes`, { method: 'POST', body }),
  addScorecard: (id, body) => req(`/api/candidates/${id}/scorecards`, { method: 'POST', body })
};

export function timeAgo(ms) {
  if (!ms) return 'never';
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
