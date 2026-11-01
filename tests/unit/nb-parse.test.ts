import { describe, it, expect } from 'vitest';
import { parseNotebook } from '../../src/core/nb-parse/parse';
import { DiffError } from '../../src/core/errors';

describe('parseNotebook', () => {
  it('parses a minimal valid nbformat 4 notebook', () => {
    const raw = JSON.stringify({
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {
        kernelspec: { name: 'python3', display_name: 'Python 3' },
        language_info: { name: 'python', version: '3.11.0' }
      },
      cells: [
        {
          id: 'cell-1',
          cell_type: 'code',
          source: ['import math\n', 'math.sqrt(16)'],
          execution_count: 1,
          metadata: {},
          outputs: [
            {
              output_type: 'execute_result',
              execution_count: 1,
              data: { 'text/plain': ['4.0'] },
              metadata: {}
            }
          ]
        }
      ]
    });

    const nb = parseNotebook(raw);
    expect(nb.nbformat).toBe(4);
    expect(nb.nbformatMinor).toBe(5);
    expect(nb.cells).toHaveLength(1);

    const cell = nb.cells[0]!;
    expect(cell.id).toBe('cell-1');
    expect(cell.type).toBe('code');
    expect(cell.source).toBe('import math\nmath.sqrt(16)');
    expect(cell.executionCount).toBe(1);
    expect(cell.outputs).toHaveLength(1);
    expect(cell.outputs[0]).toEqual({
      kind: 'rich',
      outputType: 'execute_result',
      data: { 'text/plain': '4.0' },
      metadata: {}
    });
  });

  it('throws DiffError with UNSUPPORTED_NBFORMAT for nbformat < 4', () => {
    const v3 = JSON.stringify({
      nbformat: 3,
      nbformat_minor: 0,
      worksheets: [{ cells: [] }]
    });

    expect(() => parseNotebook(v3)).toThrowError(DiffError);
    try {
      parseNotebook(v3);
    } catch (err: unknown) {
      expect(err instanceof DiffError).toBe(true);
      if (err instanceof DiffError) {
        expect(err.code).toBe('UNSUPPORTED_NBFORMAT');
        expect(err.message).toContain('Only nbformat 4');
      }
    }
  });

  it('throws DiffError with INVALID_JSON for malformed JSON text', () => {
    const badJson = '{\n  "cells": [ incomplete...';
    expect(() => parseNotebook(badJson)).toThrowError(DiffError);
    try {
      parseNotebook(badJson);
    } catch (err: unknown) {
      expect(err instanceof DiffError).toBe(true);
      if (err instanceof DiffError) {
        expect(err.code).toBe('INVALID_JSON');
      }
    }
  });

  it('fills missing fields with standard defaults', () => {
    const raw = JSON.stringify({
      nbformat: 4,
      cells: [
        {
          cell_type: 'code'
        }
      ]
    });

    const nb = parseNotebook(raw);
    expect(nb.nbformatMinor).toBe(0);
    expect(nb.metadata).toEqual({});
    expect(nb.cells[0]?.source).toBe('');
    expect(nb.cells[0]?.executionCount).toBeNull();
    expect(nb.cells[0]?.metadata).toEqual({});
    expect(nb.cells[0]?.outputs).toEqual([]);
  });

  it('handles stream, error, and display_data outputs', () => {
    const raw = JSON.stringify({
      nbformat: 4,
      cells: [
        {
          cell_type: 'code',
          source: 'print("hello"); 1/0',
          outputs: [
            {
              output_type: 'stream',
              name: 'stdout',
              text: ['hello\n', 'world\n']
            },
            {
              output_type: 'display_data',
              data: {
                'image/png':
                  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                'text/plain': ['<Figure size 640x480>']
              },
              metadata: {}
            },
            {
              output_type: 'error',
              ename: 'ZeroDivisionError',
              evalue: 'division by zero',
              traceback: [
                'Traceback (most recent call last):',
                'ZeroDivisionError: division by zero'
              ]
            }
          ]
        }
      ]
    });

    const nb = parseNotebook(raw);
    const outputs = nb.cells[0]?.outputs ?? [];
    expect(outputs).toHaveLength(3);

    expect(outputs[0]).toEqual({
      kind: 'stream',
      name: 'stdout',
      text: 'hello\nworld\n'
    });

    expect(outputs[1]).toEqual({
      kind: 'rich',
      outputType: 'display_data',
      data: {
        'image/png':
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'text/plain': '<Figure size 640x480>'
      },
      metadata: {}
    });

    expect(outputs[2]).toEqual({
      kind: 'error',
      ename: 'ZeroDivisionError',
      evalue: 'division by zero',
      traceback: ['Traceback (most recent call last):', 'ZeroDivisionError: division by zero']
    });
  });

  it('ignores duplicated cell IDs within a notebook', () => {
    const raw = JSON.stringify({
      nbformat: 4,
      cells: [
        { id: 'dup-id', cell_type: 'code', source: 'a = 1' },
        { id: 'unique-id', cell_type: 'code', source: 'b = 2' },
        { id: 'dup-id', cell_type: 'code', source: 'c = 3' }
      ]
    });

    const nb = parseNotebook(raw);
    expect(nb.cells[0]?.id).toBeUndefined(); // duplicated -> stripped
    expect(nb.cells[1]?.id).toBe('unique-id'); // unique -> preserved
    expect(nb.cells[2]?.id).toBeUndefined(); // duplicated -> stripped
  });

  it('preserves markdown cell attachments', () => {
    const raw = JSON.stringify({
      nbformat: 4,
      cells: [
        {
          cell_type: 'markdown',
          source: '![diagram](attachment:diagram.png)',
          attachments: {
            'diagram.png': {
              'image/png': 'iVBORw0KGgoAAAANSUhEUgAAAAUA...'
            }
          }
        }
      ]
    });

    const nb = parseNotebook(raw);
    expect(nb.cells[0]?.attachments).toEqual({
      'diagram.png': {
        'image/png': 'iVBORw0KGgoAAAANSUhEUgAAAAUA...'
      }
    });
  });
});
