<script lang="ts">
  import { onMount } from 'svelte';
  import { EditorView, lineNumbers } from '@codemirror/view';
  import { EditorState, type Extension } from '@codemirror/state';
  import {
    MergeView,
    unifiedMergeView,
    goToNextChunk,
    goToPreviousChunk,
    getChunks,
    Change
  } from '@codemirror/merge';
  import type { CharChange, DiffOptions } from '../../core/text-diff/types';
  import { diffCheckerTheme } from './theme';
  import { loadLanguageExtension } from './languages';

  interface TextViewProps {
    textA: string;
    textB: string;
    changes: CharChange[];
    identical: boolean;
    options: DiffOptions;
    viewMode: 'side-by-side' | 'unified';
    selectedLanguage: string;
    onChunkCountChange?: (count: number) => void;
    onCurrentChunkChange?: (index: number) => void;
  }

  let {
    textA,
    textB,
    changes,
    identical,
    options,
    viewMode,
    selectedLanguage,
    onChunkCountChange,
    onCurrentChunkChange
  }: TextViewProps = $props();

  let containerEl = $state<HTMLDivElement | null>(null);
  let mergeViewInstance: MergeView | null = null;
  let unifiedViewInstance: EditorView | null = null;
  let activeChunks = $state<{ fromA: number; toA: number; fromB: number; toB: number }[]>([]);
  let currentGeneration = 0;

  // Read-only editors drop contenteditable, which leaves the scroller with no
  // focusable content. Long lines then can't be scrolled by keyboard (WCAG 2.1.1).
  const keyboardScrollable = EditorView.contentAttributes.of({ tabindex: '0' });

  // Explain active ignore options in the "No differences" message
  const activeIgnoreNotes = $derived.by(() => {
    const notes: string[] = [];
    if (options.ignoreWhitespace) notes.push('whitespace differences ignored');
    if (options.ignoreCase) notes.push('case differences ignored');
    if (options.ignoreLineEndings) notes.push('line ending differences ignored');
    if (options.ignoreBlankLines) notes.push('blank lines ignored');
    return notes;
  });

  async function createView() {
    if (!containerEl) return;
    const gen = ++currentGeneration;
    destroyView();

    if (identical) {
      activeChunks = [];
      onChunkCountChange?.(0);
      onCurrentChunkChange?.(0);
      return;
    }

    try {
      const langExts = await loadLanguageExtension(selectedLanguage);
      if (gen !== currentGeneration || !containerEl) return;

      const cmChanges = changes.map(
        (ch: CharChange) => new Change(ch.fromA, ch.toA, ch.fromB, ch.toB)
      );

      if (viewMode === 'side-by-side') {
        const baseExtensions: Extension[] = [
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
          keyboardScrollable,
          lineNumbers(),
          diffCheckerTheme,
          ...langExts
        ];

        mergeViewInstance = new MergeView({
          a: {
            doc: textA,
            extensions: [
              ...baseExtensions,
              EditorView.contentAttributes.of({ 'aria-label': 'Original text (read-only)' })
            ]
          },
          b: {
            doc: textB,
            extensions: [
              ...baseExtensions,
              EditorView.contentAttributes.of({ 'aria-label': 'Modified text (read-only)' })
            ]
          },
          parent: containerEl,
          diffConfig: {
            override: () => cmChanges
          },
          gutter: true,
          collapseUnchanged: { margin: 3, minSize: 6 }
        });

        const chunkResult = getChunks(mergeViewInstance.b.state);
        activeChunks = chunkResult?.chunks
          ? chunkResult.chunks.map((c) => ({
              fromA: c.fromA,
              toA: c.toA,
              fromB: c.fromB,
              toB: c.toB
            }))
          : [];
        onChunkCountChange?.(activeChunks.length);
        onCurrentChunkChange?.(activeChunks.length > 0 ? 1 : 0);
      } else {
        // Unified view mode
        unifiedViewInstance = new EditorView({
          state: EditorState.create({
            doc: textB,
            extensions: [
              EditorState.readOnly.of(true),
              EditorView.editable.of(false),
              keyboardScrollable,
              lineNumbers(),
              diffCheckerTheme,
              EditorView.contentAttributes.of({ 'aria-label': 'Unified diff (read-only)' }),
              unifiedMergeView({
                original: textA,
                mergeControls: false,
                gutter: true,
                diffConfig: {
                  override: () => cmChanges
                },
                collapseUnchanged: { margin: 3, minSize: 6 }
              }),
              ...langExts
            ]
          }),
          parent: containerEl
        });

        const chunkResult = getChunks(unifiedViewInstance.state);
        activeChunks = chunkResult?.chunks
          ? chunkResult.chunks.map((c) => ({
              fromA: c.fromA,
              toA: c.toA,
              fromB: c.fromB,
              toB: c.toB
            }))
          : [];
        onChunkCountChange?.(activeChunks.length);
        onCurrentChunkChange?.(activeChunks.length > 0 ? 1 : 0);
      }
    } catch (err) {
      console.error('Failed to create diff view:', err);
      destroyView();
    }
  }

  function destroyView() {
    if (mergeViewInstance) {
      mergeViewInstance.destroy();
      mergeViewInstance = null;
    }
    if (unifiedViewInstance) {
      unifiedViewInstance.destroy();
      unifiedViewInstance = null;
    }
  }

  export function nextChange() {
    const view = viewMode === 'side-by-side' ? mergeViewInstance?.b : unifiedViewInstance;
    if (view) {
      goToNextChunk(view);
    }
  }

  export function prevChange() {
    const view = viewMode === 'side-by-side' ? mergeViewInstance?.b : unifiedViewInstance;
    if (view) {
      goToPreviousChunk(view);
    }
  }

  export function scrollToOffset(offsetB: number) {
    const view = viewMode === 'side-by-side' ? mergeViewInstance?.b : unifiedViewInstance;
    if (view) {
      view.dispatch({
        effects: EditorView.scrollIntoView(offsetB, { y: 'center' })
      });
    }
  }

  onMount(() => {
    return destroyView;
  });

  // Recreate view on changes
  $effect(() => {
    // Track dependencies
    void viewMode;
    void selectedLanguage;
    void textA;
    void textB;
    void changes;
    void identical;
    createView();
  });
