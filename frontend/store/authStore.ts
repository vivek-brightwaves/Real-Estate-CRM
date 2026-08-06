import { create } from 'zustand';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  must_change_password?: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (access: string, refresh: string, user: User, remember?: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const getStorageItem = (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  };

  return {
    accessToken: getStorageItem('accessToken'),
    refreshToken: getStorageItem('refreshToken'),
    user: typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null') 
      : null,
    setAuth: (access, refresh, user, remember = true) => {
      const storage = remember ? localStorage : sessionStorage;
      const otherStorage = remember ? sessionStorage : localStorage;

      // Clean the other storage to prevent duplicate state sync problems
      otherStorage.removeItem('accessToken');
      otherStorage.removeItem('refreshToken');
      otherStorage.removeItem('user');

      storage.setItem('accessToken', access);
      storage.setItem('refreshToken', refresh);
      storage.setItem('user', JSON.stringify(user));
      set({ accessToken: access, refreshToken: refresh, user });
    },
    clearAuth: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
      }
      set({ accessToken: null, refreshToken: null, user: null });
    },
  };
});
