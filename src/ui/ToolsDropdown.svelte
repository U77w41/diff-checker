<script lang="ts">
  let isOpen = $state(false);
  let toggleBtn: HTMLButtonElement | undefined = $state();
  let container: HTMLDivElement | undefined = $state();

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function closeDropdown(returnFocus = false) {
    if (isOpen) {
      isOpen = false;
      if (returnFocus && toggleBtn) {
        toggleBtn.focus();
      }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      e.stopPropagation();
      const shouldFocus = container ? container.contains(document.activeElement) : false;
      closeDropdown(shouldFocus);
    }
  }

  function handleWindowClick(e: MouseEvent) {
    if (isOpen && container && !container.contains(e.target as Node)) {
      closeDropdown(false);
    }
  }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleKeydown} />

<div class="menu-social-dropdown" bind:this={container}>
  <button
    bind:this={toggleBtn}
    type="button"
    class="menu-social-dropdown-toggle nav-text-desktop"
    title="My Other Tools"
    aria-label="My Other Tools"
    aria-haspopup="true"
    aria-expanded={isOpen}
    aria-controls="menu-social-dropdown-tools"
    onclick={toggleDropdown}
  >
    <svg
      class="nav-icon icon-tools-grid"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="17.5" cy="17.5" r="3.5" />
      <circle cx="17.5" cy="6.5" r="3.5" />
      <circle cx="6.5" cy="17.5" r="3.5" />
      <circle cx="6.5" cy="6.5" r="3.5" />
    </svg>
    <span class="nav-label">My Other Tools</span>
    <span class="menu-social-dropdown-chevron" aria-hidden="true">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="icon icon-chevron"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M9 6l6 6-6 6" />
      </svg>
    </span>
  </button>

  <div class="menu-social-dropdown-panel" id="menu-social-dropdown-tools" hidden={!isOpen}>
    <p class="menu-social-dropdown-title">Tools</p>
    <ul>
      <li>
        <a
          href="https://u77w41.github.io/anurup/"
          target="_blank"
          rel="noopener noreferrer"
          onclick={() => closeDropdown(false)}
        >
          <span class="menu-social-dropdown-icon">
            <svg
              class="icon icon-anurup"
              width="32"
              height="32"
              viewBox="100 100 800 800"
              fill="none"
              stroke="currentColor"
              stroke-width="64"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M 280 200 H 740 A 60 60 0 0 1 800 260 V 640 A 60 60 0 0 1 740 700 H 650" />
              <path
                d="M 200 270 V 740 A 60 60 0 0 0 260 800 H 610 A 40 40 0 0 0 650 760 V 380 A 30 30 0 0 0 620 350 H 380 A 30 30 0 0 0 350 380 V 440 A 75 75 0 0 0 500 440 V 350"
              />
            </svg>
          </span>
          <span class="menu-social-dropdown-text">
            <span class="menu-social-dropdown-name">ANURUP</span>
            <span class="menu-social-dropdown-description">
              Privacy-first photo &amp; PDF tools for online forms
            </span>
          </span>
          <span class="menu-social-dropdown-external">
            <svg
              class="icon icon-external-link"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 6H6A2 2 0 004 8v10a2 2 0 002 2h10a2 2 0 002-2v-6" />
              <path d="M11 13l9-9" />
              <path d="M15 4h5v5" />
            </svg>
          </span>
        </a>
      </li>
    </ul>
  </div>
</div>

<style>
  .menu-social-dropdown {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .menu-social-dropdown-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    margin: 0;
    border: 0;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--text-body);
    font-size: 15px;
    font-family: inherit;
    font-weight: 400;
    line-height: inherit;
    cursor: pointer;
    white-space: nowrap;
    text-decoration: none;
    transition:
      background-color 0.15s ease,
      color 0.15s ease,
      border-color 0.15s ease;
  }

  .nav-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .nav-label {
    display: inline;
  }

  .menu-social-dropdown-toggle:hover {
    background: var(--card-background-muted);
    color: var(--text-main);
  }

  .menu-social-dropdown-toggle:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .menu-social-dropdown-toggle[aria-expanded='true'] {
    color: var(--accent);
  }

  .menu-social-dropdown-toggle[aria-expanded='true'] svg.icon-tools-grid {
    stroke: var(--accent);
  }

  .menu-social-dropdown-chevron {
    display: inline-flex;
    align-items: center;
    margin-left: -2px;
  }

  .menu-social-dropdown-chevron svg {
    width: 12px;
    height: 12px;
    stroke-width: 2.5;
    transform: rotate(90deg);
    transition: transform 0.2s ease;
  }

  .menu-social-dropdown-toggle[aria-expanded='true'] .menu-social-dropdown-chevron svg {
    transform: rotate(-90deg);
  }

  @media (prefers-reduced-motion: reduce) {
    .menu-social-dropdown-chevron svg {
      transition: none;
    }
  }

  .menu-social-dropdown-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 50;
    width: 320px;
    max-width: calc(100vw - 32px);
    padding: 8px;
    background: var(--card-background);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow:
      var(--shadow-l2),
      0 12px 32px rgba(0, 0, 0, 0.12);
  }

  @media (max-width: 768px) {
    .menu-social-dropdown {
      position: static;
    }

    .menu-social-dropdown-toggle {
      width: 40px;
      height: 40px;
      padding: 0;
      justify-content: center;
      border-radius: 50%;
      border: 1px solid var(--border);
      gap: 0;
    }

    .menu-social-dropdown-toggle:hover {
      border-color: var(--border-strong);
    }

    .menu-social-dropdown-toggle .nav-label {
      display: none;
    }

    .menu-social-dropdown-toggle .menu-social-dropdown-chevron {
      display: none;
    }

    .menu-social-dropdown-panel {
      right: auto;
      left: var(--gutter, 16px);
      width: min(320px, calc(100vw - 32px));
      top: 100%;
    }
  }

  :global([data-scheme='dark']) .menu-social-dropdown-panel {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  }

  .menu-social-dropdown-panel[hidden] {
    display: none;
  }

  .menu-social-dropdown-title {
    margin: 6px 10px 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .menu-social-dropdown-panel ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .menu-social-dropdown-panel a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: var(--radius-control);
    color: var(--text-main);
    text-decoration: none;
    transition: background-color 0.15s ease;
  }

  .menu-social-dropdown-panel a:hover {
    background: var(--card-background-muted);
  }

  .menu-social-dropdown-panel a:focus-visible {
    background: var(--card-background-muted);
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .menu-social-dropdown-icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
  }

  .menu-social-dropdown-icon svg {
    width: 32px;
    height: 32px;
    stroke: var(--accent);
  }

  .menu-social-dropdown-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    text-align: left;
  }

  .menu-social-dropdown-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-main);
  }

  .menu-social-dropdown-description {
    font-size: 12px;
    line-height: 1.35;
    color: var(--text-muted);
  }

  .menu-social-dropdown-external {
    display: flex;
    margin-left: auto;
    flex-shrink: 0;
    color: var(--text-muted);
  }

  .menu-social-dropdown-external svg {
    width: 16px;
    height: 16px;
  }
</style>
