import { useAuthStore } from '../store/authStore';

/**
 * Fetch a CSRF token from the server (double-submit cookie pattern).
 * The server sets a csrf_token cookie (non-httpOnly) and returns the token value.
 * We must echo it back in the X-CSRF-Token header for state-mutating requests.
 */
async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/auth/csrf-token', { credentials: 'include' });
  const data = await res.json() as { success: boolean; data: { csrfToken: string } };
  if (!data.success) throw new Error('Failed to obtain CSRF token');
  return data.data.csrfToken;
}

export async function login(email: string, password: string) {
  const csrfToken = await fetchCsrfToken();
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  const data = await res.json() as { success: boolean; message: string; data: { accessToken: string; user: { id: string; email: string; name: string; role: string } } };
  if (!data.success) throw new Error(data.message);

  const { accessToken, user } = data.data;
  useAuthStore.getState().setAuth(accessToken, user);
  return user;
}

export async function logout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${useAuthStore.getState().token ?? ''}` },
    credentials: 'include',
  });
  useAuthStore.getState().clearAuth();
}
