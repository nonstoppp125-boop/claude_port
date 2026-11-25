/**
 * js/progress.js
 * Custom scroll progress orb. Reflects page scroll progress as a ring and a
 * number, appears after a scroll threshold, and scrolls to the top on click.
 *
 * Imports: utils.js
 *
 * DOM contract (index.html / motion.css):
 *   #progress-orb         button; gets --progress (0..1) and .is-visible
 *   #progress-orb-ring    styled purely by CSS from --progress
 *   #progress-orb-value   integer text 0..100
 *
 * Public API:
 *   initProgress(options?) -> { update, destroy }
 *     options.showAfter   scrollY in px after which the orb appears (default 400)
 */

import { qs, rafThrottle, getScrollProgress, scrollToTop, announce } from './utils.js';

const DEFAULTS = {
  showAfter: 400,
};

export function initProgress(options = {}) {
  const { showAfter } = { ...DEFAULTS, ...options };

  const orb = qs('#progress-orb');
  const value = qs('#progress-orb-value');

  if (!orb) {
    console.warn('[progress] #progress-orb not found; progress orb not initialised.');
    return { update() {}, destroy() {} };
  }

  let lastWhole = -1;
  let lastVisible = null;

  function update() {
    const progress = getScrollProgress();
    const whole = Math.round(progress * 100);

    orb.style.setProperty('--progress', progress.toFixed(4));

    if (whole !== lastWhole) {
      lastWhole = whole;
      if (value) value.textContent = String(whole);
      orb.setAttribute('aria-label', `Back to top. Scroll progress ${whole} percent`);
    }

    const visible = window.scrollY > showAfter;
    if (visible !== lastVisible) {
      lastVisible = visible;
      orb.classList.toggle('is-visible', visible);
      // Keep a hidden orb out of the tab order (CSS also uses visibility:hidden).
      if (visible) orb.removeAttribute('tabindex');
      else orb.setAttribute('tabindex', '-1');
    }
  }

  const onScroll = rafThrottle(update);

  function onClick() {
    scrollToTop();
    announce('Scrolled to top');

    // Move focus to the start of the page so keyboard users are not stranded.
    const main = qs('#main');
    if (main) main.focus({ preventScroll: true });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  orb.addEventListener('click', onClick);

  update();

  return {
    update,
    destroy() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      orb.removeEventListener('click', onClick);
    },
  };
}
