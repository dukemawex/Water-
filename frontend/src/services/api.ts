import { useAuthStore } from '../store/authStore';

const BASE_URL = '/api';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    useAuthStore.getState().clearAuth();
    window.location.href = '/login';
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Request failed');
  return data.data as T;
}

export async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Request failed');
  return data.data as T;
}
