import { apiRequest } from './queryClient';

export interface User {
  id: string;
  username: string;
}

export async function login(username: string, password: string): Promise<User> {
  const response = await apiRequest('POST', '/api/login', { username, password });
  return await response.json();
}

export async function logout(): Promise<void> {
  await apiRequest('POST', '/api/logout');
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await apiRequest('GET', '/api/me');
    return await response.json();
  } catch (error) {
    return null;
  }
}
