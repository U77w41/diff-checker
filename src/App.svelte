<script lang="ts">
  import { onMount } from 'svelte';
  import { initTheme, toggleTheme, isDark } from './app/theme';

  let dark = $state(false);
  const currentYear = new Date().getFullYear();
  const launchYear = 2026;
  const copyrightText =
    launchYear === currentYear
      ? `© ${launchYear} Ujjwal Chowdhury`
      : `© ${launchYear} – ${currentYear} Ujjwal Chowdhury`;

  onMount(() => {
    dark = isDark();
    const cleanup = initTheme();
    return cleanup;
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
</script>

<a class="skip-link" href="#main" onclick={handleSkipToContent}>Skip to content</a>

<header class="site-header">
  <div class="container header-inner">
    <a
      class="brand"
      href="https://u77w41.github.io/"
      aria-label="Ujjwal Chowdhury, back to the main site"
    >
      <img class="brand-avatar" src="./assets/avatar.png" width="44" height="44" alt="" />
      <span class="brand-text">
        <span class="brand-name">Ujjwal Chowdhury</span>
        <span class="brand-tagline">Data Scientist | AI Researcher | Building for Bharat</span>
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
          <a class="nav-text-desktop" href="https://u77w41.github.io/anurup/" aria-label="Anurup">
            <svg
              class="nav-icon"
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
            <span class="nav-label">Anurup</span>
          </a>
        </li>
        <!-- Desktop Support my work link -->
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
        <!-- Mobile Support my work link (round icon button) -->
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

<main id="main" class="container" tabindex="-1">
  <section class="intro">
    <h1>Diff Checker</h1>
    <p>
      A free, public web tool that compares two texts, scripts or Jupyter notebooks entirely in your
      browser.
    </p>
    <p class="privacy-line">Runs entirely in your browser — nothing is uploaded.</p>
  </section>

  <div class="card">
    <p>Diff engine scaffolded and ready for Phase 1 (Text diff core).</p>
  </div>
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
