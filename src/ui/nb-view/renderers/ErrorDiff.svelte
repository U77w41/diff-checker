<script lang="ts">
  import type { TextDiffResult } from '../../../core/text-diff/types';

  interface Props {
    diff: TextDiffResult;
  }

  let { diff }: Props = $props();
</script>

<div class="error-diff-container">
  <div class="error-header">
    <span class="error-badge">Traceback Error</span>
  </div>

  <div class="error-body">
    {#each diff.hunks as hunk, hIdx (hIdx)}
      <div class="hunk-section">
        <div class="hunk-meta">
          @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
        </div>
        {#each hunk.lines as line, lIdx (lIdx)}
          <div class="error-line line-{line.kind}">
            <span class="gutter-sym">
              {line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '}
            </span>
            <span class="text-span">{line.text}</span>
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .error-diff-container {
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(239, 68, 68, 0.4);
    border-radius: var(--radius-sm);
    background: rgba(239, 68, 68, 0.05);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    overflow: hidden;
    margin: 0.4rem 0;
  }

  .error-header {
    background: rgba(239, 68, 68, 0.12);
    padding: 0.25rem 0.5rem;
    border-bottom: 1px solid rgba(239, 68, 68, 0.2);
  }

  .error-badge {
    text-transform: uppercase;
    font-size: 0.65rem;
    font-weight: 700;
    color: #ef4444;
  }

  .error-body {
    padding: 0.4rem 0;
    overflow-x: auto;
  }

  .hunk-meta {
    color: var(--text-muted);
    padding: 0.15rem 0.5rem;
    font-size: 0.7rem;
  }

  .error-line {
    display: flex;
    padding: 0.1rem 0.5rem;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .line-add {
    background: var(--diff-add-bg);
    color: var(--diff-add-text);
  }

  .line-del {
    background: var(--diff-del-bg);
    color: var(--diff-del-text);
  }

  .gutter-sym {
    width: 1.2rem;
    flex-shrink: 0;
    user-select: none;
    opacity: 0.7;
  }

  .text-span {
    flex: 1;
  }
</style>
