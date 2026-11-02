<script lang="ts">
  import type { NotebookDiffResult, NbDiffOptions } from '../../core/nb-diff/types';
  import { parseNotebook } from '../../core/nb-parse/parse';
  import type { Notebook } from '../../core/nb-parse/types';
  import OutlineSidebar from './OutlineSidebar.svelte';
  import NbFilterBar from './NbFilterBar.svelte';
  import CellCard from './CellCard.svelte';
  import UnchangedRun from './UnchangedRun.svelte';

  interface Props {
    diffResult: NotebookDiffResult;
    rawA: string;
    rawB: string;
    options: NbDiffOptions;
    onOptionsChange?: (opts: Partial<NbDiffOptions>) => void;
  }

  let { diffResult, rawA, rawB, options, onOptionsChange }: Props = $props();

  let isMobileOutlineOpen = $state(false);
  let showUnchanged = $state(false);
  let hideOutputs = $state(false);
  let hideMetadata = $state(true);
  let similarityThreshold = $state(0.5);

  $effect(() => {
    hideOutputs = !options.includeOutputs;
    hideMetadata = options.hideNoisyMetadata;
    similarityThreshold = options.similarityThreshold;
  });

  let nbA = $state<Notebook | undefined>(undefined);
  let nbB = $state<Notebook | undefined>(undefined);

  $effect(() => {
    try {
      nbA = parseNotebook(rawA);
    } catch {
      nbA = undefined;
    }
    try {
      nbB = parseNotebook(rawB);
    } catch {
      nbB = undefined;
    }
  });

  let selectedCellIndex = $state<number>(0);

  // Default to first changed cell if available
  $effect(() => {
    const firstChanged = diffResult.cells.findIndex((c) => c.op.op !== 'unchanged');
    selectedCellIndex = firstChanged !== -1 ? firstChanged : 0;
  });

  export function nextCell() {
    const cells = diffResult.cells;
    if (cells.length === 0) return;
    const changedIndices = cells
      .map((c, i) => (c.op.op !== 'unchanged' ? i : -1))
      .filter((i) => i !== -1);
    const targetList = changedIndices.length > 0 ? changedIndices : cells.map((_, i) => i);
    const next = targetList.find((i) => i > selectedCellIndex);
    handleSelectCell(next !== undefined ? next : targetList[0]!);
  }

  export function prevCell() {
    const cells = diffResult.cells;
    if (cells.length === 0) return;
    const changedIndices = cells
      .map((c, i) => (c.op.op !== 'unchanged' ? i : -1))
      .filter((i) => i !== -1);
    const targetList = changedIndices.length > 0 ? changedIndices : cells.map((_, i) => i);
    const reversed = [...targetList].reverse();
    const prev = reversed.find((i) => i < selectedCellIndex);
    handleSelectCell(prev !== undefined ? prev : reversed[0]!);
  }

  function handleSelectCell(idx: number) {
    selectedCellIndex = idx;
    for (const item of displayItems) {
      if (item.type === 'unchanged_run' && item.indices.includes(idx)) {
        expandedRuns[item.runId] = true;
        break;
      }
    }
    setTimeout(() => {
      const el = document.getElementById(`cell-card-${idx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 10);
  }

  function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (
      target?.matches('input, textarea, select, [contenteditable="true"]') ||
      target?.closest('.cm-editor')
    ) {
      return;
    }
    if (e.key === 'j') {
      e.preventDefault();
      nextCell();
    } else if (e.key === 'k') {
      e.preventDefault();
      prevCell();
    }
  }

  // Track expanded state for individual unchanged runs
  let expandedRuns = $state<Record<number, boolean>>({});

  type DisplayItem =
    { type: 'cell'; index: number } | { type: 'unchanged_run'; runId: number; indices: number[] };

  const displayItems = $derived.by(() => {
    const items: DisplayItem[] = [];
    const cells = diffResult.cells;
    let currentRun: number[] = [];
    let runCounter = 0;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]!;
      if (cell.op.op === 'unchanged' && !showUnchanged) {
        currentRun.push(i);
      } else {
        if (currentRun.length > 0) {
          items.push({
            type: 'unchanged_run',
            runId: runCounter++,
            indices: [...currentRun]
          });
          currentRun = [];
        }
        items.push({ type: 'cell', index: i });
      }
    }

    if (currentRun.length > 0) {
      items.push({
        type: 'unchanged_run',
        runId: runCounter++,
        indices: [...currentRun]
      });
    }

    return items;
  });

  function handleThresholdChange(val: number) {
    similarityThreshold = val;
    onOptionsChange?.({ similarityThreshold: val });
  }

  function handleToggleOutputs() {
    hideOutputs = !hideOutputs;
    onOptionsChange?.({ includeOutputs: !hideOutputs });
  }

  function handleToggleMetadata() {
    hideMetadata = !hideMetadata;
    onOptionsChange?.({ hideNoisyMetadata: hideMetadata });
  }

  function handleToggleUnchanged() {
    showUnchanged = !showUnchanged;
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="notebook-view-root">
  <!-- Top Notebook Header Changes (if any) -->
  {#if diffResult.header.length > 0}
    <div class="nb-header-banner card">
      <span class="banner-title">Notebook Environment Changes:</span>
      <div class="header-changes-list">
        {#each diffResult.header as item, idx (idx)}
          <span class="header-change-tag">
            <strong>{item.field}:</strong>
            <span class="val-del">{String(item.a ?? 'none')}</span> →
            <span class="val-add">{String(item.b ?? 'none')}</span>
          </span>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Mobile Outline Trigger -->
  <div class="mobile-outline-trigger-bar">
    <button
      type="button"
      class="btn-secondary btn-sm mobile-outline-btn"
      onclick={() => (isMobileOutlineOpen = true)}
    >
      📋 Open Outline
    </button>
  </div>

  <div class="nb-layout">
    <!-- Outline Sidebar -->
    <OutlineSidebar
      cells={diffResult.cells}
      {nbA}
      {nbB}
      {selectedCellIndex}
      onSelectCell={handleSelectCell}
      isOpenMobile={isMobileOutlineOpen}
      onCloseMobile={() => (isMobileOutlineOpen = false)}
    />

    <!-- Main Content Stream -->
    <div class="nb-main-content">
      <!-- Filter Bar -->
      <NbFilterBar
        {hideOutputs}
        {hideMetadata}
        {showUnchanged}
        {similarityThreshold}
        onToggleOutputs={handleToggleOutputs}
        onToggleMetadata={handleToggleMetadata}
        onToggleUnchanged={handleToggleUnchanged}
        onThresholdChange={handleThresholdChange}
      />

      <!-- Cell Cards and Unchanged Runs -->
      <div class="cells-stream">
        {#each displayItems as item (item.type === 'cell' ? 'cell-' + item.index : 'run-' + item.runId)}
          {#if item.type === 'cell'}
            <CellCard
              cellDiff={diffResult.cells[item.index]!}
              index={item.index}
              cellA={item.index < (nbA?.cells.length ?? 0) ? nbA?.cells[item.index] : undefined}
              cellB={item.index < (nbB?.cells.length ?? 0) ? nbB?.cells[item.index] : undefined}
              {hideOutputs}
              {hideMetadata}
              isSelected={selectedCellIndex === item.index}
              onSelect={() => (selectedCellIndex = item.index)}
            />
          {:else if item.type === 'unchanged_run'}
            {@const isExpanded = expandedRuns[item.runId] ?? false}
            <UnchangedRun
              count={item.indices.length}
              expanded={isExpanded}
              onToggle={() => (expandedRuns[item.runId] = !isExpanded)}
            />
            {#if isExpanded}
              {#each item.indices as cIdx (cIdx)}
                <CellCard
                  cellDiff={diffResult.cells[cIdx]!}
                  index={cIdx}
                  cellA={cIdx < (nbA?.cells.length ?? 0) ? nbA?.cells[cIdx] : undefined}
                  cellB={cIdx < (nbB?.cells.length ?? 0) ? nbB?.cells[cIdx] : undefined}
                  {hideOutputs}
                  {hideMetadata}
                  isSelected={selectedCellIndex === cIdx}
                  onSelect={() => (selectedCellIndex = cIdx)}
                />
              {/each}
            {/if}
          {/if}
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .notebook-view-root {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .nb-header-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    font-size: var(--font-size-xs);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    flex-wrap: wrap;
  }

  .banner-title {
    font-weight: 700;
    color: var(--text-muted);
  }

  .header-changes-list {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .header-change-tag {
    background: var(--bg);
    padding: 0.2rem 0.45rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
  }

  .val-del {
    color: var(--diff-del-text);
  }

  .val-add {
    color: var(--diff-add-text);
  }

  .mobile-outline-trigger-bar {
    display: none;
  }

  @media (max-width: 768px) {
    .mobile-outline-trigger-bar {
      display: flex;
    }
  }

  .nb-layout {
    display: flex;
    gap: 1.25rem;
    align-items: flex-start;
  }

  .nb-main-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
    min-width: 0;
  }

  .cells-stream {
    display: flex;
    flex-direction: column;
  }
</style>
