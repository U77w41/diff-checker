export type CellType = 'code' | 'markdown' | 'raw';

export type NbOutput =
  | { kind: 'stream'; name: 'stdout' | 'stderr'; text: string }
  | {
      kind: 'rich';
      outputType: 'execute_result' | 'display_data';
      data: Record<string, string>;
      metadata: Record<string, unknown>;
    }
  | { kind: 'error'; ename: string; evalue: string; traceback: string[] };

export interface NbCell {
  id?: string; // nbformat >= 4.5
  type: CellType;
  source: string; // source array joined into one string
  outputs: NbOutput[]; // empty for markdown/raw
  executionCount: number | null;
  metadata: Record<string, unknown>;
  attachments?: Record<string, Record<string, string>>;
}

export interface Notebook {
  nbformat: number;
  nbformatMinor: number;
  metadata: Record<string, unknown>; // kernelspec, language_info, ...
  cells: NbCell[];
}
