<script lang="ts">
  import type { DiffOptions } from '../core/text-diff/types';
  import { SUPPORTED_LANGUAGES } from './text-view/languages';

  interface ToolbarProps {
    options: DiffOptions;
    viewMode: 'side-by-side' | 'unified';
    selectedLanguage: string;
    stats: { added: number; removed: number };
    chunkCount: number;
    currentChunk: number;
    onPrevChange: () => void;
    onNextChange: () => void;
    onCopyPatch: () => void;
    onDownloadPatch: () => void;
    onShare?: () => void;
    onHelp?: () => void;
  }

  let {
    options = $bindable(),
    viewMode = $bindable(),
    selectedLanguage = $bindable(),
    stats,
    chunkCount,
    currentChunk,
    onPrevChange,
    onNextChange,
    onCopyPatch,
    onDownloadPatch,
    onShare,
    onHelp
  }: ToolbarProps = $props();

  let copied = $state(false);
  let mobileMenuOpen = $state(false);

  function handleCopy() {
    onCopyPatch();
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }
</script>

<div class="toolbar card" role="toolbar" aria-label="Diff options and navigation">
  <!-- Desktop & Tablet options section -->
  <div class="toolbar-section primary-options">
    <!-- View Mode (Desktop only for side-by-side) -->
    <div class="btn-group view-toggle-group">
      <button
        type="button"
        class="toggle-btn"
        class:active={viewMode === 'side-by-side'}
        onclick={() => (viewMode = 'side-by-side')}
        aria-pressed={viewMode === 'side-by-side'}
      >
        Side-by-side
      </button>
      <button
        type="button"
        class="toggle-btn"
        class:active={viewMode === 'unified'}
        onclick={() => (viewMode = 'unified')}
        aria-pressed={viewMode === 'unified'}
      >
        Unified
      </button>
    </div>

    <!-- Granularity -->
    <div class="btn-group desktop-only">
      <button
        type="button"
        class="toggle-btn"
        class:active={options.granularity === 'word'}
        onclick={() => (options.granularity = 'word')}
        aria-pressed={options.granularity === 'word'}
      >
        Word
      </button>
      <button
        type="button"
        class="toggle-btn"
        class:active={options.granularity === 'char'}
        onclick={() => (options.granularity = 'char')}
        aria-pressed={options.granularity === 'char'}
      >
        Character
      </button>
    </div>

    <!-- Ignore Options -->
    <div class="ignore-options desktop-only">
      <label class="checkbox-label" title="Collapse runs of spaces and tabs, trim line endings">
        <input type="checkbox" bind:checked={options.ignoreWhitespace} />
        <span>Ignore whitespace</span>
      </label>
      <label class="checkbox-label" title="Ignore case differences">
        <input type="checkbox" bind:checked={options.ignoreCase} />
        <span>Ignore case</span>
      </label>
      <label class="checkbox-label" title="Treat CRLF and LF as equal">
        <input type="checkbox" bind:checked={options.ignoreLineEndings} />
        <span>Ignore line endings</span>
      </label>
      <label class="checkbox-label" title="Ignore blank lines">
        <input type="checkbox" bind:checked={options.ignoreBlankLines} />
        <span>Ignore blank lines</span>
      </label>
    </div>

    <!-- Language Picker -->
    <div class="lang-select-wrapper desktop-only">
      <label for="lang-select" class="visually-hidden">Syntax highlighting</label>
      <select id="lang-select" class="lang-select" bind:value={selectedLanguage}>
        {#each SUPPORTED_LANGUAGES as lang (lang.id)}
          <option value={lang.id}>{lang.label}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Navigation, stats, actions -->
  <div class="toolbar-section toolbar-nav">
    <!-- Prev / Next & Chunk Counter (Always visible) -->
    <div class="nav-controls">
      <button
        type="button"
        class="btn-secondary nav-btn"
        onclick={onPrevChange}
        disabled={chunkCount === 0}
        aria-label="Previous change"
        title="Previous change (p)"
      >
        <svg
          class="nav-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>

      <span class="chunk-counter" aria-live="polite">
        {#if chunkCount > 0}
          Change {currentChunk} of {chunkCount}
        {:else}
          No changes
        {/if}
      </span>

      <button
        type="button"
        class="btn-secondary nav-btn"
        onclick={onNextChange}
        disabled={chunkCount === 0}
        aria-label="Next change"
        title="Next change (n)"
      >
        <svg
          class="nav-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>

    <!-- Stats -->
    <div class="diff-stats" aria-label="{stats.added} additions, {stats.removed} deletions">
      <span class="stat-added">+{stats.added}</span>
      <span class="stat-removed">−{stats.removed}</span>
      <span class="stat-label">lines</span>
    </div>

    <!-- Desktop Export & Share Buttons -->
    <div class="export-group desktop-only">
      <button
        type="button"
        class="btn-secondary"
        onclick={handleCopy}
        title="Copy unified diff to clipboard"
      >
        {#if copied}
          <span>Copied!</span>
        {:else}
          <span>Copy patch</span>
        {/if}
      </button>

      <button
        type="button"
        class="btn-secondary"
        onclick={onDownloadPatch}
        title="Download diff.patch file for git apply"
      >
        <span>Download patch</span>
      </button>

      {#if onShare}
        <button
          type="button"
          class="btn-secondary"
          onclick={onShare}
          title="Share diff via URL or JSON bundle"
        >
          <span>Share</span>
        </button>
      {/if}

      {#if onHelp}
        <button
          type="button"
          class="btn-secondary help-btn"
          onclick={onHelp}
          aria-label="Keyboard shortcuts (?)"
          title="Keyboard shortcuts (?)"
        >
          ?
        </button>
      {/if}
    </div>

    <!-- Mobile ⋯ Menu Button -->
    <div class="mobile-only">
      <button
        type="button"
        class="btn-secondary menu-toggle-btn"
        aria-label="More diff options"
        aria-expanded={mobileMenuOpen}
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
      >
        ⋯
      </button>
    </div>
  </div>

  <!-- Mobile Folded Menu Drawer / Dropdown -->
  {#if mobileMenuOpen}
    <div class="mobile-options-panel">
      <div class="mobile-option-block">
        <label class="block-title" for="lang-select-mobile">Syntax Highlighting</label>
        <select id="lang-select-mobile" class="lang-select" bind:value={selectedLanguage}>
          {#each SUPPORTED_LANGUAGES as lang (lang.id)}
            <option value={lang.id}>{lang.label}</option>
          {/each}
        </select>
      </div>

      <div class="mobile-option-block">
        <span class="block-title">Highlight Granularity</span>
        <div class="btn-group">
          <button
            type="button"
            class="toggle-btn"
            class:active={options.granularity === 'word'}
            onclick={() => (options.granularity = 'word')}
            aria-pressed={options.granularity === 'word'}
          >
            Word
          </button>
          <button
            type="button"
            class="toggle-btn"
            class:active={options.granularity === 'char'}
            onclick={() => (options.granularity = 'char')}
            aria-pressed={options.granularity === 'char'}
          >
            Character
          </button>
        </div>
      </div>

      <div class="mobile-option-block">
        <span class="block-title">Comparison Rules</span>
        <div class="mobile-checkboxes">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={options.ignoreWhitespace} />
            <span>Ignore whitespace</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={options.ignoreCase} />
            <span>Ignore case</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={options.ignoreLineEndings} />
            <span>Ignore line endings</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={options.ignoreBlankLines} />
            <span>Ignore blank lines</span>
          </label>
        </div>
      </div>

      <div class="mobile-actions-row">
        <button type="button" class="btn-secondary" onclick={handleCopy}>
          {copied ? 'Copied!' : 'Copy patch'}
        </button>
        <button type="button" class="btn-secondary" onclick={onDownloadPatch}>
          Download patch
        </button>
        {#if onShare}
          <button type="button" class="btn-secondary" onclick={onShare}> Share </button>
        {/if}
        {#if onHelp}
          <button type="button" class="btn-secondary" onclick={onHelp}> Shortcuts (?) </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px 20px;
    padding: 12px 18px;
    margin-bottom: 16px;
  }

  .toolbar-section {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }

  .btn-group {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    overflow: hidden;
  }

  .toggle-btn {
    padding: 6px 12px;
    border: none;
    background: var(--card-background);
    color: var(--text-body);
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }

  .toggle-btn:not(:last-child) {
    border-right: 1px solid var(--border);
  }

  .toggle-btn.active {
    background: var(--accent);
    color: var(--accent-text);
  }

  .ignore-options {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    font-size: 13.5px;
    color: var(--text-body);
  }

  .checkbox-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
    min-height: 44px;
  }

  .checkbox-label input[type='checkbox'] {
    cursor: pointer;
    accent-color: var(--accent);
    width: 16px;
    height: 16px;
  }

  .lang-select {
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--card-background);
    color: var(--text-main);
    font-size: 13.5px;
    cursor: pointer;
    min-height: 44px;
  }

  .nav-controls {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .nav-btn {
    width: 44px;
    height: 44px;
    padding: 0;
    border-radius: var(--radius-control);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-icon {
    width: 20px;
    height: 20px;
  }

  .chunk-counter {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-main);
    min-width: 90px;
    text-align: center;
  }

  .diff-stats {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    padding: 6px 10px;
    border-radius: var(--radius-tag);
    background: var(--card-background-muted);
    min-height: 44px;
  }

  .stat-added {
    color: var(--diff-add-marker);
  }

  .stat-removed {
    color: var(--diff-del-marker);
  }

  .stat-label {
    font-size: 12px;
    font-weight: normal;
    color: var(--text-muted);
  }

  .export-group {
    display: inline-flex;
    gap: 8px;
    align-items: center;
  }

  .export-group button {
    min-height: 44px;
  }

  .help-btn {
    width: 44px;
    font-weight: 700;
    font-size: 16px;
  }

  .menu-toggle-btn {
    width: 44px;
    height: 44px;
    font-size: 20px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-only {
    display: none;
  }

  .mobile-options-panel {
    width: 100%;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .mobile-option-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .block-title {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .mobile-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mobile-actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }

  .mobile-actions-row button {
    min-height: 44px;
  }

  @media (max-width: 768px) {
    .desktop-only {
      display: none !important;
    }

    .mobile-only {
      display: block;
    }
  }
</style>
