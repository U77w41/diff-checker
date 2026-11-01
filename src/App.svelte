<script lang="ts">
  import { onMount } from 'svelte';
  import { initTheme, toggleTheme, isDark } from './app/theme';
  import type { DiffOptions, TextDiffResult } from './core/text-diff/types';
  import { DEFAULT_DIFF_OPTIONS } from './core/text-diff/types';
  import { workerManager } from './worker/worker-client';
  import { generateGitPatch } from './core/patch';
  import { detectLanguageFromFilename } from './ui/text-view/languages';
  import InputPanel from './ui/InputPanel.svelte';
  import Toolbar from './ui/Toolbar.svelte';
  import TextView from './ui/text-view/TextView.svelte';
  import { detectInputMode, type InputMode } from './core/detect';
  import type { NbDiffOptions, NotebookDiffResult } from './core/nb-diff/types';
  import { DEFAULT_NB_DIFF_OPTIONS } from './core/nb-diff/types';
  import NotebookView from './ui/nb-view/NotebookView.svelte';
  import ShareModal from './ui/ShareModal.svelte';
  import HelpModal from './ui/HelpModal.svelte';
  import ToolsDropdown from './ui/ToolsDropdown.svelte';
  import { decodeSharePayload, type SharePayload } from './core/share';
  import { loadSettings, saveSettings, type StoredSettings } from './app/settings';
  import { DiffError } from './core/errors';

  const currentYear = new Date().getFullYear();
  const launchYear = 2026;
  const copyrightText =
    launchYear === currentYear
      ? `© ${launchYear} Ujjwal Chowdhury`
      : `© ${launchYear} – ${currentYear} Ujjwal Chowdhury`;

  // State
  let dark = $state(false);
  let textA = $state('');
  let textB = $state('');
  let fileNameA = $state<string | undefined>(undefined);
  let fileNameB = $state<string | undefined>(undefined);

  let options = $state<DiffOptions>({ ...DEFAULT_DIFF_OPTIONS });
  let viewMode = $state<'side-by-side' | 'unified'>('side-by-side');
  let selectedLanguage = $state('plain');

  let currentMode = $state<InputMode>('text');
  let diffResult = $state<TextDiffResult | null>(null);
  let nbDiffResult = $state<NotebookDiffResult | null>(null);
  let nbOptions = $state<NbDiffOptions>({ ...DEFAULT_NB_DIFF_OPTIONS });
  let isDiffing = $state(false);
  let showProgress = $state(false);
  let ariaAnnouncement = $state('');
  let chunkCount = $state(0);
  let currentChunk = $state(0);
  let slowWarning = $state(false);

  // Settings & persistence
  let rememberInputs = $state(false);
  let storageError = $state<string | null>(null);
  let shareBannerError = $state<string | null>(null);

  // Error handling matrix states
  let modeMismatchWarning = $state<string | null>(null);
  let notebookJsonError = $state<{ message: string; line?: number; column?: number } | null>(null);
  let notebookFormatError = $state<string | null>(null);
  let diffErrorMessage = $state<string | null>(null);

  // Modals
  let isShareOpen = $state(false);
  let isHelpOpen = $state(false);

  interface TextViewHandle {
    nextChange: () => void;
    prevChange: () => void;
  }
  let textViewComponent = $state<TextViewHandle | null>(null);

  interface NotebookViewHandle {
    nextCell: () => void;
    prevCell: () => void;
  }
  let notebookViewComponent = $state<NotebookViewHandle | null>(null);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let progressTimer: ReturnType<typeof setTimeout> | null = null;

  let currentSharePayload = $derived<SharePayload>({
    mode: currentMode,
    a: textA,
    b: textB,
    fileNameA,
    fileNameB,
    options:
      currentMode === 'notebook'
        ? (nbOptions as unknown as Record<string, unknown>)
        : (options as unknown as Record<string, unknown>)
  });

  function persistSettings() {
    const toStore: StoredSettings = {
      mode: currentMode,
      viewMode: viewMode === 'side-by-side' ? 'split' : 'unified',
      granularity: options.granularity,
      ignoreWhitespace: options.ignoreWhitespace,
      ignoreCase: options.ignoreCase,
      ignoreLineEndings: options.ignoreLineEndings,
      ignoreBlankLines: options.ignoreBlankLines,
      hideOutputs: !nbOptions.includeOutputs,
      hideMetadata: nbOptions.hideNoisyMetadata,
      showUnchanged: false,
      similarityThreshold: nbOptions.similarityThreshold,
      rememberInputs,
      savedInputs: rememberInputs ? { textA, textB, fileNameA, fileNameB } : undefined
    };

    const res = saveSettings(toStore);
    if (!res.success && rememberInputs) {
      storageError = res.error || "Couldn't save inputs on this device";
    } else {
      storageError = null;
    }
  }

  function handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith('#s=')) {
      const decoded = decodeSharePayload(hash);
      if (!decoded) {
        shareBannerError = 'This share link is damaged';
        textA = '';
        textB = '';
        fileNameA = undefined;
        fileNameB = undefined;
        diffResult = null;
        nbDiffResult = null;
      } else {
        shareBannerError = null;
        currentMode = decoded.mode;
        textA = decoded.a;
        textB = decoded.b;
        fileNameA = decoded.fileNameA;
        fileNameB = decoded.fileNameB;
        if (decoded.options) {
          if (decoded.mode === 'notebook') {
            nbOptions = { ...nbOptions, ...(decoded.options as Partial<NbDiffOptions>) };
          } else {
            options = { ...options, ...(decoded.options as Partial<DiffOptions>) };
          }
        }
        void runDiffNow();
      }
    } else if (hash === '#notebook') {
      currentMode = 'notebook';
    } else if (hash === '#text') {
      currentMode = 'text';
    }
  }

  onMount(() => {
    dark = isDark();
    const cleanupTheme = initTheme();

    // Load persisted settings
    const stored = loadSettings();
    rememberInputs = stored.rememberInputs;
    options.granularity = stored.granularity;
    options.ignoreWhitespace = stored.ignoreWhitespace;
    options.ignoreCase = stored.ignoreCase;
    options.ignoreLineEndings = stored.ignoreLineEndings;
    options.ignoreBlankLines = stored.ignoreBlankLines;
    nbOptions.includeOutputs = !stored.hideOutputs;
    nbOptions.hideNoisyMetadata = stored.hideMetadata;
    nbOptions.similarityThreshold = stored.similarityThreshold;

    if (window.innerWidth < 768) {
      viewMode = 'unified';
    } else {
      viewMode = stored.viewMode === 'unified' ? 'unified' : 'side-by-side';
    }

    if (stored.rememberInputs && stored.savedInputs) {
      textA = stored.savedInputs.textA || '';
      textB = stored.savedInputs.textB || '';
      fileNameA = stored.savedInputs.fileNameA;
      fileNameB = stored.savedInputs.fileNameB;
    }

    // Process initial hash route
    handleHashChange();

    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === 'side-by-side') {
        viewMode = 'unified';
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('hashchange', handleHashChange);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if focus is in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target?.matches('input, textarea, select, [contenteditable="true"]') ||
        target?.closest('.cm-editor')
      ) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          runDiffNow();
        }
        return;
      }

      if (e.key === 'Escape') {
        isHelpOpen = false;
        isShareOpen = false;
      } else if (e.key === '?') {
        e.preventDefault();
        isHelpOpen = true;
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runDiffNow();
      } else if (e.key === 'n' || (currentMode === 'notebook' && e.key === 'j')) {
        e.preventDefault();
        handleNextChange();
      } else if (e.key === 'p' || (currentMode === 'notebook' && e.key === 'k')) {
        e.preventDefault();
        handlePrevChange();
      } else if (e.key === 'u') {
        e.preventDefault();
        viewMode = viewMode === 'side-by-side' ? 'unified' : 'side-by-side';
        persistSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cleanupTheme();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  function handleThemeToggle() {
    toggleTheme();
    dark = isDark();
  }

  function handleSkipToContent(e: MouseEvent) {
    e.preventDefault();
    const mainEl = document.getElementById('main');
    if (mainEl) {
      mainEl.focus();
    }
  }

  function handleLoadBundle(bundle: SharePayload) {
    currentMode = bundle.mode;
    textA = bundle.a;
    textB = bundle.b;
    fileNameA = bundle.fileNameA;
    fileNameB = bundle.fileNameB;
    if (bundle.options) {
      if (bundle.mode === 'notebook') {
        nbOptions = { ...nbOptions, ...(bundle.options as Partial<NbDiffOptions>) };
      } else {
        options = { ...options, ...(bundle.options as Partial<DiffOptions>) };
      }
    }
    void runDiffNow();
  }

  // Detect language and mode when file names or contents change
  $effect(() => {
    const detected = detectLanguageFromFilename(fileNameA || fileNameB);
    if (detected !== 'plain') {
      selectedLanguage = detected;
    }

    const modeA = detectInputMode(fileNameA, textA);
    const modeB = detectInputMode(fileNameB, textB);
    if (modeA === 'notebook' || modeB === 'notebook') {
      currentMode = 'notebook';
    }
  });

  // Debounced auto-run when inputs or options change
  $effect(() => {
    void textA;
    void textB;
    void currentMode;
    void options.ignoreWhitespace;
    void options.ignoreBlankLines;
    void options.ignoreCase;
    void options.granularity;
    void nbOptions.includeOutputs;
    void nbOptions.hideNoisyMetadata;
    void nbOptions.similarityThreshold;
    void rememberInputs;

    persistSettings();

    if (textA.length > 0 || textB.length > 0) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void runDiffNow();
      }, 300);
    }
  });

  async function runDiffNow() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (textA.length === 0 && textB.length === 0) {
      diffResult = null;
      nbDiffResult = null;
      notebookJsonError = null;
      notebookFormatError = null;
      diffErrorMessage = null;
      modeMismatchWarning = null;
      return;
    }

    isDiffing = true;
    slowWarning = false;
    notebookJsonError = null;
    notebookFormatError = null;
    diffErrorMessage = null;

    // Show progress indicator if diff takes > 200 ms
    progressTimer = setTimeout(() => {
      if (isDiffing) showProgress = true;
    }, 200);

    try {
      // Check for notebook vs non-notebook mismatch
      const detectedA = detectInputMode(fileNameA, textA);
      const detectedB = detectInputMode(fileNameB, textB);
      const isMismatch =
        textA.length > 0 &&
        textB.length > 0 &&
        detectedA !== detectedB &&
        (detectedA === 'notebook' || detectedB === 'notebook');

      if (isMismatch) {
        modeMismatchWarning =
          'Comparing notebook with non-notebook file — comparing as plain text instead.';
        const res = await workerManager.diffText(textA, textB, options, () => {
          slowWarning = true;
        });
        diffResult = res;
        nbDiffResult = null;
        ariaAnnouncement = `${res.stats.added} additions, ${res.stats.removed} deletions`;
      } else {
        modeMismatchWarning = null;
        if (currentMode === 'notebook') {
          const res = await workerManager.diffNotebook(textA, textB, nbOptions, () => {
            slowWarning = true;
          });
          nbDiffResult = res;
          diffResult = null;
          ariaAnnouncement = `Notebook diff: ${res.stats.modified} modified, ${res.stats.added} added, ${res.stats.deleted} deleted, ${res.stats.moved} moved`;
        } else {
          const res = await workerManager.diffText(textA, textB, options, () => {
            slowWarning = true;
          });
          diffResult = res;
          nbDiffResult = null;
          ariaAnnouncement = `${res.stats.added} additions, ${res.stats.removed} deletions`;
        }
      }
    } catch (err: unknown) {
      console.error('Diff failed:', err);
      diffResult = null;
      nbDiffResult = null;

      if (err instanceof DiffError || (typeof err === 'object' && err !== null && 'code' in err)) {
        const dErr = err as DiffError;
        if (dErr.code === 'INVALID_JSON') {
          notebookJsonError = {
            message: dErr.message,
            line: dErr.line,
            column: dErr.column
          };
        } else if (dErr.code === 'UNSUPPORTED_NBFORMAT') {
          notebookFormatError = 'Only nbformat 4 notebooks are supported';
        } else if (dErr.code === 'CANCELLED') {
          diffErrorMessage =
            'Diff took over 10 seconds and was cancelled. Try disabling character-level highlighting.';
        } else {
          diffErrorMessage = dErr.message;
        }
      } else {
        diffErrorMessage = 'Diff calculation failed. Try comparing again.';
      }
    } finally {
      isDiffing = false;
      showProgress = false;
      if (progressTimer) clearTimeout(progressTimer);
    }
  }

  function handleCompareAsPlainText() {
    notebookJsonError = null;
    notebookFormatError = null;
    diffErrorMessage = null;
    currentMode = 'text';
    window.location.hash = '#text';
    void runDiffNow();
  }

  async function handleLoadExample() {
    try {
      if (currentMode === 'notebook') {
        const [resA, resB] = await Promise.all([
          fetch('./examples/original.ipynb'),
          fetch('./examples/modified.ipynb')
        ]);
        textA = await resA.text();
        textB = await resB.text();
        fileNameA = 'original.ipynb';
        fileNameB = 'modified.ipynb';
        selectedLanguage = 'json';
        void runDiffNow();
      } else {
        const [resA, resB] = await Promise.all([
          fetch('./examples/original.py'),
          fetch('./examples/modified.py')
        ]);
        textA = await resA.text();
        textB = await resB.text();
        fileNameA = 'original.py';
        fileNameB = 'modified.py';
        selectedLanguage = 'python';
        void runDiffNow();
      }
    } catch (err) {
      console.error('Failed to load example:', err);
    }
  }

  function handleNextChange() {
    if (currentMode === 'notebook') {
      notebookViewComponent?.nextCell();
    } else {
      textViewComponent?.nextChange();
      if (chunkCount > 0) {
        currentChunk = currentChunk < chunkCount ? currentChunk + 1 : 1;
      }
    }
  }

  function handlePrevChange() {
    if (currentMode === 'notebook') {
      notebookViewComponent?.prevCell();
    } else {
      textViewComponent?.prevChange();
      if (chunkCount > 0) {
        currentChunk = currentChunk > 1 ? currentChunk - 1 : chunkCount;
      }
    }
  }

  function handleCopyPatch() {
    const patch = generateGitPatch(fileNameA, textA, textB);
    navigator.clipboard.writeText(patch);
  }

  function handleDownloadPatch() {
    const patch = generateGitPatch(fileNameA, textA, textB);
    const blob = new Blob([patch], { type: 'text/x-diff;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff.patch';
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<a class="skip-link" href="#main" onclick={handleSkipToContent}>Skip to content</a>

<!-- Screen reader live region -->
<div class="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
  {ariaAnnouncement}
</div>

<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="./" aria-label="Diff Checker home">
      <svg
        class="brand-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path
          d="M12 3L12 21M14.7107 19.3887C17.1796 18.8321 19.1072 16.979 19.6863 14.6058C20.1046 12.8918 20.1046 11.1081 19.6863 9.39419C19.1072 7.02094 17.1796 5.16789 14.7107 4.61121M12 4.30969C11.0904 4.30969 10.1808 4.41019 9.28927 4.61121C6.82045 5.16789 4.89278 7.02094 4.31367 9.39419C3.89544 11.1081 3.89544 12.8918 4.31367 14.6058C4.89278 16.979 6.82045 18.8321 9.28928 19.3887C10.1808 19.5898 11.0904 19.6903 12 19.6903"
        />
      </svg>
      <span class="brand-text">
        <span class="brand-name">Diff Checker</span>
      </span>
    </a>

    <button
      class="theme-toggle"
      id="theme-toggle"
      type="button"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onclick={handleThemeToggle}
    >
      <svg
        class="nav-icon icon-moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3h.393a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 2.992z" />
      </svg>
      <svg
        class="nav-icon icon-sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M3 12h1m8-9v1m8 8h1m-9 8v1M5.6 5.6l.7.7m12.1-.7-.7.7m0 11.4.7.7m-12.1-.7-.7.7" />
      </svg>
    </button>

    <nav class="site-nav" aria-label="Main">
      <ul>
        <li>
          <a class="nav-text-desktop" href="https://u77w41.github.io/resume/" aria-label="Hire Me">
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
              <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M12 12v.01" />
              <path d="M3 13a20 20 0 0 0 18 0" />
            </svg>
            <span class="nav-label">Hire Me</span>
          </a>
        </li>
        <li>
          <ToolsDropdown />
        </li>
        <li class="mobile-hide">
          <a
            class="support-link-item"
            data-testid="support-link"
            href="https://u77w41.github.io/support-my-work/"
            target="_blank"
            rel="noreferrer"
            title="Support my work: send a small tip over UPI"
          >
            <svg
              class="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                class="heart-icon"
                d="M16 6.27975C16 6.88118 15.7625 7.45883 15.3383 7.88611C14.3619 8.87007 13.415 9.89605 12.4021 10.8443C12.17 11.0585 11.8017 11.0507 11.5795 10.8268L8.6615 7.88611C7.7795 6.99725 7.7795 5.56225 8.6615 4.67339C9.55218 3.77579 11.0032 3.77579 11.8938 4.67339L11.9999 4.78027L12.1059 4.67345C12.533 4.24286 13.1146 4 13.7221 4C14.3297 4 14.9113 4.24284 15.3383 4.67339C15.7625 5.10073 16 5.67835 16 6.27975Z"
                stroke-linejoin="round"
              />
              <path
                d="M18 20L21.8243 16.1757C21.9368 16.0632 22 15.9106 22 15.7515V10.5C22 9.67157 21.3284 9 20.5 9V9C19.6716 9 19 9.67157 19 10.5V15"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M18 16L18.8581 15.1419C18.949 15.051 19 14.9278 19 14.7994V14.7994C19 14.6159 18.8963 14.4482 18.7322 14.3661L18.2893 14.1447C17.5194 13.7597 16.5894 13.9106 15.9807 14.5193L15.0858 15.4142C14.7107 15.7893 14.5 16.298 14.5 16.8284V20"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M6 20L2.17574 16.1757C2.06321 16.0632 2 15.9106 2 15.7515V10.5C2 9.67157 2.67157 9 3.5 9V9C4.32843 9 5 9.67157 5 10.5V15"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M6 16L5.14187 15.1419C5.05103 15.051 5 14.9278 5 14.7994V14.7994C5 14.6159 5.10366 14.4482 5.26776 14.3661L5.71067 14.1447C6.48064 13.7597 7.41059 13.9106 8.01931 14.5193L8.91421 15.4142C9.28929 15.7893 9.5 16.298 9.5 16.8284V20"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>Support my work</span>
          </a>
        </li>
        <li class="desktop-hide">
          <a
            class="support-link-item nav-text-desktop"
            data-testid="support-link-mobile"
            href="https://u77w41.github.io/support-my-work/"
            target="_blank"
            rel="noreferrer"
            aria-label="Support my work: send a small tip over UPI"
            title="Support my work: send a small tip over UPI"
          >
            <svg
              class="nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                class="heart-icon"
                d="M16 6.27975C16 6.88118 15.7625 7.45883 15.3383 7.88611C14.3619 8.87007 13.415 9.89605 12.4021 10.8443C12.17 11.0585 11.8017 11.0507 11.5795 10.8268L8.6615 7.88611C7.7795 6.99725 7.7795 5.56225 8.6615 4.67339C9.55218 3.77579 11.0032 3.77579 11.8938 4.67339L11.9999 4.78027L12.1059 4.67345C12.533 4.24286 13.1146 4 13.7221 4C14.3297 4 14.9113 4.24284 15.3383 4.67339C15.7625 5.10073 16 5.67835 16 6.27975Z"
                stroke-linejoin="round"
              />
              <path
                d="M18 20L21.8243 16.1757C21.9368 16.0632 22 15.9106 22 15.7515V10.5C22 9.67157 21.3284 9 20.5 9V9C19.6716 9 19 9.67157 19 10.5V15"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M18 16L18.8581 15.1419C18.949 15.051 19 14.9278 19 14.7994V14.7994C19 14.6159 18.8963 14.4482 18.7322 14.3661L18.2893 14.1447C17.5194 13.7597 16.5894 13.9106 15.9807 14.5193L15.0858 15.4142C14.7107 15.7893 14.5 16.298 14.5 16.8284V20"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M6 20L2.17574 16.1757C2.06321 16.0632 2 15.9106 2 15.7515V10.5C2 9.67157 2.67157 9 3.5 9V9C4.32843 9 5 9.67157 5 10.5V15"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M6 16L5.14187 15.1419C5.05103 15.051 5 14.9278 5 14.7994V14.7994C5 14.6159 5.10366 14.4482 5.26776 14.3661L5.71067 14.1447C6.48064 13.7597 7.41059 13.9106 8.01931 14.5193L8.91421 15.4142C9.28929 15.7893 9.5 16.298 9.5 16.8284V20"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </a>
        </li>
      </ul>
    </nav>
  </div>
</header>

<main id="main" class="container-wide" tabindex="-1">
  <svelte:boundary>
    {#snippet failed(error, reset)}
      <div class="container">
        <div class="card error-boundary-card" role="alert">
          <h2>Something went wrong</h2>
          <p class="error-boundary-msg">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <div class="boundary-actions">
            <button type="button" class="btn-primary" onclick={reset}>Try again</button>
            <button type="button" class="btn-secondary" onclick={() => window.location.reload()}>
              Reload
            </button>
            <a
              class="btn-secondary link-btn"
              href="https://github.com/U77w41/diff-checker/issues"
              target="_blank"
              rel="noreferrer"
            >
              Report an issue
            </a>
          </div>
        </div>
      </div>
    {/snippet}

    <div class="container">
      <section class="intro">
        <div class="app-title-row">
          <svg
            class="app-title-logo"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 3L12 21M14.7107 19.3887C17.1796 18.8321 19.1072 16.979 19.6863 14.6058C20.1046 12.8918 20.1046 11.1081 19.6863 9.39419C19.1072 7.02094 17.1796 5.16789 14.7107 4.61121M12 4.30969C11.0904 4.30969 10.1808 4.41019 9.28927 4.61121C6.82045 5.16789 4.89278 7.02094 4.31367 9.39419C3.89544 11.1081 3.89544 12.8918 4.31367 14.6058C4.89278 16.979 6.82045 18.8321 9.28928 19.3887C10.1808 19.5898 11.0904 19.6903 12 19.6903"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
          <h1>Diff Checker</h1>
        </div>
        <p>
          Compare text files, source code, or Jupyter notebooks directly in your browser. Your files
          stay private on your device.
        </p>

        <!-- Mode Selector Tabs -->
        <div class="mode-tabs-bar" role="tablist" aria-label="Diff comparison mode">
          <button
            type="button"
            role="tab"
            aria-selected={currentMode === 'text'}
            class="tab-btn {currentMode === 'text' ? 'active' : ''}"
            onclick={() => {
              currentMode = 'text';
              window.location.hash = '#text';
              void runDiffNow();
            }}
          >
            {#if currentMode === 'text'}
              <span class="active-dot" aria-hidden="true">●</span>
            {/if}
            <span class="tab-label">📄 Text &amp; Scripts</span>
            {#if currentMode === 'text'}
              <span class="active-badge">Active</span>
            {/if}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={currentMode === 'notebook'}
            class="tab-btn {currentMode === 'notebook' ? 'active' : ''}"
            onclick={() => {
              currentMode = 'notebook';
              window.location.hash = '#notebook';
              void runDiffNow();
            }}
          >
            {#if currentMode === 'notebook'}
              <span class="active-dot" aria-hidden="true">●</span>
            {/if}
            <span class="tab-label">🪐 Jupyter Notebooks</span>
            {#if currentMode === 'notebook'}
              <span class="active-badge">Active</span>
            {/if}
          </button>
        </div>
      </section>

      {#if shareBannerError}
        <div class="status-banner error" role="alert">
          <span>⚠️ {shareBannerError}</span>
          <button type="button" class="banner-close" onclick={() => (shareBannerError = null)}>
            ✕
          </button>
        </div>
      {/if}

      {#if storageError}
        <div class="status-banner warning" role="alert">
          <span>⚠️ {storageError}</span>
          <button type="button" class="banner-close" onclick={() => (storageError = null)}>
            ✕
          </button>
        </div>
      {/if}

      {#if modeMismatchWarning}
        <div class="status-banner warning" role="alert">
          <span>⚠️ {modeMismatchWarning}</span>
          <button type="button" class="banner-close" onclick={() => (modeMismatchWarning = null)}>
            ✕
          </button>
        </div>
      {/if}

      {#if notebookJsonError}
        <div class="status-banner error" role="alert">
          <div>
            <strong>Invalid notebook JSON:</strong>
            {notebookJsonError.message}
            {#if notebookJsonError.line !== undefined}
              (Line {notebookJsonError.line}, Column {notebookJsonError.column})
            {/if}
          </div>
          <button type="button" class="btn-secondary-banner" onclick={handleCompareAsPlainText}>
            Compare as plain text instead
          </button>
        </div>
      {/if}

      {#if notebookFormatError}
        <div class="status-banner error" role="alert">
          <div>
            <strong>Unsupported format:</strong>
            {notebookFormatError}
          </div>
          <button type="button" class="btn-secondary-banner" onclick={handleCompareAsPlainText}>
            Compare as plain text instead
          </button>
        </div>
      {/if}

      {#if diffErrorMessage}
        <div class="status-banner error" role="alert">
          <span>⚠️ {diffErrorMessage}</span>
          <button type="button" class="btn-secondary-banner" onclick={() => void runDiffNow()}>
            Retry
          </button>
        </div>
      {/if}

      <!-- Input Panels -->
      <InputPanel
        bind:textA
        bind:textB
        bind:fileNameA
        bind:fileNameB
        bind:rememberInputs
        isDiffAvailable={diffResult !== null || nbDiffResult !== null}
        onCompare={runDiffNow}
        onLoadExample={handleLoadExample}
        onLoadBundle={handleLoadBundle}
        onToggleRememberInputs={(val) => {
          rememberInputs = val;
          persistSettings();
        }}
      />
    </div>

    <!-- Results Section -->
    {#if showProgress}
      <div class="progress-bar-container">
        <div class="progress-bar" role="progressbar" aria-label="Computing diff..."></div>
      </div>
    {/if}

    {#if slowWarning}
      <div class="container">
        <div class="slow-warning card">
          <span>Diff is taking longer than usual...</span>
          <button
            type="button"
            class="btn-secondary"
            onclick={() => {
              workerManager.spawn();
              isDiffing = false;
              slowWarning = false;
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}

    {#if currentMode === 'notebook' && nbDiffResult}
      <div class="results-area">
        <NotebookView
          bind:this={notebookViewComponent}
          diffResult={nbDiffResult}
          rawA={textA}
          rawB={textB}
          options={nbOptions}
          onOptionsChange={(newOpts) => {
            nbOptions = { ...nbOptions, ...newOpts };
            void runDiffNow();
          }}
        />
      </div>
    {:else if currentMode === 'text' && diffResult}
      <div class="results-area">
        <Toolbar
          bind:options
          bind:viewMode
          bind:selectedLanguage
          stats={diffResult.stats}
          {chunkCount}
          {currentChunk}
          onPrevChange={handlePrevChange}
          onNextChange={handleNextChange}
          onCopyPatch={handleCopyPatch}
          onDownloadPatch={handleDownloadPatch}
          onShare={() => (isShareOpen = true)}
          onHelp={() => (isHelpOpen = true)}
        />

        <TextView
          bind:this={textViewComponent}
          {textA}
          {textB}
          changes={diffResult.changes}
          identical={diffResult.identical}
          {options}
          {viewMode}
          {selectedLanguage}
          onChunkCountChange={(count: number) => (chunkCount = count)}
          onCurrentChunkChange={(curr: number) => (currentChunk = curr)}
        />
      </div>
    {/if}
  </svelte:boundary>
</main>

<footer class="site-footer">
  <div class="container">
    <nav class="footer-nav" aria-label="Footer">
      <a href="https://u77w41.github.io/resume/">Hire Me</a>
      <a href="https://u77w41.github.io/anurup/">Anurup</a>
      <a href="https://github.com/U77w41/diff-checker" target="_blank" rel="noreferrer"
        >Source on GitHub</a
      >
    </nav>
    <p class="footer-privacy">Everything runs in your browser. Your files are never uploaded.</p>
    <p class="footer-support">
      <a
        data-testid="support-link-footer"
        href="https://u77w41.github.io/support-my-work/"
        target="_blank"
        rel="noreferrer"
        title="Support my work: send a small tip over UPI"
      >
        <svg
          class="nav-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            class="heart-icon"
            d="M16 6.27975C16 6.88118 15.7625 7.45883 15.3383 7.88611C14.3619 8.87007 13.415 9.89605 12.4021 10.8443C12.17 11.0585 11.8017 11.0507 11.5795 10.8268L8.6615 7.88611C7.7795 6.99725 7.7795 5.56225 8.6615 4.67339C9.55218 3.77579 11.0032 3.77579 11.8938 4.67339L11.9999 4.78027L12.1059 4.67345C12.533 4.24286 13.1146 4 13.7221 4C14.3297 4 14.9113 4.24284 15.3383 4.67339C15.7625 5.10073 16 5.67835 16 6.27975Z"
            stroke-linejoin="round"
          />
          <path
            d="M18 20L21.8243 16.1757C21.9368 16.0632 22 15.9106 22 15.7515V10.5C22 9.67157 21.3284 9 20.5 9V9C19.6716 9 19 9.67157 19 10.5V15"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M18 16L18.8581 15.1419C18.949 15.051 19 14.9278 19 14.7994V14.7994C19 14.6159 18.8963 14.4482 18.7322 14.3661L18.2893 14.1447C17.5194 13.7597 16.5894 13.9106 15.9807 14.5193L15.0858 15.4142C14.7107 15.7893 14.5 16.298 14.5 16.8284V20"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M6 20L2.17574 16.1757C2.06321 16.0632 2 15.9106 2 15.7515V10.5C2 9.67157 2.67157 9 3.5 9V9C4.32843 9 5 9.67157 5 10.5V15"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M6 16L5.14187 15.1419C5.05103 15.051 5 14.9278 5 14.7994V14.7994C5 14.6159 5.10366 14.4482 5.26776 14.3661L5.71067 14.1447C6.48064 13.7597 7.41059 13.9106 8.01931 14.5193L8.91421 15.4142C9.28929 15.7893 9.5 16.298 9.5 16.8284V20"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>Support my work</span>
      </a>
    </p>
    <p class="copyright">{copyrightText}</p>
  </div>
</footer>

<!-- Modals -->
<ShareModal
  bind:isOpen={isShareOpen}
  payload={currentSharePayload}
  onLoadBundle={handleLoadBundle}
/>

<HelpModal bind:isOpen={isHelpOpen} />

<style>
  .app-title-row {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    margin-bottom: 0.25rem;
  }

  .app-title-logo {
    width: 2.1rem;
    height: 2.1rem;
    color: var(--accent);
    flex-shrink: 0;
  }

  .app-title-row h1 {
    margin: 0;
  }

  .results-area {
    width: 100%;
    margin-top: 10px;
  }

  .progress-bar-container {
    width: 100%;
    height: 4px;
    background: var(--border);
    overflow: hidden;
    margin-bottom: 12px;
  }

  .progress-bar {
    width: 40%;
    height: 100%;
    background: var(--accent);
    animation: indeterminate 1.2s infinite ease-in-out;
  }

  .slow-warning {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    margin-bottom: 16px;
    background: rgba(234, 88, 12, 0.1);
    color: #c2410c;
  }

  .mode-tabs-bar {
    display: inline-flex;
    align-items: center;
    background: var(--card-background-muted);
    border: 1px solid var(--border);
    border-radius: 9999px;
    padding: 4px;
    gap: 4px;
    margin-top: 0.75rem;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .tab-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 1.1rem;
    font-size: var(--font-size-sm);
    font-weight: 500;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 9999px;
    color: var(--text-muted);
    cursor: pointer;
    min-height: 44px;
    transition: all 0.15s ease-in-out;
  }

  .tab-btn:hover:not(.active) {
    background: var(--card-background);
    color: var(--text-main);
  }

  .tab-btn.active,
  .tab-btn[aria-selected='true'] {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
    font-weight: 700;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  }

  .tab-label {
    display: inline-block;
  }

  .active-dot {
    font-size: 0.65rem;
    color: currentColor;
    opacity: 0.9;
  }

  .active-badge {
    font-size: 0.7rem;
    padding: 0.12rem 0.5rem;
    border-radius: 9999px;
    background: var(--accent-text);
    color: var(--accent);
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .status-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-radius: var(--radius-control);
    margin-bottom: 16px;
    font-size: 14px;
    gap: 12px;
    flex-wrap: wrap;
  }

  .status-banner.error {
    background: var(--danger-bg);
    border: 1px solid var(--danger);
    color: var(--danger);
  }

  .status-banner.warning {
    background: rgba(234, 88, 12, 0.1);
    border: 1px solid #c2410c;
    color: #c2410c;
  }

  .banner-close {
    background: none;
    border: none;
    font-size: 14px;
    cursor: pointer;
    color: inherit;
    padding: 4px 8px;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-secondary-banner {
    background: var(--card-background);
    border: 1px solid var(--border-strong);
    color: var(--text-main);
    padding: 6px 12px;
    border-radius: var(--radius-control);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    min-height: 44px;
  }

  .error-boundary-card {
    padding: 24px;
    margin: 24px 0;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .error-boundary-card h2 {
    margin: 0;
    color: var(--danger);
    font-size: 1.3rem;
  }

  .error-boundary-msg {
    color: var(--text-body);
    font-size: 0.95rem;
    margin: 0;
  }

  .boundary-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .link-btn {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    min-height: 44px;
    padding: 0 16px;
  }

  @keyframes indeterminate {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(350%);
    }
  }
</style>
