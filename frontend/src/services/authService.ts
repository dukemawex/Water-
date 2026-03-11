import { useAuthStore } from '../store/authStore';

export async function login(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message);

  const { accessToken, user } = data.data;
  useAuthStore.getState().setAuth(accessToken, user);
  return user;
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  useAuthStore.getState().clearAuth();
}
