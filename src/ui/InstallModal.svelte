<script lang="ts">
  let { isOpen = $bindable(false) }: { isOpen: boolean } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      isOpen = false;
    }
  }

  // Detect platform hints for better guidance
  let userAgent = $state('');
  let isMacSafari = $derived(
    userAgent.includes('Macintosh') &&
      userAgent.includes('Safari') &&
      !userAgent.includes('Chrome') &&
      !userAgent.includes('Edg')
  );
  let isIos = $derived(
    /iPad|iPhone|iPod/.test(userAgent) ||
      (userAgent.includes('Macintosh') &&
        typeof navigator !== 'undefined' &&
        navigator.maxTouchPoints > 1)
  );
  let isChromium = $derived(
    userAgent.includes('Chrome') || userAgent.includes('Edg') || userAgent.includes('CriOS')
  );

  $effect(() => {
    if (typeof navigator !== 'undefined') {
      userAgent = navigator.userAgent;
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop">
    <div
      class="backdrop-scrim"
      role="button"
      tabindex="-1"
      aria-label="Close install dialog overlay"
      onclick={() => (isOpen = false)}
      onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
    ></div>
    <div
      class="modal-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <div class="title-wrap">
          <svg
            class="header-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <h2 id="install-title">Install Diff Checker</h2>
        </div>
        <button
          type="button"
          class="close-btn"
          aria-label="Close install dialog"
          onclick={() => (isOpen = false)}
        >
          ✕
        </button>
      </div>

      <div class="modal-body">
        <p class="install-intro">
          Diff Checker runs 100% in your browser and works completely offline as an installed app.
        </p>

        <div class="instructions-list">
          {#if isMacSafari}
            <div class="instruction-item active">
              <strong>Safari on Mac:</strong>
              <p>
                In Safari's menu bar, click <strong>File</strong> → <strong>Add to Dock...</strong>
                (or click the Share button and select <strong>Add to Dock</strong>).
              </p>
            </div>
          {:else if isIos}
            <div class="instruction-item active">
              <strong>Safari on iPhone / iPad:</strong>
              <p>
                Tap the <strong>Share</strong> button in the Safari toolbar, scroll down, and tap
                <strong>Add to Home Screen</strong>.
              </p>
            </div>
          {:else if isChromium}
            <div class="instruction-item active">
              <strong>Chrome / Edge / Brave:</strong>
              <p>
                Click the <strong>Install</strong> icon on the right side of your address bar, or
                open the browser menu (<strong>⋮</strong>) → <strong>Save and share</strong> →
                <strong>Install Diff Checker</strong>.
              </p>
            </div>
          {:else}
            <div class="instruction-item active">
              <strong>Desktop & Mobile:</strong>
              <p>
                Use your browser's menu to select <strong>Install Diff Checker</strong>,
                <strong>Add to Dock</strong>, or <strong>Add to Home Screen</strong>.
              </p>
            </div>
          {/if}

          <div class="instruction-item secondary">
            <strong>Other devices or browsers:</strong>
            <p>
              Look for the install or download icon in your address bar or browser menu (<strong
                >Add to Home Screen / Dock</strong
              >).
            </p>
          </div>
        </div>
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
      transform: scale(0.97);
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
    padding: 1.125rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-icon {
    width: 20px;
    height: 20px;
    color: var(--accent);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .close-btn {
    background: transparent;
    border: none;
    font-size: 1.125rem;
    line-height: 1;
    cursor: pointer;
    color: var(--text-muted);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-control);
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: var(--text-main);
    background: var(--card-background-muted);
  }

  .modal-body {
    padding: 1.25rem;
    max-height: 70vh;
    overflow-y: auto;
  }

  .install-intro {
    margin: 0 0 1rem 0;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--text-body);
  }

  .instructions-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .instruction-item {
    background: var(--card-background-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    padding: 0.875rem 1rem;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .instruction-item.active {
    border-color: var(--accent);
    background: rgba(37, 99, 235, 0.05);
  }

  .instruction-item strong {
    display: block;
    color: var(--text-main);
    margin-bottom: 0.25rem;
  }

  .instruction-item p {
    margin: 0;
    color: var(--text-body);
  }

  .instruction-item.secondary {
    opacity: 0.85;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 0.875rem 1.25rem;
    border-top: 1px solid var(--border);
    background: var(--card-background-muted);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 1.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: var(--radius-control);
    cursor: pointer;
    border: 1px solid transparent;
  }

  .btn.primary {
    background: var(--accent);
    color: #ffffff;
  }

  .btn.primary:hover {
    opacity: 0.9;
  }
</style>
