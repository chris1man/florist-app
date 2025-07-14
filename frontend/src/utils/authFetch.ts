export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = localStorage.getItem('token');
  if (!init.headers) init.headers = {};
  (init.headers as any)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(input, init);
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return Promise.reject(new Error('Unauthorized'));
  }
  return res;
} 