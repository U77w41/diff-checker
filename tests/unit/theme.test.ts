import { describe, it, expect, beforeEach } from 'vitest';
import { readSavedScheme, saveScheme, THEME_STORAGE_KEY } from '../../src/app/theme';

describe('theme storage and logic', () => {
  beforeEach(() => {
    // Mock localStorage in Node environment
    const storage: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, val: string) => {
        storage[key] = val;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
      key: (i: number) => Object.keys(storage)[i] ?? null,
      length: 0
    };
  });

  it('defaults to auto when no preference is saved', () => {
    expect(readSavedScheme()).toBe('auto');
  });

  it('saves and reads valid theme schemes', () => {
    saveScheme('dark');
    expect(readSavedScheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    saveScheme('light');
    expect(readSavedScheme()).toBe('light');

    saveScheme('auto');
    expect(readSavedScheme()).toBe('auto');
  });

  it('falls back to auto when invalid value is in localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid-scheme');
    expect(readSavedScheme()).toBe('auto');
  });
});
