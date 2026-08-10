import { create } from 'zustand';
import { authApi, getToken, setToken, type AuthAccount } from '../lib/api';

interface AuthState {
  user: AuthAccount | null;
  initializing: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  completeGoogleSignIn: (token: string) => Promise<void>;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initializing: true,

  init: async () => {
    const token = getToken();
    if (!token) {
      set({ user: null, initializing: false });
      return;
    }
    try {
      const account = await authApi.me();
      set({ user: account, initializing: false });
    } catch {
      setToken(null);
      set({ user: null, initializing: false });
    }
  },

  signIn: async (email, password) => {
    const result = await authApi.signIn(email, password);
    setToken(result.access_token);
    set({ user: result.account });
    return true;
  },

  signUp: async (name, email, password) => {
    const result = await authApi.signUp(name, email, password);
    setToken(result.access_token);
    set({ user: result.account });
    return true;
  },

  completeGoogleSignIn: async (token) => {
    setToken(token);
    try {
      const account = await authApi.me();
      set({ user: account, initializing: false });
    } catch (error) {
      setToken(null);
      throw error;
    }
  },

  signOut: () => {
    setToken(null);
    set({ user: null });
  },
}));