</script>

<div class="diff-view-wrapper card">
  {#if identical}
    <div class="identical-banner" role="status">
      <h3>No differences found</h3>
      <p>The two inputs are identical.</p>
      {#if activeIgnoreNotes.length > 0}
        <p class="ignore-notes">
          Note: {activeIgnoreNotes.join(', ')}.
        </p>
      {/if}
    </div>
  {:else}
    <div class="editor-container" bind:this={containerEl}></div>

    <!-- Scrollbar change marker strip -->
    {#if activeChunks.length > 0 && textB.length > 0}
      <div class="scrollbar-markers" aria-hidden="true">
        {#each activeChunks as chunk (chunk.fromB + '-' + chunk.toB)}
          {@const topPercent = Math.min(100, Math.max(0, (chunk.fromB / textB.length) * 100))}
          <button
            type="button"
            class="scrollbar-mark"
            tabindex="-1"
            aria-hidden="true"
            style="top: {topPercent}%"
            onclick={() => scrollToOffset(chunk.fromB)}
            title="Jump to change"
          ></button>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .diff-view-wrapper {
    position: relative;
    min-height: 400px;
    padding: 0;
    overflow: hidden;
    background: var(--card-background);
  }

  .editor-container {
    width: 100%;
    min-height: 400px;
  }

  .identical-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 24px;
    text-align: center;
    gap: 8px;
  }

  .identical-banner h3 {
    font-size: 20px;
    font-weight: 700;
    color: var(--success);
  }

  .identical-banner p {
    color: var(--text-body);
    font-size: 15px;
  }

  .ignore-notes {
    font-size: 13.5px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .scrollbar-markers {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 10px;
    pointer-events: none;
    z-index: 5;
  }

  .scrollbar-mark {
    position: absolute;
    right: 1px;
    width: 8px;
    height: 4px;
    background: var(--diff-add-marker);
    border: none;
    border-radius: 2px;
    pointer-events: auto;
    cursor: pointer;
    transform: translateY(-50%);
    opacity: 0.85;
  }

  .scrollbar-mark:hover {
    opacity: 1;
    width: 10px;
  }
</style>
