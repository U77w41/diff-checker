export const THEME_STORAGE_KEY = 'StackColorScheme';

export type Scheme = 'light' | 'dark' | 'auto';

const darkQuery =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

export function readSavedScheme(): Scheme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'auto' ? value : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveScheme(value: Scheme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // Storage blocked or unavailable; carries on
  }
}

export function systemScheme(): 'light' | 'dark' {
  return darkQuery && darkQuery.matches ? 'dark' : 'light';
}

export function isDark(scheme: Scheme = readSavedScheme()): boolean {
  return scheme === 'dark' || (scheme === 'auto' && systemScheme() === 'dark');
}

export function applyTheme(scheme: Scheme = readSavedScheme()): void {
  if (typeof document === 'undefined') return;
  const dark = isDark(scheme);
  document.documentElement.setAttribute('data-scheme', dark ? 'dark' : 'light');

  const metaTheme = document.querySelector('meta[name="theme-color"]:not([media])');
  if (metaTheme) {
    metaTheme.setAttribute('content', dark ? '#303030' : '#f5f5fa');
  }
}

export function toggleTheme(): Scheme {
  const current = readSavedScheme();
  const next: Scheme = isDark(current) ? 'light' : 'dark';
  const newScheme: Scheme = next === systemScheme() ? 'auto' : next;
  saveScheme(newScheme);
  applyTheme(newScheme);
  return newScheme;
}

export function initTheme(): () => void {
  applyTheme();

  const handleSystemChange = () => {
    if (readSavedScheme() === 'auto') {
      applyTheme('auto');
    }
  };

  if (darkQuery) {
    if (darkQuery.addEventListener) {
      darkQuery.addEventListener('change', handleSystemChange);
    } else if ('addListener' in darkQuery) {
      // For older webview compatibility
      (darkQuery as MediaQueryList).addListener(handleSystemChange);
    }
  }

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) {
      applyTheme(readSavedScheme());
    }
  };

  window.addEventListener('storage', handleStorageChange);

  // Turn on colour transitions after initial render
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.add('theme-ready');
    });
  });

  return () => {
    if (darkQuery) {
      if (darkQuery.removeEventListener) {
        darkQuery.removeEventListener('change', handleSystemChange);
      } else if ('removeListener' in darkQuery) {
        (darkQuery as MediaQueryList).removeListener(handleSystemChange);
      }
    }
    window.removeEventListener('storage', handleStorageChange);
  };
}
