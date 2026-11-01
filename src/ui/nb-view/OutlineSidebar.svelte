<script lang="ts">
  import type { CellDiff } from '../../core/nb-diff/types';
  import type { Notebook } from '../../core/nb-parse/types';

  interface Props {
    cells: CellDiff[];
    nbA?: Notebook;
    nbB?: Notebook;
    isOpenMobile: boolean;
    onCloseMobile: () => void;
  }

  let { cells, nbA, nbB, isOpenMobile, onCloseMobile }: Props = $props();

  function getCellSnippet(diff: CellDiff): string {
    const op = diff.op;
    let source = '';
    if (op.op === 'unchanged' || op.op === 'modified' || op.op === 'moved') {
      source = nbB?.cells[op.b]?.source || nbA?.cells[op.a]?.source || '';
    } else if (op.op === 'added') {
      source = nbB?.cells[op.b]?.source || '';
    } else if (op.op === 'deleted') {
      source = nbA?.cells[op.a]?.source || '';
    }
    const firstLine = source.split('\n')[0]?.trim() || '';
    return firstLine.length > 30 ? firstLine.slice(0, 30) + '…' : firstLine || '(empty)';
  }

  function scrollToCell(idx: number) {
    const el = document.getElementById(`cell-card-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onCloseMobile();
  }

  const changedCells = $derived(
    cells.map((cell, idx) => ({ cell, idx })).filter(({ cell }) => cell.op.op !== 'unchanged')
  );
</script>

<aside class="outline-sidebar {isOpenMobile ? 'mobile-open' : ''}">
  <div class="sidebar-header">
    <span class="sidebar-title">Outline ({changedCells.length})</span>
    <button
      type="button"
      class="close-mobile-btn"
      onclick={onCloseMobile}
      aria-label="Close outline"
    >
      ✕
    </button>
  </div>

  <div class="sidebar-list" role="navigation" aria-label="Changed cells outline">
    {#if changedCells.length === 0}
      <div class="empty-outline">All cells are unchanged</div>
    {:else}
      {#each changedCells as item (item.idx)}
        <button
          type="button"
          class="outline-item op-{item.cell.op.op}"
          onclick={() => scrollToCell(item.idx)}
        >
          <span class="op-icon" aria-hidden="true">
            {#if item.cell.op.op === 'added'}
              +
            {:else if item.cell.op.op === 'deleted'}
              −
            {:else if item.cell.op.op === 'modified'}
              ✎
            {:else if item.cell.op.op === 'moved'}
              ⇄
            {/if}
          </span>
          <span class="cell-label">#{item.idx + 1}</span>
          <span class="cell-snippet">{getCellSnippet(item.cell)}</span>
        </button>
      {/each}
    {/if}
  </div>
</aside>

{#if isOpenMobile}
  <div class="mobile-backdrop" onclick={onCloseMobile} aria-hidden="true"></div>
{/if}

<style>
  .outline-sidebar {
    width: 240px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    max-height: calc(100vh - 160px);
    position: sticky;
    top: 5rem;
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }

  .sidebar-title {
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .close-mobile-btn {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .sidebar-list {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 0.25rem 0;
  }

  .empty-outline {
    padding: 1rem;
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    text-align: center;
  }

  .outline-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.65rem;
    font-size: var(--font-size-xs);
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    border-left: 3px solid transparent;
    transition: background 0.15s;
    width: 100%;
  }

  .outline-item:hover {
    background: var(--bg);
  }

  .op-icon {
    font-weight: 700;
    width: 1.2rem;
    text-align: center;
  }

  .op-added .op-icon {
    color: var(--diff-add-text);
  }
  .op-added {
    border-left-color: var(--diff-add-text);
  }

  .op-deleted .op-icon {
    color: var(--diff-del-text);
  }
  .op-deleted {
    border-left-color: var(--diff-del-text);
  }

  .op-modified .op-icon {
    color: #eab308;
  }
  .op-modified {
    border-left-color: #eab308;
  }

  .op-moved .op-icon {
    color: #3b82f6;
  }
  .op-moved {
    border-left-color: #3b82f6;
  }

  .cell-label {
    font-weight: 600;
    color: var(--text-muted);
    font-size: 0.7rem;
  }

  .cell-snippet {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
    flex: 1;
  }

  /* Mobile slide-out drawer */
  @media (max-width: 768px) {
    .outline-sidebar {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      width: 280px;
      max-height: 100vh;
      z-index: 100;
      transform: translateX(-100%);
      transition: transform 0.25s ease-out;
      border-radius: 0;
      box-shadow: 2px 0 12px rgba(0, 0, 0, 0.2);
    }

    .outline-sidebar.mobile-open {
      transform: translateX(0);
    }

    .close-mobile-btn {
      display: block;
    }

    .mobile-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 99;
    }
  }
</style>
