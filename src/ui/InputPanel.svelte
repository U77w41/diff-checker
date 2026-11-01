<script lang="ts">
  import { decodeFileBuffer, DiffError } from '../core/file-reader';

  interface InputPanelProps {
    textA: string;
    textB: string;
    fileNameA?: string;
    fileNameB?: string;
    isDiffAvailable: boolean;
    onCompare: () => void;
    onLoadExample: () => void;
  }

  let {
    textA = $bindable(),
    textB = $bindable(),
    fileNameA = $bindable(),
    fileNameB = $bindable(),
    isDiffAvailable = false,
    onCompare,
    onLoadExample
  }: InputPanelProps = $props();

  let isCollapsed = $state(false);
  let errorA = $state<string | null>(null);
  let errorB = $state<string | null>(null);
  let warningA = $state<string | null>(null);
  let warningB = $state<string | null>(null);

  // Sync collapsed state when a diff becomes available
  $effect(() => {
    if (isDiffAvailable && !isCollapsed && textA.length > 0 && textB.length > 0) {
      isCollapsed = true;
    }
  });

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async function handleFile(file: File, side: 'A' | 'B') {
    if (side === 'A') {
      errorA = null;
      warningA = null;
    } else {
      errorB = null;
      warningB = null;
    }

    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const decoded = decodeFileBuffer(buffer);

      if (side === 'A') {
        textA = decoded.text;
        fileNameA = file.name;
        warningA = decoded.warning || null;
      } else {
        textB = decoded.text;
        fileNameB = file.name;
        warningB = decoded.warning || null;
      }
      onCompare();
    } catch (err) {
      const msg = err instanceof DiffError ? err.message : (err as Error).message;
      if (side === 'A') {
        errorA = msg;
      } else {
        errorB = msg;
      }
    }
  }

  function handleSwap() {
    const tempText = textA;
    const tempName = fileNameA;
    textA = textB;
    fileNameA = fileNameB;
    textB = tempText;
    fileNameB = tempName;
    onCompare();
  }

  function handleClear() {
    textA = '';
    textB = '';
    fileNameA = undefined;
    fileNameB = undefined;
    errorA = null;
    errorB = null;
    warningA = null;
    warningB = null;
    isCollapsed = false;
  }

  function handleDrop(e: DragEvent, side: 'A' | 'B') {
    e.preventDefault();
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file, side);
      }
    }
  }
</script>

{#if isCollapsed}
  <div class="collapsed-bar card">
    <div class="files-summary">
      <span class="file-tag">
        <strong>A:</strong>
        {fileNameA || 'Pasted text'} ({formatBytes(textA.length)})
      </span>
      <span class="vs">vs</span>
      <span class="file-tag">
        <strong>B:</strong>
        {fileNameB || 'Pasted text'} ({formatBytes(textB.length)})
      </span>
    </div>
    <div class="actions">
      <button type="button" class="btn-secondary" onclick={() => (isCollapsed = false)}>
        Edit inputs
      </button>
      <button type="button" class="btn-secondary" onclick={handleSwap}>Swap A↔B</button>
      <button type="button" class="btn-secondary" onclick={handleClear}>Clear</button>
    </div>
  </div>
{:else}
  <div class="input-panel card">
    <div class="panels-grid">
      <!-- Original (A) -->
      <div
        class="side-panel"
        role="region"
        aria-label="Original text input area"
        ondragover={(e) => e.preventDefault()}
        ondrop={(e) => handleDrop(e, 'A')}
      >
        <div class="panel-header">
          <label class="panel-title" for="input-a">
            Original (A)
            {#if fileNameA}
              <span class="file-info">{fileNameA} ({formatBytes(textA.length)})</span>
            {/if}
          </label>
          <div class="upload-btn-wrapper">
            <label class="btn-secondary file-upload-label" for="file-upload-a">Upload file</label>
            <input
              id="file-upload-a"
              type="file"
              class="visually-hidden"
              onchange={(e) => {
                const target = e.currentTarget;
                if (target.files?.[0]) handleFile(target.files[0], 'A');
              }}
            />
          </div>
        </div>

        {#if errorA}
          <div class="error-banner">{errorA}</div>
        {/if}
        {#if warningA}
          <div class="warning-banner">{warningA}</div>
        {/if}

        <textarea
          id="input-a"
          class="text-input"
          placeholder="Paste original text here, or drag and drop a file..."
          bind:value={textA}
          oninput={() => onCompare()}
        ></textarea>
      </div>

      <!-- Modified (B) -->
      <div
        class="side-panel"
        role="region"
        aria-label="Modified text input area"
        ondragover={(e) => e.preventDefault()}
        ondrop={(e) => handleDrop(e, 'B')}
      >
        <div class="panel-header">
          <label class="panel-title" for="input-b">
            Modified (B)
            {#if fileNameB}
              <span class="file-info">{fileNameB} ({formatBytes(textB.length)})</span>
            {/if}
          </label>
          <div class="upload-btn-wrapper">
            <label class="btn-secondary file-upload-label" for="file-upload-b">Upload file</label>
            <input
              id="file-upload-b"
              type="file"
              class="visually-hidden"
              onchange={(e) => {
                const target = e.currentTarget;
                if (target.files?.[0]) handleFile(target.files[0], 'B');
              }}
            />
          </div>
        </div>

        {#if errorB}
          <div class="error-banner">{errorB}</div>
        {/if}
        {#if warningB}
          <div class="warning-banner">{warningB}</div>
        {/if}

        <textarea
          id="input-b"
          class="text-input"
          placeholder="Paste modified text here, or drag and drop a file..."
          bind:value={textB}
          oninput={() => onCompare()}
        ></textarea>
      </div>
    </div>

    <div class="panel-footer">
      <div class="footer-left">
        <button type="button" class="btn-secondary" onclick={handleSwap}>Swap (A↔B)</button>
        <button type="button" class="btn-secondary" onclick={handleClear}>Clear</button>
        <button type="button" class="btn-secondary" onclick={onLoadExample}>Try an example</button>
      </div>

      <div class="footer-right">
        <button
          type="button"
          class="btn-primary"
          onclick={() => {
            onCompare();
            if (textA.length > 0 && textB.length > 0) isCollapsed = true;
          }}
        >
          Compare
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .input-panel {
    margin-bottom: 20px;
    padding: 20px;
  }

  .panels-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  .side-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .panel-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-main);
  }

  .file-info {
    font-size: 12.5px;
    font-weight: normal;
    color: var(--text-muted);
    margin-left: 6px;
  }

  .file-upload-label {
    cursor: pointer;
    font-size: 13px;
  }

  .text-input {
    width: 100%;
    height: 180px;
    padding: 12px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-control);
    background: var(--card-background);
    color: var(--text-main);
    font-family: var(--font-mono);
    font-size: 13.5px;
    line-height: 1.5;
    resize: vertical;
  }

  .text-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }

  .error-banner {
    padding: 8px 12px;
    border-radius: var(--radius-control);
    background: var(--danger-bg);
    color: var(--danger);
    font-size: 13.5px;
  }

  .warning-banner {
    padding: 8px 12px;
    border-radius: var(--radius-control);
    background: rgba(234, 88, 12, 0.12);
    color: #c2410c;
    font-size: 13.5px;
  }

  .panel-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .footer-left {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .collapsed-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    margin-bottom: 20px;
  }

  .files-summary {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: var(--text-main);
  }

  .vs {
    color: var(--text-muted);
    font-weight: 600;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  @media (max-width: 768px) {
    .panels-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
