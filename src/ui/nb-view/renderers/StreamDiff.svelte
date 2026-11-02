<script lang="ts">
  import SplitHunks from '../SplitHunks.svelte';
  import type { TextDiffResult } from '../../../core/text-diff/types';

  interface Props {
    diff: TextDiffResult;
    name?: 'stdout' | 'stderr';
    viewMode?: 'side-by-side' | 'unified';
  }

  let { diff, name = 'stdout', viewMode = 'side-by-side' }: Props = $props();
</script>

<div class="stream-diff-container stream-{name}">
  <div class="stream-header">
    <span class="stream-badge">{name}</span>
  </div>

  <div class="stream-body">
    {#if viewMode === 'side-by-side'}
      <SplitHunks hunks={diff.hunks} />
    {:else}
      {#each diff.hunks as hunk, hIdx (hIdx)}
        <div class="hunk-section">
          <div class="hunk-meta">
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
          </div>
          {#each hunk.lines as line, lIdx (lIdx)}
            <div class="stream-line line-{line.kind}">
              <span class="gutter-sym">
                {line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '}
              </span>
              <span class="text-span">{line.text}</span>
            </div>
          {/each}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .stream-diff-container {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    overflow: hidden;
    margin: 0.4rem 0;
  }

  .stream-header {
    background: var(--bg);
    padding: 0.25rem 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  .stream-badge {
    text-transform: uppercase;
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--text-muted);
  }

  .stream-body {
    padding: 0.4rem 0;
    overflow-x: auto;
  }

  .hunk-meta {
    color: var(--text-muted);
    padding: 0.15rem 0.5rem;
    font-size: 0.7rem;
  }

  .stream-line {
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
