/**
 * js/studio.js
 * Interactive Design Studio and persistent preferences, plus the 3D card tilt.
 *
 * Imports: utils.js
 *
 * Preferences (stored as one JSON object under the key "prefs", which
 * utils.js prefixes to "claude_port:prefs"):
 *   accent      cyan | azure | mint | violet | amber        default cyan
 *   glass       0..100 (step 5)                             default 60
 *   fontScale   90..125 (step 5, percent)                   default 100
 *   motion      auto | full | reduced                       default auto
 *   density     comfortable | compact                       default comfortable
 *   character   boolean                                     default true
 *   tilt        boolean                                     default true
 *   grain       boolean                                     default false
 *
 * Written to <html> (consumed by CSS and other modules):
 *   data-accent, data-motion, data-density      (as stored)
 *   data-grain, data-tilt, data-character       ("on" | "off")
 *   --glass-level, --font-scale                 (unitless numbers)
 *
 * DOM contract (index.html / studio.css):
 *   #studio-open, #studio, #studio-backdrop, #studio-close, #studio-form,
 *   #studio-reset, inputs with data-pref="<key>", and
 *   [data-pref-output="glass|fontScale"] live readouts.
 *   html.studio-open   page scroll lock (base.css)
 *
 * Public API:
 *   initStudio() -> { open, close, reset, getPrefs, destroy }
 *     Applies saved preferences immediately. Call it FIRST in main.js, so
 *     the page uses the saved accent, motion and size from the start.
 *   initTilt(root?) -> { destroy }
 *     Pointer-driven 3D tilt for every `main [data-tilt]` element. The
 *     selector is scoped to <main> because <html data-tilt="on|off"> is
 *     also a preference attribute.
 *   DEFAULT_PREFS
 */

import {
  qs,
  qsa,
  clamp,
  rafThrottle,
  prefersReducedMotion,
  storageGet,
  storageSet,
  storageRemove,
  announce,
  trapFocus,
  transitionDone,
} from './utils.js';

const STORAGE_KEY = 'prefs';

export const DEFAULT_PREFS = Object.freeze({
  accent: 'cyan',
  glass: 60,
  fontScale: 100,
  motion: 'auto',
  density: 'comfortable',
  character: true,
  tilt: true,
  grain: false,
});

const OPTIONS = {
  accent: ['cyan', 'azure', 'mint', 'violet', 'amber'],
  motion: ['auto', 'full', 'reduced'],
  density: ['comfortable', 'compact'],
};

const RANGES = {
  glass: { min: 0, max: 100, step: 5 },
  fontScale: { min: 90, max: 125, step: 5 },
};

const BOOLEANS = ['character', 'tilt', 'grain'];

/* ==========================================================================
   Preference helpers
   ========================================================================== */

/** Returns a complete, valid preferences object from untrusted input. */
function sanitize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const out = { ...DEFAULT_PREFS };

  Object.keys(OPTIONS).forEach((key) => {
    if (OPTIONS[key].includes(source[key])) out[key] = source[key];
  });

  Object.entries(RANGES).forEach(([key, { min, max, step }]) => {
    const n = Number(source[key]);
    if (Number.isFinite(n)) out[key] = clamp(Math.round(n / step) * step, min, max);
  });

  BOOLEANS.forEach((key) => {
    if (typeof source[key] === 'boolean') out[key] = source[key];
  });

  return out;
}

/** Writes preferences to <html> as attributes and custom properties. */
function applyPrefs(prefs) {
  const root = document.documentElement;
  root.dataset.accent = prefs.accent;
  root.dataset.motion = prefs.motion;
  root.dataset.density = prefs.density;
  root.dataset.grain = prefs.grain ? 'on' : 'off';
  root.dataset.tilt = prefs.tilt ? 'on' : 'off';
  root.dataset.character = prefs.character ? 'on' : 'off';
  root.style.setProperty('--glass-level', String(prefs.glass));
  root.style.setProperty('--font-scale', String(prefs.fontScale));
}

/* ==========================================================================
   Design Studio
   ========================================================================== */

