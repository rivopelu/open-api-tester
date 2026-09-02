import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  theme: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'api-studio:theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(resolved: 'light' | 'dark', theme: ThemePreference) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-preference', theme);
  root.style.colorScheme = resolved;
}

const initialPreference: ThemePreference = (() => {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return 'system';
})();

const initialResolved: 'light' | 'dark' =
  initialPreference === 'system' ? getSystemTheme() : initialPreference;

applyTheme(initialResolved, initialPreference);

export const useThemeStore = create<ThemeState>((set, get) => {
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      const current = get().theme;
      if (current === 'system') {
        const nextResolved = e.matches ? 'light' : 'dark';
        applyTheme(nextResolved, 'system');
        set({ resolvedTheme: nextResolved });
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
  }

  return {
    theme: initialPreference,
    resolvedTheme: initialResolved,
    setTheme: (theme: ThemePreference) => {
      const resolved = theme === 'system' ? getSystemTheme() : theme;
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // ignore
      }
      applyTheme(resolved, theme);
      set({ theme, resolvedTheme: resolved });
    },
    toggleTheme: () => {
      const currentResolved = get().resolvedTheme;
      const nextTheme: ThemePreference = currentResolved === 'dark' ? 'light' : 'dark';
      get().setTheme(nextTheme);
    },
  };
});
