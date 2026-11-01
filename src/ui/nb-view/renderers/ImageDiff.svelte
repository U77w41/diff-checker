<script lang="ts">
  interface Props {
    mime: string;
    a: string; // base64 or raw svg string
    b: string; // base64 or raw svg string
  }

  let { mime, a, b }: Props = $props();

  let mode = $state<'side-by-side' | 'swipe' | 'onion-skin'>('side-by-side');
  let swipePosition = $state(50); // percentage 0 - 100
  let onionOpacity = $state(50); // percentage 0 - 100

  const srcA = $derived(
    mime === 'image/svg+xml' && !a.startsWith('data:')
      ? `data:image/svg+xml;utf8,${encodeURIComponent(a)}`
      : a.startsWith('data:')
        ? a
        : `data:${mime};base64,${a}`
  );

  const srcB = $derived(
    mime === 'image/svg+xml' && !b.startsWith('data:')
      ? `data:image/svg+xml;utf8,${encodeURIComponent(b)}`
      : b.startsWith('data:')
        ? b
        : `data:${mime};base64,${b}`
  );
</script>

<div class="image-diff-container">
  <!-- Mode Switcher -->
  <div class="mode-bar" role="toolbar" aria-label="Image comparison mode">
    <div class="btn-group">
      <button
        type="button"
        class="mode-btn {mode === 'side-by-side' ? 'active' : ''}"
        onclick={() => (mode = 'side-by-side')}
      >
        Side-by-side
      </button>
      <button
        type="button"
        class="mode-btn {mode === 'swipe' ? 'active' : ''}"
        onclick={() => (mode = 'swipe')}
      >
        Swipe
      </button>
      <button
        type="button"
        class="mode-btn {mode === 'onion-skin' ? 'active' : ''}"
        onclick={() => (mode = 'onion-skin')}
      >
        Onion-skin
      </button>
    </div>
  </div>

  {#if mode === 'side-by-side'}
    <div class="side-by-side-view">
      <div class="img-col">
        <span class="label label-a">Original (A)</span>
        <div class="img-box">
          <img src={srcA} alt="Original output" />
        </div>
      </div>
      <div class="img-col">
        <span class="label label-b">Modified (B)</span>
        <div class="img-box">
          <img src={srcB} alt="Modified output" />
        </div>
      </div>
    </div>
  {:else if mode === 'swipe'}
    <div class="swipe-wrapper">
      <div class="swipe-container">
        <!-- Base image (Modified B) -->
        <img class="base-img" src={srcB} alt="Modified output" />

        <!-- Clipped top image (Original A) -->
        <div class="clipped-overlay" style="clip-path: inset(0 {100 - swipePosition}% 0 0);">
          <img src={srcA} alt="Original output" />
        </div>

        <!-- Divider line -->
        <div class="swipe-divider" style="left: {swipePosition}%;"></div>
      </div>

      <div class="slider-control">
        <label for="swipe-range" class="slider-label">Swipe divider: {swipePosition}%</label>
        <input
          id="swipe-range"
          type="range"
          min="0"
          max="100"
          bind:value={swipePosition}
          class="slider"
        />
      </div>
    </div>
  {:else if mode === 'onion-skin'}
    <div class="onion-wrapper">
      <div class="onion-container">
        <img class="onion-base" src={srcA} alt="Original output" />
        <img
          class="onion-top"
          src={srcB}
          alt="Modified output"
          style="opacity: {onionOpacity / 100};"
        />
      </div>

      <div class="slider-control">
        <label for="onion-range" class="slider-label">
          Blend: {100 - onionOpacity}% A / {onionOpacity}% B
        </label>
        <input
          id="onion-range"
          type="range"
          min="0"
          max="100"
          bind:value={onionOpacity}
          class="slider"
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .image-diff-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0.5rem 0;
  }

  .mode-bar {
    display: flex;
    justify-content: flex-end;
  }

  .btn-group {
    display: inline-flex;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--border);
  }

  .mode-btn {
    padding: 0.25rem 0.65rem;
    font-size: var(--font-size-xs);
    font-weight: 500;
    background: var(--surface);
    color: var(--text-muted);
    border: none;
    border-right: 1px solid var(--border);
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }

  .mode-btn:last-child {
    border-right: none;
  }

  .mode-btn:hover:not(.active) {
    background: var(--card-background-muted);
    color: var(--text-main);
  }

  .mode-btn.active {
    background: var(--accent);
    color: var(--accent-text);
  }

  .side-by-side-view {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 640px) {
    .side-by-side-view {
      grid-template-columns: 1fr;
    }
  }

  .img-col {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .label {
    font-size: var(--font-size-xs);
    font-weight: 600;
  }

  .label-a {
    color: var(--diff-del-text);
  }

  .label-b {
    color: var(--diff-add-text);
  }

  .img-box {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    min-height: 120px;
  }

  .img-box img,
  .swipe-container img,
  .onion-container img {
    max-width: 100%;
    height: auto;
    object-fit: contain;
    display: block;
  }

  /* Swipe Styles */
  .swipe-wrapper,
  .onion-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .swipe-container {
    position: relative;
    display: inline-block;
    max-width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--surface);
  }

  .clipped-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .swipe-divider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--primary);
    transform: translateX(-50%);
    box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }

  /* Onion Skin Styles */
  .onion-container {
    position: relative;
    display: inline-block;
    max-width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--surface);
  }

  .onion-top {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  /* Sliders */
  .slider-control {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
    max-width: 320px;
  }

  .slider-label {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
  }

  .slider {
    width: 100%;
    accent-color: var(--primary);
    cursor: pointer;
  }
</style>
