import type { Granularity } from '../core/text-diff/types';

export const SETTINGS_STORAGE_KEY = 'diff-checker:settings';

export interface SavedInputs {
  textA: string;
  textB: string;
  fileNameA?: string;
  fileNameB?: string;
}

export interface StoredSettings {
  mode: 'text' | 'notebook';
  viewMode: 'split' | 'unified';
  granularity: Granularity;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  ignoreLineEndings: boolean;
  ignoreBlankLines: boolean;
  hideOutputs: boolean;
  hideMetadata: boolean;
  showUnchanged: boolean;
  similarityThreshold: number;
  rememberInputs: boolean;
  savedInputs?: SavedInputs;
}

export const DEFAULT_SETTINGS: StoredSettings = {
  mode: 'text',
  viewMode: 'split',
  granularity: 'word',
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreLineEndings: true,
  ignoreBlankLines: false,
  hideOutputs: false,
  hideMetadata: false,
  showUnchanged: false,
  similarityThreshold: 0.5,
  rememberInputs: false
};

/**
 * Loads stored settings from localStorage.
 * Degrades gracefully if storage is disabled or corrupted.
 */
export function loadSettings(): StoredSettings {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      savedInputs: parsed.rememberInputs ? parsed.savedInputs : undefined
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Saves settings to localStorage.
 * If rememberInputs is false, any saved inputs are omitted.
 * Returns success status and optional error message if blocked/full.
 */
export function saveSettings(settings: StoredSettings): { success: boolean; error?: string } {
  try {
    if (typeof localStorage === 'undefined') {
      return { success: false, error: "Couldn't save inputs on this device" };
    }

    const toStore: StoredSettings = {
      ...settings,
      savedInputs: settings.rememberInputs ? settings.savedInputs : undefined
    };

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(toStore));
    return { success: true };
  } catch {
    return { success: false, error: "Couldn't save inputs on this device" };
  }
}
