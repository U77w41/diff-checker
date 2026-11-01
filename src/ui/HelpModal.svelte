<script lang="ts">
  let { isOpen = $bindable(false) }: { isOpen: boolean } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop">
    <div
      class="backdrop-scrim"
      role="button"
      tabindex="-1"
      aria-label="Close dialog overlay"
      onclick={() => (isOpen = false)}
      onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
    ></div>
    <div
      class="modal-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <h2 id="help-title">Keyboard Shortcuts</h2>
        <button
          type="button"
          class="close-btn"
          aria-label="Close shortcuts dialog"
          onclick={() => (isOpen = false)}
        >
          ✕
        </button>
      </div>

      <div class="modal-body">
        <table class="shortcuts-table">
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><kbd>n</kbd> / <kbd>p</kbd></td>
              <td>Next / previous change chunk</td>
            </tr>
            <tr>
              <td><kbd>j</kbd> / <kbd>k</kbd></td>
              <td>Next / previous notebook cell</td>
            </tr>
            <tr>
              <td><kbd>u</kbd></td>
              <td>Toggle unified / side-by-side view</td>
            </tr>
            <tr>
              <td><kbd>Ctrl</kbd> + <kbd>Enter</kbd> / <kbd>⌘</kbd> + <kbd>Enter</kbd></td>
              <td>Run diff comparison</td>
            </tr>
            <tr>
              <td><kbd>?</kbd></td>
              <td>Show this keyboard shortcuts guide</td>
            </tr>
            <tr>
              <td><kbd>Esc</kbd></td>
              <td>Close open dialog or mobile drawer</td>
            </tr>
          </tbody>
        </table>

        <p class="shortcuts-note">
          Note: Shortcuts are temporarily disabled while your cursor is inside a text input.
        </p>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn primary" onclick={() => (isOpen = false)}> Got it </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .backdrop-scrim {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(2px);
  }

  .modal-card {
    position: relative;
    z-index: 1;
    background: var(--card-background);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-l2);
    width: 100%;
    max-width: 480px;
    overflow: hidden;
    animation: fadeInScale 0.15s ease-out;
  }

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  .modal-header h2 {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-main);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    color: var(--text-muted);
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-tag);
  }

  .close-btn:hover {
    color: var(--text-main);
    background: var(--card-background-muted);
  }

  .modal-body {
    padding: 1.25rem;
  }

  .shortcuts-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
  }

  .shortcuts-table th,
  .shortcuts-table td {
    padding: 0.6rem 0.5rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
    font-size: 0.9rem;
  }

  .shortcuts-table th {
    font-weight: 600;
    color: var(--text-muted);
    font-size: 0.8rem;
    text-transform: uppercase;
  }

  .shortcuts-table td:first-child {
    white-space: nowrap;
    width: 40%;
  }

  kbd {
    display: inline-block;
    padding: 0.15rem 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    background: var(--card-background-muted);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-tag);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.15);
    color: var(--text-main);
  }

  .shortcuts-note {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.4;
  }

  .modal-footer {
    padding: 0.75rem 1.25rem;
    background: var(--card-background-muted);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
  }

  .btn {
    padding: 0.5rem 1.25rem;
    font-size: 0.9rem;
    font-weight: 600;
    border-radius: var(--radius-control);
    border: 1px solid transparent;
    cursor: pointer;
    min-height: 44px;
  }

  .btn.primary {
    background: var(--accent);
    color: var(--accent-text);
  }

  .btn.primary:hover {
    background: var(--accent-darker);
  }
</style>
