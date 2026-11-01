<script lang="ts">
  import type { TextDiffResult } from '../../../core/text-diff/types';

  interface Props {
    a: string;
    b: string;
    sourceDiff?: TextDiffResult;
  }

  let { a, b, sourceDiff }: Props = $props();

  let showSourceDiff = $state(false);
</script>

<div class="html-renderer-container">
  <div class="html-header">
    <span class="html-title">HTML Output</span>
    {#if sourceDiff}
      <button
        type="button"
        class="btn-secondary btn-sm toggle-btn"
        onclick={() => (showSourceDiff = !showSourceDiff)}
      >
        {showSourceDiff ? 'Hide source diff' : 'View source diff'}
      </button>
    {/if}
  </div>

  {#if showSourceDiff && sourceDiff}
    <div class="source-diff-panel">
      {#each sourceDiff.hunks as hunk, hIdx (hIdx)}
        <div class="hunk-block">
          <div class="hunk-header">
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
          </div>
          {#each hunk.lines as line, lIdx (lIdx)}
            <div class="diff-line diff-{line.kind}">
              <span class="line-marker"
                >{line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '}</span
              >
              <span class="line-content">{line.text}</span>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {:else}
    <div class="iframe-comparison">
      <div class="iframe-col">
        <span class="side-label label-a">Original (A)</span>
        <iframe title="Original HTML Output" class="html-frame" sandbox="" srcdoc={a}></iframe>
      </div>
      <div class="iframe-col">
        <span class="side-label label-b">Modified (B)</span>
        <iframe title="Modified HTML Output" class="html-frame" sandbox="" srcdoc={b}></iframe>
      </div>
    </div>
  {/if}
</div>

<style>
  .html-renderer-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }

  .html-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .html-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--text-muted);
  }

  .toggle-btn {
    font-size: var(--font-size-xs);
    padding: 0.2rem 0.5rem;
  }

  .iframe-comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 640px) {
    .iframe-comparison {
      grid-template-columns: 1fr;
    }
  }

  .iframe-col {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .side-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
  }

  .label-a {
    color: var(--diff-del-text);
  }

  .label-b {
    color: var(--diff-add-text);
  }

  .html-frame {
    width: 100%;
    min-height: 180px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: #ffffff;
  }

  .source-diff-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    overflow-x: auto;
    padding: 0.5rem;
  }

  .hunk-header {
    color: var(--text-muted);
    font-weight: 600;
    padding: 0.2rem 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0.25rem;
  }

  .diff-line {
    display: flex;
    padding: 0.1rem 0.25rem;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .diff-add {
    background: var(--diff-add-bg);
    color: var(--diff-add-text);
  }

  .diff-del {
    background: var(--diff-del-bg);
    color: var(--diff-del-text);
  }

  .line-marker {
    width: 1.5rem;
    user-select: none;
    opacity: 0.7;
  }

  .line-content {
    flex: 1;
  }
</style>
