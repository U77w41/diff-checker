import * as Comlink from 'comlink';
import type { DiffWorkerApi } from './diff.worker';
import type { DiffOptions, TextDiffResult } from '../core/text-diff/types';
import { diffText as mainThreadDiffText } from '../core/text-diff/diff';
import { DiffError } from '../core/file-reader';

export class WorkerManager {
  private worker: Worker | null = null;
  private api: Comlink.Remote<DiffWorkerApi> | null = null;
  private currentTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.spawn();
  }

  public spawn(): void {
    this.terminate();
    try {
      this.worker = new Worker(new URL('./diff.worker.ts', import.meta.url), {
        type: 'module'
      });
      this.api = Comlink.wrap<DiffWorkerApi>(this.worker);
    } catch {
      // Fallback for environments where Web Workers are unavailable
      this.worker = null;
      this.api = null;
    }
  }

  public terminate(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.api = null;
    }
  }

  public async diffText(
    a: string,
    b: string,
    opts: DiffOptions,
    onSlow?: () => void
  ): Promise<TextDiffResult> {
    if (!this.api || !this.worker) {
      // Fallback to main thread execution
      return mainThreadDiffText(a, b, opts);
    }

    const totalSize = a.length + b.length;

    return new Promise<TextDiffResult>((resolve, reject) => {
      let isSettled = false;

      // 10s timeout triggers onSlow / cancel opportunity
      const slowTimer = setTimeout(() => {
        if (!isSettled && onSlow) {
          onSlow();
        }
      }, 10000);

      const cancelTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          this.spawn();
          reject(
            new DiffError(
              'CANCELLED',
              'Diff took over 10 seconds and was cancelled. Try disabling character-level highlighting.'
            )
          );
        }
      }, 30000);

      this.api!.diffText(a, b, opts)
        .then((res) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(slowTimer);
            clearTimeout(cancelTimer);
            resolve(res);
          }
        })
        .catch((err) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(slowTimer);
            clearTimeout(cancelTimer);

            // Inputs under 1 MB: retry on main thread
            if (totalSize < 1024 * 1024) {
              try {
                const fallbackRes = mainThreadDiffText(a, b, opts);
                resolve(fallbackRes);
              } catch (fallbackErr) {
                reject(fallbackErr);
              }
            } else {
              this.spawn();
              reject(err);
            }
          }
        });
    });
  }
}

export const workerManager = new WorkerManager();
