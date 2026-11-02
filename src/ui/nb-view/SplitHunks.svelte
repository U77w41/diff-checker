<script lang="ts">
  import { pairHunkRows } from '../../core/text-diff/split';
  import type { DiffLine, Hunk, InlineSpan } from '../../core/text-diff/types';

  interface Props {
    hunks: Hunk[];
  }

  let { hunks }: Props = $props();

  interface Segment {
    text: string;
    marked: boolean;
  }

  /** Splits a line into plain and word-highlighted segments using its inline spans. */
  function segments(line: DiffLine): Segment[] {
    const spans: InlineSpan[] = [...(line.inline ?? [])].sort((x, y) => x.from - y.from);
    if (spans.length === 0) return [{ text: line.text, marked: false }];
    const out: Segment[] = [];
    let pos = 0;
    for (const span of spans) {
      if (span.from > pos) out.push({ text: line.text.slice(pos, span.from), marked: false });
      out.push({ text: line.text.slice(span.from, span.to), marked: true });
      pos = Math.max(pos, span.to);
    }
    if (pos < line.text.length) out.push({ text: line.text.slice(pos), marked: false });
    return out;
  }

  function sideClass(line: DiffLine | undefined): string {
    if (!line) return 'is-empty';
    if (line.kind === 'del') return 'is-del';
    if (line.kind === 'add') return 'is-add';
    return 'is-context';
  }
</script>

<div class="split-hunks">
  {#each hunks as hunk, hIdx (hIdx)}
    <div class="split-hunk-hdr">
      @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
    </div>
    {#each pairHunkRows(hunk) as row, rIdx (rIdx)}
      <div class="split-row">
        <span class="split-no left {sideClass(row.left)}">{row.left?.oldNo ?? ''}</span>
        <span class="split-text left {sideClass(row.left)}"
          >{#if row.left}{#each segments(row.left) as seg, sIdx (sIdx)}{#if seg.marked}<mark
                  class="split-word">{seg.text}</mark
                >{:else}{seg.text}{/if}{/each}{/if}</span
        >
        <span class="split-no right {sideClass(row.right)}">{row.right?.newNo ?? ''}</span>
        <span class="split-text right {sideClass(row.right)}"
          >{#if row.right}{#each segments(row.right) as seg, sIdx (sIdx)}{#if seg.marked}<mark
                  class="split-word">{seg.text}</mark
                >{:else}{seg.text}{/if}{/each}{/if}</span
        >
      </div>
    {/each}
  {/each}
</div>

<style>
  .split-hunks {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    line-height: 1.55;
    background: var(--bg);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .split-hunk-hdr {
    grid-column: 1 / -1;
    padding: 2px 8px;
    color: var(--text-muted);
    background: var(--surface);
    border-top: 1px solid var(--border);
  }

  .split-hunk-hdr:first-child {
    border-top: none;
  }

  /* Each row's cells join the parent grid, so a wrapped line grows both sides together. */
  .split-row {
    display: contents;
  }

  .split-no {
    padding: 0 6px;
    text-align: right;
    color: var(--text-muted);
    user-select: none;
    min-width: 2.5ch;
  }

  .split-no.right {
    border-left: 1px solid var(--border);
  }

  .split-text {
    padding: 0 8px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    min-width: 0;
  }

  /* Body-colour text on tinted rows keeps AA contrast in both themes; tint + marks carry meaning. */
  .is-del {
    background: var(--diff-del-bg);
    color: var(--text-main);
  }

  .is-add {
    background: var(--diff-add-bg);
    color: var(--text-main);
  }

  .is-empty {
    background: var(--surface);
  }

  .split-word {
    color: inherit;
    border-radius: 2px;
  }

  .is-del .split-word {
    background: var(--diff-del-strong);
  }

  .is-add .split-word {
    background: var(--diff-add-strong);
  }
</style>
