// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSettings,
  saveSettings,
  SETTINGS_STORAGE_KEY,
  type StoredSettings
} from '../../src/app/settings';

describe('Settings & Input Persistence (src/app/settings.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loads default settings when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings.mode).toBe('text');
    expect(settings.viewMode).toBe('split');
    expect(settings.granularity).toBe('word');
    expect(settings.rememberInputs).toBe(false);
    expect(settings.savedInputs).toBeUndefined();
  });

  it('saves and reloads settings correctly', () => {
    const custom: StoredSettings = {
      mode: 'notebook',
      viewMode: 'unified',
      granularity: 'char',
      ignoreWhitespace: true,
      ignoreCase: false,
      ignoreLineEndings: true,
      ignoreBlankLines: true,
      hideOutputs: true,
      hideMetadata: true,
      showUnchanged: true,
      similarityThreshold: 0.6,
      rememberInputs: false
    };

    const res = saveSettings(custom);
    expect(res.success).toBe(true);
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).not.toBeNull();

    const reloaded = loadSettings();
    expect(reloaded).toMatchObject(custom);
    expect(reloaded.savedInputs).toBeUndefined();
  });

  it('persists inputs only when rememberInputs is true', () => {
    const withInputs: StoredSettings = {
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
      rememberInputs: true,
      savedInputs: {
        textA: 'original text',
        textB: 'modified text',
        fileNameA: 'a.txt',
        fileNameB: 'b.txt'
      }
    };

    saveSettings(withInputs);
    const reloaded = loadSettings();
    expect(reloaded.rememberInputs).toBe(true);
    expect(reloaded.savedInputs).toEqual(withInputs.savedInputs);
  });

  it('clears saved inputs when rememberInputs is switched to false', () => {
    const withInputs: StoredSettings = {
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
      rememberInputs: true,
      savedInputs: {
        textA: 'original text',
        textB: 'modified text'
      }
    };

    saveSettings(withInputs);
    expect(loadSettings().savedInputs).toBeDefined();

    // Turn off rememberInputs
    saveSettings({ ...withInputs, rememberInputs: false, savedInputs: undefined });
    expect(loadSettings().savedInputs).toBeUndefined();
  });

  it('handles localStorage read errors gracefully (storage disabled)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: The operation is insecure.');
    });

    const settings = loadSettings();
    expect(settings.mode).toBe('text');
  });

  it('handles localStorage write errors (quota exceeded or blocked)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const settings: StoredSettings = {
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
      rememberInputs: true,
      savedInputs: {
        textA: 'very large text',
        textB: 'very large text'
      }
    };

    const res = saveSettings(settings);
    expect(res.success).toBe(false);
    expect(res.error).toBe("Couldn't save inputs on this device");
  });
});
