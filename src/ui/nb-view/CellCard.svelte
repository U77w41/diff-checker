<script lang="ts">
  import type { CellDiff } from '../../core/nb-diff/types';
  import type { NbCell } from '../../core/nb-parse/types';
  import { renderMarkdown } from './renderers/markdown';
  import StreamDiff from './renderers/StreamDiff.svelte';
  import ErrorDiff from './renderers/ErrorDiff.svelte';
  import ImageDiff from './renderers/ImageDiff.svelte';
  import HtmlRenderer from './renderers/HtmlRenderer.svelte';
  import UnsupportedOutput from './renderers/UnsupportedOutput.svelte';
  import LargeOutputPlaceholder from './renderers/LargeOutputPlaceholder.svelte';

  interface Props {
    cellDiff: CellDiff;
    index: number;
    cellA?: NbCell;
    cellB?: NbCell;
    hideOutputs: boolean;
    hideMetadata: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
  }

  let {
    cellDiff,
    index,
    cellA,
    cellB,
    hideOutputs,
    hideMetadata,
    isSelected = false,
    onSelect
  }: Props = $props();

  const op = $derived(cellDiff.op);
  const cell = $derived(cellB || cellA);
  const cellType = $derived(cell?.type || 'code');

  // Check if sections have changes to determine default collapse state
  const hasSourceChange = $derived(
    op.op === 'modified' || op.op === 'added' || op.op === 'deleted'
  );

  const hasOutputChange = $derived(
    Boolean(cellDiff.outputs && cellDiff.outputs.some((o) => o.kind !== 'same'))
  );

  const hasMetadataChange = $derived(
    Boolean(
      cellDiff.metadata &&
        (Object.keys(cellDiff.metadata.added).length > 0 ||
          Object.keys(cellDiff.metadata.removed).length > 0 ||
          Object.keys(cellDiff.metadata.changed).length > 0)
    )
  );

  // Parts with no changes start collapsed
  let sourceOpen = $state(false);
  let outputsOpen = $state(false);
  let metadataOpen = $state(false);

  // Initialize open states based on changes
  $effect(() => {
    sourceOpen = hasSourceChange;
    outputsOpen = hasOutputChange;
    metadataOpen = hasMetadataChange;
  });

  // Markdown rendered state
  let renderedMarkdownA = $state<string>('');
  let renderedMarkdownB = $state<string>('');
  let markdownMode = $state<'rendered' | 'source'>('rendered');

  $effect(() => {
    if (cellA?.type === 'markdown') {
      void renderMarkdown(cellA.source, cellA.attachments).then((html) => {
        renderedMarkdownA = html;
      });
    }
    if (cellB?.type === 'markdown') {
      void renderMarkdown(cellB.source, cellB.attachments).then((html) => {
        renderedMarkdownB = html;
      });
    }
  });

  // Large outputs threshold (> 1 MB)
  let loadedLargeOutputs = $state<Record<number, boolean>>({});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="cell-card card op-{op.op} {isSelected ? 'is-selected' : ''}"
  id="cell-card-{index}"
  onclick={() => onSelect?.()}
  onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.()}
  tabindex="-1"
  role="region"
  aria-label="Cell #{index + 1} ({op.op})"
