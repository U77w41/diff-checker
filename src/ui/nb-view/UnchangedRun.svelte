<script lang="ts">
  interface Props {
    count: number;
    expanded: boolean;
    onToggle: () => void;
  }

  let { count, expanded, onToggle }: Props = $props();
</script>

<div class="unchanged-run-bar">
  <button type="button" class="run-toggle-btn" onclick={onToggle}>
    <span class="icon">{expanded ? '▼' : '▶'}</span>
    <span>{count} unchanged {count === 1 ? 'cell' : 'cells'} — {expanded ? 'hide' : 'show'}</span>
  </button>
</div>

<style>
  .unchanged-run-bar {
    display: flex;
    justify-content: center;
    margin: 0.5rem 0;
  }

  .run-toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.85rem;
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--text-muted);
    background: var(--surface);
    border: 1px dashed var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }

  .run-toggle-btn:hover {
    background: var(--bg);
    color: var(--text);
  }

  .icon {
    font-size: 0.65rem;
  }
</style>
