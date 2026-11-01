import { describe, it, expect } from 'vitest';
import { detectInputMode } from '../../src/core/detect';

describe('detectInputMode', () => {
  it('detects notebook mode from .ipynb filename', () => {
    expect(detectInputMode('analysis.ipynb', 'some text')).toBe('notebook');
    expect(detectInputMode('MY_NOTEBOOK.IPYNB', '')).toBe('notebook');
  });

  it('detects notebook mode from valid JSON containing cells and nbformat', () => {
    const validNb = JSON.stringify({
      cells: [],
      metadata: {},
      nbformat: 4,
      nbformat_minor: 2
    });
    expect(detectInputMode('untitled', validNb)).toBe('notebook');
    expect(detectInputMode(undefined, validNb)).toBe('notebook');
  });

  it('falls back to text mode for regular JSON without cells or nbformat', () => {
    const plainJson = JSON.stringify({ name: 'package', version: '1.0.0' });
    expect(detectInputMode('package.json', plainJson)).toBe('text');
    expect(detectInputMode(undefined, plainJson)).toBe('text');
  });

  it('falls back to text mode for non-JSON text', () => {
    expect(detectInputMode('script.py', 'print("hello world")')).toBe('text');
    expect(detectInputMode(undefined, 'just a plain string')).toBe('text');
    expect(detectInputMode('', '')).toBe('text');
  });

  it('tolerates whitespace around JSON', () => {
    const padded = `  \n  {"cells": [], "nbformat": 4}  \n`;
    expect(detectInputMode(undefined, padded)).toBe('notebook');
  });
});
