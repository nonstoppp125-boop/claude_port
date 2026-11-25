/**
 * js/preloader.js
 * Cinematic preloader. Drives #preloader-bar, #preloader-percent and
 * #preloader-status, then fades the overlay out and unlocks scrolling.
 *
 * Imports: utils.js, content.js (PRELOADER_MESSAGES)
 *
 * DOM contract (index.html / motion.css):
 *   #preloader            gets .is-done to fade out, then `hidden`
 *   #preloader-bar        --progress (0..1) written via style.setProperty
 *   #preloader-percent    integer text 0..100
 *   #preloader-status     message text from PRELOADER_MESSAGES
 *   html.is-loading       scroll lock, removed when finished
 *
 * Public API:
 *   runPreloader(options?) -> Promise<void>
 *     Resolves after the overlay is fully hidden. main.js awaits it before
 *     starting the hero entrance (reveals) and the character.
 *     options.minDuration  minimum visible time in ms (default 1600)
 *     options.maxDuration  hard cap in ms (default 6000)
 */

import { qs, clamp, wait, nextFrame, prefersReducedMotion, transitionDone } from './utils.js';
import { PRELOADER_MESSAGES } from './content.js';

const DEFAULTS = {
  minDuration: 1600,
  maxDuration: 6000,
};

/** Ease-out so the bar moves quickly at first and settles near the end. */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/** Resolves when the window load event has fired (immediately if it already has). */
function windowLoaded() {
  if (document.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener('load', () => resolve(), { once: true });
  });
}

/** Resolves when web fonts are ready; never rejects and never hangs. */
function fontsReady() {
  if (!document.fonts || !document.fonts.ready) return Promise.resolve();
  return Promise.race([document.fonts.ready.catch(() => {}), wait(2000)]);
}

/** Resolves when the stylesheets linked in <head> have been applied. */
function stylesReady() {
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  const pending = links.filter((link) => !link.sheet);
  if (pending.length === 0) return Promise.resolve();
  return Promise.race([
    Promise.all(
      pending.map(
        (link) =>
          new Promise((resolve) => {
            link.addEventListener('load', resolve, { once: true });
            link.addEventListener('error', resolve, { once: true });
          })
      )
    ),
    wait(3000),
  ]);
}

export async function runPreloader(options = {}) {
  const { minDuration, maxDuration } = { ...DEFAULTS, ...options };

  const root = qs('#preloader');
  const bar = qs('#preloader-bar');
  const percent = qs('#preloader-percent');
  const status = qs('#preloader-status');
  const html = document.documentElement;

  // Nothing to animate: make sure the page is usable and stop.
  if (!root) {
    html.classList.remove('is-loading');
    return;
  }

  html.classList.add('is-loading');

  const reduced = prefersReducedMotion();
  const minMs = reduced ? 250 : minDuration;

  let resourcesDone = false;
  Promise.all([windowLoaded(), fontsReady(), stylesReady()]).then(() => {
    resourcesDone = true;
  });

  const messages = PRELOADER_MESSAGES.length ? PRELOADER_MESSAGES : ['Loading'];
  let lastMessage = -1;
  let shown = 0;

  function render(value) {
    const v = clamp(value, 0, 1);
    const whole = Math.round(v * 100);
    if (bar) bar.style.setProperty('--progress', v.toFixed(3));
    if (percent) percent.textContent = String(whole);

    const index = Math.min(messages.length - 1, Math.floor(v * messages.length));
    if (index !== lastMessage) {
      lastMessage = index;
      if (status) status.textContent = messages[index];
    }
    shown = v;
  }

  render(0);

  // Progress loop. The bar follows time up to 90%, and only the real
  // resource state (plus the minimum duration) allows it to reach 100%.
  await new Promise((resolve) => {
    const start = performance.now();

    function frame(now) {
      const elapsed = now - start;
      const timeRatio = clamp(elapsed / minMs, 0, 1);
      let target = easeOutCubic(timeRatio) * 0.9;

      if (resourcesDone && elapsed >= minMs) target = 1;

      // Smooth towards the target and never move backwards.
      const next = Math.max(shown, shown + (target - shown) * 0.2);
      render(target === 1 && target - next < 0.004 ? 1 : next);

      if (shown >= 1) {
        resolve();
        return;
      }
      if (elapsed >= maxDuration) {
        render(1);
        resolve();
        return;
      }
      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  });

  // Let the 100% state be visible briefly, then fade out.
  await wait(reduced ? 0 : 280);
  await nextFrame();

  root.classList.add('is-done');
  await transitionDone(root, reduced ? 50 : 1300);

  root.setAttribute('hidden', '');
  html.classList.remove('is-loading');

  // Return focus to the document start for keyboard and screen reader users.
  const main = qs('#main');
  if (main) main.focus({ preventScroll: true });
}