export function initStudio() {
  let prefs = sanitize(storageGet(STORAGE_KEY, null));
  applyPrefs(prefs);

  const opener = qs('#studio-open');
  const studio = qs('#studio');
  const backdrop = qs('#studio-backdrop');
  const closeBtn = qs('#studio-close');
  const form = qs('#studio-form');
  const resetBtn = qs('#studio-reset');

  const noop = {
    open() {},
    close() {},
    reset() {},
    getPrefs: () => ({ ...prefs }),
    destroy() {},
  };

  if (!studio || !backdrop || !form) {
    console.warn('[studio] Studio elements are missing; preferences applied, dialog disabled.');
    return noop;
  }

  const html = document.documentElement;
  const cleanups = [];
  let isOpen = false;
  let releaseTrap = null;
  let lastFocus = null;

  function on(target, type, handler, options) {
    if (!target) return;
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  /* ---------- Sync the form with the preferences ---------- */

  function syncForm() {
    qsa('[data-pref]', form).forEach((input) => {
      const key = input.dataset.pref;
      if (!(key in prefs)) return;

      if (input.type === 'radio') {
        input.checked = input.value === String(prefs[key]);
      } else if (input.type === 'checkbox') {
        input.checked = Boolean(prefs[key]);
      } else if (input.type === 'range') {
        input.value = String(prefs[key]);
        input.setAttribute('aria-valuetext', `${prefs[key]} percent`);
      }
    });

    qsa('[data-pref-output]', form).forEach((output) => {
      const key = output.dataset.prefOutput;
      if (key in prefs) output.textContent = String(prefs[key]);
    });
  }

  function commit() {
    applyPrefs(prefs);
    storageSet(STORAGE_KEY, prefs);
  }

  /* ---------- Input handling ---------- */

  function onFormChange(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const key = input.dataset.pref;
    if (!key || !(key in DEFAULT_PREFS)) return;

    const next = { ...prefs };

    if (input.type === 'checkbox') {
      next[key] = input.checked;
    } else if (input.type === 'radio') {
      if (!input.checked) return;
      next[key] = input.value;
    } else if (input.type === 'range') {
      next[key] = Number(input.value);
    } else {
      return;
    }

    prefs = sanitize(next);
    commit();

    // Keep readouts in step while dragging, without rewriting the slider
    // value under the user's finger.
    qsa('[data-pref-output]', form).forEach((output) => {
      const outKey = output.dataset.prefOutput;
      if (outKey in prefs) output.textContent = String(prefs[outKey]);
    });
    if (input.type === 'range') {
      input.setAttribute('aria-valuetext', `${prefs[key]} percent`);
    }
  }

  on(form, 'input', onFormChange);
  on(form, 'change', onFormChange);
  on(form, 'submit', (event) => event.preventDefault());

  /* ---------- Reset ---------- */

  function reset() {
    prefs = { ...DEFAULT_PREFS };
    applyPrefs(prefs);
    storageRemove(STORAGE_KEY);
    syncForm();
    announce('Design Studio preferences reset to defaults');
  }

  on(resetBtn, 'click', reset);

  /* ---------- Open and close ---------- */

  /** The nav menu (mobile) is closed through its own toggle so nav.js stays in sync. */
  function closeMobileMenu() {
    const header = qs('#site-header');
    const toggle = qs('#nav-toggle');
    if (header && toggle && header.classList.contains('is-open')) toggle.click();
  }

  function isFocusable(node) {
    if (!node || !document.contains(node)) return false;
    if (node.getClientRects().length === 0) return false;
    return window.getComputedStyle(node).visibility !== 'hidden';
  }

  function restoreFocus() {
    const candidates = [lastFocus, opener, qs('#nav-toggle')];
    const target = candidates.find((node) => node && node !== document.body && isFocusable(node));
    if (target) target.focus({ preventScroll: true });
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;

    closeMobileMenu();

    // Sequence required by studio.css: unhide, force a reflow, then animate in.
    studio.hidden = false;
    backdrop.hidden = false;
    studio.setAttribute('aria-hidden', 'false');
    void studio.offsetWidth;

    studio.classList.add('is-open');
    backdrop.classList.add('is-open');
    html.classList.add('studio-open');

    syncForm();
    releaseTrap = trapFocus(studio);
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  async function close() {
    if (!isOpen) return;
    isOpen = false;

    studio.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    html.classList.remove('studio-open');

    if (releaseTrap) {
      releaseTrap();
      releaseTrap = null;
    }
    restoreFocus();

    await transitionDone(studio, prefersReducedMotion() ? 30 : 750);

    // The panel may have been reopened while the transition was running.
    if (isOpen) return;
    studio.hidden = true;
    backdrop.hidden = true;
    studio.setAttribute('aria-hidden', 'true');
  }

  on(opener, 'click', open);
  on(closeBtn, 'click', close);
  on(backdrop, 'click', close);
  on(document, 'keydown', (event) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      close();
    }
  });

  syncForm();

  return {
    open,
    close,
    reset,
    getPrefs: () => ({ ...prefs }),
    destroy() {
      if (releaseTrap) releaseTrap();
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
    },
  };
}

/* ==========================================================================
   3D tilt
   Writes, on each `main [data-tilt]` element:
     --tilt-x, --tilt-y     unitless -1..1   (consumed by .glass--tilt)
     --glare-x, --glare-y   percentages
   and toggles .is-tilting while the mouse is over the element.
   Touch and pen input are ignored on purpose.
   ========================================================================== */

export function initTilt(root = document) {
  const nodes = qsa('main [data-tilt]', root);
  const cleanups = [];

  nodes.forEach((node) => {
    let active = false;

    const setVars = (x, y, gx, gy) => {
      node.style.setProperty('--tilt-x', x);
      node.style.setProperty('--tilt-y', y);
      node.style.setProperty('--glare-x', gx);
      node.style.setProperty('--glare-y', gy);
    };

    const reset = () => {
      active = false;
      node.classList.remove('is-tilting');
      setVars('0', '0', '20%', '0%');
    };

    const enabled = (event) =>
      event.pointerType === 'mouse' &&
      document.documentElement.dataset.tilt !== 'off' &&
      !prefersReducedMotion();

    const update = rafThrottle((clientX, clientY) => {
      if (!active) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const px = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      const py = clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1);

      setVars(
        py.toFixed(3),
        px.toFixed(3),
        `${(((px + 1) / 2) * 100).toFixed(1)}%`,
        `${(((py + 1) / 2) * 100).toFixed(1)}%`
      );
    });

    const onMove = (event) => {
      if (!enabled(event)) {
        if (active) reset();
        return;
      }
      if (!active) {
        active = true;
        node.classList.add('is-tilting');
      }
      update(event.clientX, event.clientY);
    };

    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerleave', reset);
    node.addEventListener('pointercancel', reset);

    cleanups.push(() => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', reset);
      node.removeEventListener('pointercancel', reset);
      reset();
    });
  });

  return {
    destroy() {
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
    },
  };
}
