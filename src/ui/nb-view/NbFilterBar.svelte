<script lang="ts">
  interface Props {
    hideOutputs: boolean;
    hideMetadata: boolean;
    showUnchanged: boolean;
    similarityThreshold: number;
    onToggleOutputs: () => void;
    onToggleMetadata: () => void;
    onToggleUnchanged: () => void;
    onThresholdChange: (val: number) => void;
  }

  let {
    hideOutputs,
    hideMetadata,
    showUnchanged,
    similarityThreshold,
    onToggleOutputs,
    onToggleMetadata,
    onToggleUnchanged,
    onThresholdChange
  }: Props = $props();

  let showAdvanced = $state(false);
</script>

<div class="filter-bar card">
  <div class="filters-group">
    <label class="filter-check {hideOutputs ? 'active' : ''}">
      <input type="checkbox" checked={hideOutputs} onchange={onToggleOutputs} />
      <span>Hide outputs</span>
    </label>

    <label class="filter-check {hideMetadata ? 'active' : ''}">
      <input type="checkbox" checked={hideMetadata} onchange={onToggleMetadata} />
      <span>Hide metadata</span>
    </label>

    <label class="filter-check {showUnchanged ? 'active' : ''}">
      <input type="checkbox" checked={showUnchanged} onchange={onToggleUnchanged} />
      <span>Show unchanged cells</span>
    </label>
  </div>

  <div class="advanced-wrapper">
    <button
      type="button"
      class="btn-secondary btn-sm advanced-btn {showAdvanced ? 'active' : ''}"
      onclick={() => (showAdvanced = !showAdvanced)}
      aria-expanded={showAdvanced}
    >
      ⚙️ Advanced
    </button>

    {#if showAdvanced}
      <div class="advanced-popover card">
        <label for="threshold-slider" class="popover-label">
          Similarity threshold: {similarityThreshold.toFixed(2)}
        </label>
        <input
          id="threshold-slider"
          type="range"
          min="0.30"
          max="0.90"
          step="0.05"
          value={similarityThreshold}
          oninput={(e) => onThresholdChange(parseFloat((e.target as HTMLInputElement).value))}
          class="threshold-range"
        />
        <div class="slider-marks">
          <span>0.30 (loose)</span>
          <span>0.50 (default)</span>
          <span>0.90 (strict)</span>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    font-size: var(--font-size-xs);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .filters-group {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  .filter-check {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    user-select: none;
    font-weight: 500;
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-tag);
    border: 1px solid var(--border);
    background: var(--card-background-muted);
    transition:
      background 0.15s,
      border-color 0.15s,
      color 0.15s;
  }

  .filter-check:hover {
    border-color: var(--border-strong);
  }

  .filter-check.active {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
    font-weight: 600;
  }

  .advanced-wrapper {
    position: relative;
  }

  .advanced-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: var(--font-size-xs);
    padding: 0.25rem 0.6rem;
  }

  .advanced-popover {
    position: absolute;
    right: 0;
    top: calc(100% + 0.4rem);
    width: 250px;
    padding: 0.75rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .popover-label {
    font-weight: 600;
    color: var(--text);
  }

  .threshold-range {
    width: 100%;
    accent-color: var(--primary);
  }

  .slider-marks {
    display: flex;
    justify-content: space-between;
    font-size: 0.65rem;
    color: var(--text-muted);
  }
</style>
