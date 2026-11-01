<script lang="ts">
  import {
    encodeSharePayload,
    createDiffBundle,
    parseDiffBundle,
    MAX_SHARE_URL_BYTES,
    type SharePayload
  } from '../core/share';

  let {
    isOpen = $bindable(false),
    payload,
    onLoadBundle
  }: {
    isOpen: boolean;
    payload: SharePayload;
    onLoadBundle: (p: SharePayload) => void;
  } = $props();

  let copied = $state(false);
  let copyTimeout: number | undefined = undefined;
  let bundleFileInput: HTMLInputElement | undefined = $state();
  let bundleError = $state<string | null>(null);

  let encoded = $derived.by(() => {
    return encodeSharePayload(payload);
  });

  let shareUrl = $derived.by(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}#s=${encoded.compressed}`;
  });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      if (copyTimeout) clearTimeout(copyTimeout);
      copyTimeout = window.setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      // Fallback
    }
  }

  function handleDownloadBundle() {
    const jsonStr = createDiffBundle(payload);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diff-bundle-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBundleFileChange(e: Event) {
    bundleError = null;
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const loaded = parseDiffBundle(text);
      onLoadBundle(loaded);
      isOpen = false;
    } catch {
      bundleError = 'Invalid diff bundle file. Please select a valid diff-checker JSON bundle.';
    } finally {
      target.value = '';
    }
  }
</script>

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
      aria-labelledby="share-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <h2 id="share-title">Share Diff</h2>
        <button
          type="button"
          class="close-btn"
          aria-label="Close share dialog"
          onclick={() => (isOpen = false)}
        >
          ✕
        </button>
      </div>

      <div class="modal-body">
        <!-- Visibility Warning required by specification -->
        <div class="warning-banner" role="alert">
          <span class="warning-icon" aria-hidden="true">⚠️</span>
          <span><strong>Privacy notice:</strong> Anyone with this link can read both inputs.</span>
        </div>

        {#if bundleError}
          <div class="error-banner" role="alert">
            {bundleError}
          </div>
        {/if}

        {#if encoded.isTooLarge}
          <div class="large-notice">
            <p>
              This comparison is too large to share via URL ({Math.round(encoded.byteSize / 1024)} KB,
              limit is 8 KB).
            </p>
            <p class="muted">
              You can export it as a standalone diff bundle file to share with others.
            </p>
            <div class="actions-row">
              <button type="button" class="btn primary" onclick={handleDownloadBundle}>
                💾 Download diff bundle (.json)
              </button>
            </div>
          </div>
        {:else}
          <div class="url-share-group">
            <label for="share-url-input">Shareable link:</label>
            <div class="input-with-button">
              <input
                id="share-url-input"
                type="text"
                readonly
                value={shareUrl}
                class="url-input"
                onclick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button type="button" class="btn primary" onclick={handleCopy}>
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
            <span class="size-hint">
              Payload size: {Math.round(encoded.byteSize)} bytes / {MAX_SHARE_URL_BYTES} max
            </span>
          </div>
        {/if}

        <hr class="divider" />

        <div class="bundle-section">
          <h3>Diff Bundles</h3>
          <p class="muted">
            Share or backup diffs as local JSON files without URL length limitations.
          </p>
          <div class="bundle-actions">
            {#if !encoded.isTooLarge}
              <button type="button" class="btn secondary" onclick={handleDownloadBundle}>
                💾 Download Bundle
              </button>
            {/if}
            <button type="button" class="btn secondary" onclick={() => bundleFileInput?.click()}>
              📂 Open Bundle...
            </button>
            <input
              type="file"
              accept=".json,application/json"
              class="hidden-file-input"
              bind:this={bundleFileInput}
              onchange={handleBundleFileChange}
            />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn secondary" onclick={() => (isOpen = false)}>
          Close
        </button>
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
    max-width: 520px;
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

  .warning-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--diff-del-bg);
    border: 1px solid var(--diff-del-marker);
    border-radius: var(--radius-control);
    color: var(--text-main);
    font-size: 0.85rem;
    margin-bottom: 1.25rem;
  }

  .warning-icon {
    font-size: 1.1rem;
  }

  .error-banner {
    padding: 0.6rem 0.8rem;
    background: var(--danger-bg);
    border: 1px solid var(--danger);
    color: var(--danger);
    border-radius: var(--radius-control);
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .url-share-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .url-share-group label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-main);
  }

  .input-with-button {
    display: flex;
    gap: 0.5rem;
  }

  .url-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    background: var(--card-background-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    color: var(--text-main);
    min-height: 44px;
  }

  .url-input:focus {
    outline: 2px solid var(--focus-ring);
    border-color: transparent;
  }

  .size-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .large-notice {
    padding: 0.5rem 0;
  }

  .large-notice p {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    color: var(--text-main);
  }

  .large-notice p.muted {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .actions-row {
    margin-top: 0.75rem;
  }

  .divider {
    border: 0;
    border-top: 1px solid var(--border);
    margin: 1.25rem 0;
  }

  .bundle-section h3 {
    font-size: 0.95rem;
    margin: 0 0 0.25rem 0;
    color: var(--text-main);
  }

  .bundle-section p.muted {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 0 0 0.75rem 0;
  }

  .bundle-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .hidden-file-input {
    display: none;
  }

  .modal-footer {
    padding: 0.75rem 1.25rem;
    background: var(--card-background-muted);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
  }

  .btn {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 600;
    border-radius: var(--radius-control);
    border: 1px solid transparent;
    cursor: pointer;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }

  .btn.primary {
    background: var(--accent);
    color: var(--accent-text);
  }

  .btn.primary:hover {
    background: var(--accent-darker);
  }

  .btn.secondary {
    background: var(--card-background);
    border: 1px solid var(--border-strong);
    color: var(--text-main);
  }

  .btn.secondary:hover {
    background: var(--card-background-muted);
  }
</style>