>
  <!-- Cell Header -->
  <div class="cell-header">
    <div class="cell-badges">
      <span class="badge badge-op badge-{op.op}">{op.op}</span>
      <span class="badge badge-type">{cellType}</span>
      <span class="cell-num">#{index + 1}</span>

      {#if isSelected}
        <span class="badge badge-selected" aria-current="true">Active</span>
      {/if}

      {#if op.op === 'moved'}
        <span class="cell-note">Moved from cell #{op.a + 1}</span>
      {/if}

      {#if cellDiff.typeChanged}
        <span class="cell-note">
          Type changed: {cellDiff.typeChanged.from} → {cellDiff.typeChanged.to}
        </span>
      {/if}
    </div>

    {#if cell?.executionCount !== null && cell?.executionCount !== undefined}
      <span class="exec-count">[{cell.executionCount}]</span>
    {/if}
  </div>

  <!-- 1. Source Section -->
  <div class="collapsible-section">
    <button
      type="button"
      class="section-toggle-btn"
      onclick={() => (sourceOpen = !sourceOpen)}
      aria-expanded={sourceOpen}
    >
      <span class="toggle-arrow">{sourceOpen ? '▼' : '▶'}</span>
      <span class="section-name">Source</span>
      {#if !hasSourceChange}
        <span class="unchanged-tag">Unchanged</span>
      {/if}
    </button>

    {#if sourceOpen}
      <div class="section-content">
        {#if cellType === 'markdown'}
          <div class="markdown-view-wrapper">
            {#if hasSourceChange}
              <div class="md-mode-switch">
                <button
                  type="button"
                  class="btn-text {markdownMode === 'rendered' ? 'active' : ''}"
                  onclick={() => (markdownMode = 'rendered')}
                >
                  Rendered
                </button>
                <button
                  type="button"
                  class="btn-text {markdownMode === 'source' ? 'active' : ''}"
                  onclick={() => (markdownMode = 'source')}
                >
                  Source Diff
                </button>
              </div>
            {/if}

            {#if markdownMode === 'rendered' || !hasSourceChange}
              <div class="rendered-markdown-pair">
                {#if op.op === 'modified' && cellA}
                  <div class="md-col md-a">
                    <span class="col-title label-a">Original (A)</span>
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized via DOMPurify -->
                    <div class="rendered-prose">{@html renderedMarkdownA}</div>
                  </div>
                {/if}
                <div class="md-col md-b">
                  {#if op.op === 'modified'}
                    <span class="col-title label-b">Modified (B)</span>
                  {/if}
                  <div class="rendered-prose">
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized via DOMPurify -->
                    {@html renderedMarkdownB || renderedMarkdownA}
                  </div>
                </div>
              </div>
            {:else if cellDiff.source}
              <div class="code-diff-block">
                {#each cellDiff.source.hunks as hunk, hIdx (hIdx)}
                  <div class="hunk-row">
                    <div class="hunk-hdr">
                      @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                    </div>
                    {#each hunk.lines as line, lIdx (lIdx)}
                      <div class="code-line line-{line.kind}">
                        <span class="line-char">
                          {line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '}
                        </span>
                        <span class="line-str">{line.text}</span>
                      </div>
                    {/each}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {:else if cellDiff.source}
          <!-- Code diff hunks -->
          <div class="code-diff-block">
            {#each cellDiff.source.hunks as hunk, hIdx (hIdx)}
              <div class="hunk-row">
                <div class="hunk-hdr">
                  @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                </div>
                {#each hunk.lines as line, lIdx (lIdx)}
                  <div class="code-line line-{line.kind}">
                    <span class="line-char">
                      {line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ' '}
                    </span>
                    <span class="line-str">{line.text}</span>
                  </div>
                {/each}
              </div>
            {/each}
          </div>
        {:else}
          <!-- Single cell code content (e.g. unchanged, added, deleted) -->
          <div class="code-diff-block">
            <pre class="raw-code">{cell?.source || ''}</pre>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- 2. Outputs Section -->
  {#if !hideOutputs && (cellDiff.outputs?.length || cellB?.outputs?.length || cellA?.outputs?.length)}
    <div class="collapsible-section">
      <button
        type="button"
        class="section-toggle-btn"
        onclick={() => (outputsOpen = !outputsOpen)}
        aria-expanded={outputsOpen}
      >
        <span class="toggle-arrow">{outputsOpen ? '▼' : '▶'}</span>
        <span class="section-name">Outputs</span>
        {#if !hasOutputChange}
          <span class="unchanged-tag">Unchanged</span>
        {/if}
      </button>

      {#if outputsOpen}
        <div class="section-content outputs-content">
          {#if cellDiff.outputs}
            {#each cellDiff.outputs as outDiff, outIdx (outIdx)}
              {@const outSize = JSON.stringify(outDiff).length}
              {#if outSize > 1024 * 1024 && !loadedLargeOutputs[outIdx]}
                <LargeOutputPlaceholder
                  sizeBytes={outSize}
                  onLoad={() => (loadedLargeOutputs[outIdx] = true)}
                />
              {:else if outDiff.kind === 'same'}
                <div class="output-same-note">Output unchanged</div>
              {:else if outDiff.kind === 'text'}
                {#if outDiff.mime === 'application/vnd.jupyter.stderr'}
                  <ErrorDiff diff={outDiff.diff} />
                {:else}
                  <StreamDiff diff={outDiff.diff} />
                {/if}
              {:else if outDiff.kind === 'image'}
                <ImageDiff mime={outDiff.mime} a={outDiff.a} b={outDiff.b} />
              {:else if outDiff.kind === 'html'}
                <HtmlRenderer a={outDiff.a} b={outDiff.b} sourceDiff={outDiff.sourceDiff} />
              {:else if outDiff.kind === 'added'}
                <div class="output-added-box">
                  <span class="out-status-badge badge-added">Added output</span>
                  {#if outDiff.output.kind === 'stream'}
                    <pre class="raw-output-stream">{outDiff.output.text}</pre>
                  {:else if outDiff.output.kind === 'rich'}
                    {#if outDiff.output.data['image/png']}
                      <img
                        src="data:image/png;base64,{outDiff.output.data['image/png']}"
                        alt="Output"
                      />
                    {:else if outDiff.output.data['text/plain']}
                      <pre class="raw-output-stream">{outDiff.output.data['text/plain']}</pre>
                    {/if}
                  {/if}
                </div>
              {:else if outDiff.kind === 'removed'}
                <div class="output-removed-box">
                  <span class="out-status-badge badge-deleted">Removed output</span>
                  {#if outDiff.output.kind === 'stream'}
                    <pre class="raw-output-stream">{outDiff.output.text}</pre>
                  {/if}
                </div>
              {:else}
                <UnsupportedOutput />
              {/if}
            {/each}
          {:else if cell?.outputs}
            {#each cell.outputs as rawOut, rIdx (rIdx)}
              {#if rawOut.kind === 'stream'}
                <pre class="raw-output-stream">{rawOut.text}</pre>
              {:else if rawOut.kind === 'rich' && rawOut.data['text/plain']}
                <pre class="raw-output-stream">{rawOut.data['text/plain']}</pre>
              {/if}
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <!-- 3. Metadata Section -->
  {#if !hideMetadata && cellDiff.metadata}
    {@const meta = cellDiff.metadata}
    <div class="collapsible-section">
      <button
        type="button"
        class="section-toggle-btn"
        onclick={() => (metadataOpen = !metadataOpen)}
        aria-expanded={metadataOpen}
      >
        <span class="toggle-arrow">{metadataOpen ? '▼' : '▶'}</span>
        <span class="section-name">Metadata</span>
        {#if !hasMetadataChange}
          <span class="unchanged-tag">Unchanged</span>
        {/if}
      </button>

      {#if metadataOpen}
        <div class="section-content metadata-content">
          {#if !hasMetadataChange}
            <div class="output-same-note">Metadata unchanged</div>
          {:else}
            <table class="meta-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Original (A)</th>
                  <th>Modified (B)</th>
                </tr>
              </thead>
              <tbody>
                {#each Object.entries(meta.changed) as [key, val] (key)}
                  <tr class="meta-row changed">
                    <td class="meta-key">{key}</td>
                    <td class="meta-val val-a">{JSON.stringify(val.a)}</td>
                    <td class="meta-val val-b">{JSON.stringify(val.b)}</td>
                  </tr>
                {/each}
                {#each Object.entries(meta.added) as [key, val] (key)}
                  <tr class="meta-row added">
                    <td class="meta-key">{key}</td>
                    <td class="meta-val">—</td>
                    <td class="meta-val val-b">{JSON.stringify(val)}</td>
                  </tr>
                {/each}
                {#each Object.entries(meta.removed) as [key, val] (key)}
                  <tr class="meta-row removed">
                    <td class="meta-key">{key}</td>
                    <td class="meta-val val-a">{JSON.stringify(val)}</td>
                    <td class="meta-val">—</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .cell-card {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface);
    margin-bottom: 0.85rem;
    overflow: hidden;
    outline: none;
    transition:
      box-shadow 0.15s,
      border-color 0.15s;
  }

  .cell-card.is-selected {
    border-color: var(--focus-ring);
    box-shadow:
      0 0 0 2px var(--focus-ring),
      var(--shadow-l2);
  }

  .badge-selected {
    background: var(--focus-ring);
    color: #ffffff;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.03em;
  }

  .op-added {
    border-left: 4px solid var(--diff-add-text);
  }
  .op-deleted {
    border-left: 4px solid var(--diff-del-text);
  }
  .op-modified {
    border-left: 4px solid #eab308;
  }
  .op-moved {
    border-left: 4px solid #3b82f6;
  }
  .op-unchanged {
    border-left: 4px solid transparent;
  }

  .cell-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }

  .cell-badges {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .badge {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 0.15rem 0.4rem;
    border-radius: var(--radius-sm);
  }

  .badge-op.badge-added {
    background: var(--diff-add-bg);
    color: var(--diff-add-text);
  }
  .badge-op.badge-deleted {
    background: var(--diff-del-bg);
    color: var(--diff-del-text);
  }
  .badge-op.badge-modified {
    background: rgba(234, 179, 8, 0.15);
    color: #b45309;
  }
  .badge-op.badge-moved {
    background: rgba(59, 130, 246, 0.15);
    color: #2563eb;
  }
  .badge-op.badge-unchanged {
    background: var(--surface);
    color: var(--text-muted);
    border: 1px solid var(--border);
  }

  .badge-type {
    background: var(--surface);
    color: var(--text-muted);
    border: 1px solid var(--border);
  }

  .cell-num {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .cell-note {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    font-style: italic;
  }

  .exec-count {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .collapsible-section {
    border-bottom: 1px solid var(--border);
  }

  .collapsible-section:last-child {
    border-bottom: none;
  }

  .section-toggle-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    background: none;
    border: none;
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    text-align: left;
  }

  .section-toggle-btn:hover {
    background: var(--bg);
  }

  .toggle-arrow {
    font-size: 0.6rem;
    color: var(--text-muted);
  }

  .section-name {
    flex: 1;
  }

  .unchanged-tag {
    font-size: 0.65rem;
    font-weight: normal;
    color: var(--text-muted);
    background: var(--bg);
    padding: 0.1rem 0.35rem;
    border-radius: var(--radius-sm);
  }

  .section-content {
    padding: 0.5rem 0.75rem;
    background: var(--surface);
  }

  .code-diff-block {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    overflow-x: auto;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0;
  }

  .hunk-hdr {
    padding: 0.15rem 0.5rem;
    color: var(--text-muted);
    font-size: 0.7rem;
  }

  .code-line {
    display: flex;
    padding: 0.1rem 0.5rem;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .line-add {
    background: var(--diff-add-bg);
    color: var(--diff-add-text);
  }

  .line-del {
    background: var(--diff-del-bg);
    color: var(--diff-del-text);
  }

  .line-char {
    width: 1.2rem;
    flex-shrink: 0;
    user-select: none;
    opacity: 0.7;
  }

  .line-str {
    flex: 1;
  }

  .raw-code,
  .raw-output-stream {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    white-space: pre-wrap;
    word-break: break-all;
    padding: 0.25rem 0.5rem;
  }

  /* Markdown views */
  .md-mode-switch {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .btn-text {
    background: none;
    border: none;
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.2rem 0;
    border-bottom: 2px solid transparent;
  }

  .btn-text.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 700;
  }

  .rendered-markdown-pair {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .rendered-prose {
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    font-size: var(--font-size-sm);
    line-height: 1.6;
  }

  .output-same-note {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    font-style: italic;
    padding: 0.25rem 0;
  }

  .meta-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-xs);
  }

  .meta-table th,
  .meta-table td {
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    text-align: left;
  }

  .meta-table th {
    background: var(--bg);
    font-weight: 600;
  }

  .meta-key {
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .meta-val {
    font-family: var(--font-mono);
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .val-a {
    color: var(--diff-del-text);
  }

  .val-b {
    color: var(--diff-add-text);
  }
</style>
