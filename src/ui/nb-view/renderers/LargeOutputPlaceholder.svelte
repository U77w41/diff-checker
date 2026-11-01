<script lang="ts">
  interface Props {
    sizeBytes: number;
    onLoad: () => void;
  }

  let { sizeBytes, onLoad }: Props = $props();

  const formattedSize = $derived((sizeBytes / (1024 * 1024)).toFixed(1));
</script>

<div class="large-output-box">
  <span class="warning-icon" aria-hidden="true">⚠️</span>
  <span class="large-msg">Large output ({formattedSize} MB)</span>
  <button type="button" class="btn-secondary btn-sm load-btn" onclick={onLoad}>
    Click to load
  </button>
</div>

<style>
  .large-output-box {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    background: var(--surface);
    border: 1px dashed var(--border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    color: var(--text-muted);
  }

  .warning-icon {
    font-size: 1rem;
  }

  .large-msg {
    font-weight: 500;
  }

  .load-btn {
    margin-left: auto;
  }
</style>
