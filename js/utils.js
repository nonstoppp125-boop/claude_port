/**
 * js/utils.js
 * Shared helpers for every other module. No side effects on import:
 * nothing runs until a function is called. Depends on nothing.
 *
 * Sections:
 *   1. DOM querying and building (qs, qsa, el, svgEl, icon)
 *   2. Math and timing (clamp, lerp, mapRange, debounce, rafThrottle, wait, nextFrame)
 *   3. Motion preference (prefersReducedMotion, onMotionChange)
 *   4. Safe storage (storageGet, storageSet, storageRemove)
 *   5. Accessibility (announce, getFocusable, trapFocus)
 *   6. Scrolling (getScrollProgress, scrollToTop)
 *   7. Transitions, URLs, misc
 */

/* ==========================================================================
   1. DOM querying and building
   ========================================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Path to the icon sprite, relative to the HTML documents (index.html, 404.html). */
export const ICON_SPRITE = 'assets/svg/icons.svg';

/** Returns the first match or null. */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/** Returns all matches as a real Array. */
export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function applyProps(node, props) {
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;

    switch (key) {
      case 'class':
      case 'className': {
        const text = Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value);
        if (text) node.setAttribute('class', text);
        break;
      }
      case 'text':
        node.textContent = String(value);
        break;
      case 'dataset':
        for (const [k, v] of Object.entries(value)) {
          if (v !== undefined && v !== null) node.dataset[k] = String(v);
        }
        break;
      case 'aria':
        // aria: { pressed: false } -> aria-pressed="false" (false is kept on purpose)
        for (const [k, v] of Object.entries(value)) {
          if (v !== undefined && v !== null) node.setAttribute(`aria-${k}`, String(v));
        }
        break;
      case 'style':
        if (typeof value === 'string') {
          node.style.cssText = value;
        } else {
          for (const [k, v] of Object.entries(value)) {
            if (v === undefined || v === null) continue;
            if (k.startsWith('--')) node.style.setProperty(k, String(v));
            else node.style[k] = String(v);
          }
        }
        break;
      case 'on':
        for (const [type, handler] of Object.entries(value)) {
          if (typeof handler === 'function') node.addEventListener(type, handler);
        }
        break;
      default:
        if (value === false) break;
        node.setAttribute(key, value === true ? '' : String(value));
    }
  }
}

function appendChildren(node, children) {
  if (children === undefined || children === null || children === false) return;
  if (Array.isArray(children)) {
    children.forEach((child) => appendChildren(node, child));
    return;
  }
  if (children instanceof Node) {
    node.appendChild(children);
    return;
  }
  node.appendChild(document.createTextNode(String(children)));
}

/**
 * Small, safe DOM builder (never uses innerHTML).
 *
 * el('li', { class: 'tag', dataset: { id: 'x' }, style: { '--level': 3 } }, 'SQL')
 *
 * props: class | className | text | dataset | aria | style | on | any attribute.
 *   A boolean attribute (hidden: true) is written as an empty attribute;
 *   false/null/undefined values are skipped.
 * children: string, number, Node, or (nested) arrays of those. null/false skipped.
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  applyProps(node, props || {});
  appendChildren(node, children);
  return node;
}

/** Same as el() but creates an element in the SVG namespace. */
export function svgEl(tag, props = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class' || key === 'className') node.setAttribute('class', String(value));
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  appendChildren(node, children);
  return node;
}

/**
 * Creates <svg class="icon [extraClass]"><use href="assets/svg/icons.svg#icon-NAME"/></svg>
 * Decorative by default (aria-hidden), so pair it with visible text or a label.
 */
export function icon(name, extraClass = '') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `icon ${extraClass}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `${ICON_SPRITE}#icon-${name}`);
  svg.appendChild(use);
  return svg;
}

/** Runs fn once the DOM is parsed (immediately if it already is). */
export function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

/* ==========================================================================
   2. Math and timing
   ========================================================================== */

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Maps value from [inMin, inMax] to [outMin, outMax], clamped to the output range. */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return lerp(outMin, outMax, t);
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Returns a random element of a non-empty array (undefined for an empty one). */
export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Trailing debounce. The returned function has a .cancel() method. */
export function debounce(fn, wait = 150) {
  let timer = 0;
  const debounced = (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => window.clearTimeout(timer);
  return debounced;
}

/** Runs fn at most once per animation frame, with the latest arguments. */
export function rafThrottle(fn) {
  let queued = false;
  let lastArgs = [];
  return (...args) => {
    lastArgs = args;
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      fn(...lastArgs);
    });
  };
}

export function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}

let uidCounter = 0;
/** Unique id string, e.g. uid('tip') -> "tip-1". */
export function uid(prefix = 'id') {
  uidCounter += 1;
  return `${prefix}-${uidCounter}`;
}

/* ==========================================================================
   3. Motion preference
   Resolution order: <html data-motion="reduced"> -> true,
   data-motion="full" -> false, otherwise the OS setting ("auto").
   ========================================================================== */

const motionQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

export function prefersReducedMotion() {
  const mode = document.documentElement.dataset.motion;
  if (mode === 'reduced') return true;
  if (mode === 'full') return false;
  return motionQuery ? motionQuery.matches : false;
}

const motionListeners = new Set();
let motionLast = null;
let motionWired = false;

function emitMotionChange() {
  const now = prefersReducedMotion();
  if (now === motionLast) return;
  motionLast = now;
  motionListeners.forEach((listener) => {
    try {
      listener(now);
    } catch (error) {
      console.error('[utils] onMotionChange listener failed:', error);
    }
  });
}

function wireMotionListeners() {
  if (motionWired) return;
  motionWired = true;
  motionLast = prefersReducedMotion();

  if (motionQuery) {
    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', emitMotionChange);
    } else if (typeof motionQuery.addListener === 'function') {
      motionQuery.addListener(emitMotionChange);
    }
  }

  if (typeof MutationObserver === 'function') {
    new MutationObserver(emitMotionChange).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion'],
    });
  }
}

/**
 * Subscribes to changes of the effective reduced-motion state.
 * Fires when the OS setting changes or when <html data-motion> changes.
 * Returns an unsubscribe function. The callback receives a boolean.
 */
export function onMotionChange(callback) {
  wireMotionListeners();
  motionListeners.add(callback);
  return () => motionListeners.delete(callback);
}

/** True on devices whose primary pointer is a mouse/trackpad that can hover. */
export function hasFinePointer() {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
    : false;
}

/* ==========================================================================
   4. Safe storage
   localStorage can throw (private mode, blocked cookies, quota). Every call
   is guarded, with an in-memory fallback so the page keeps working for the
   current visit.
   ========================================================================== */

export const STORAGE_PREFIX = 'claude_port:';

const memoryStore = new Map();

function getStorage() {
  try {
    const store = window.localStorage;
    const probe = `${STORAGE_PREFIX}__probe__`;
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch (error) {
    return null;
  }
}

/** Reads and JSON-parses a value. Returns `fallback` when missing or invalid. */
export function storageGet(key, fallback = null) {
  const fullKey = STORAGE_PREFIX + key;
  const store = getStorage();
  let raw = null;

  if (store) {
    try {
      raw = store.getItem(fullKey);
    } catch (error) {
      raw = null;
    }
  } else if (memoryStore.has(fullKey)) {
    raw = memoryStore.get(fullKey);
  }

  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

/** JSON-stringifies and stores a value. Returns true when persisted to localStorage. */
export function storageSet(key, value) {
  const fullKey = STORAGE_PREFIX + key;
  let raw;
  try {
    raw = JSON.stringify(value);
  } catch (error) {
    return false;
  }

  const store = getStorage();
  if (store) {
    try {
      store.setItem(fullKey, raw);
      return true;
    } catch (error) {
      memoryStore.set(fullKey, raw);
      return false;
    }
  }
  memoryStore.set(fullKey, raw);
  return false;
}

export function storageRemove(key) {
  const fullKey = STORAGE_PREFIX + key;
  memoryStore.delete(fullKey);
  const store = getStorage();
  if (!store) return;
  try {
    store.removeItem(fullKey);
  } catch (error) {
    /* ignore */
  }
}

/* ==========================================================================
   5. Accessibility
   ========================================================================== */

/**
 * Announces a message to screen readers through #live-region.
 * The region is cleared first so repeating the same text is still announced.
 */
export function announce(message, politeness = 'polite') {
  const region = document.getElementById('live-region');
  if (!region) return;
  region.setAttribute('aria-live', politeness === 'assertive' ? 'assertive' : 'polite');
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = String(message);
  }, 60);
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Visible, keyboard-focusable descendants of `container`, in DOM order. */
export function getFocusable(container) {
  return qsa(FOCUSABLE_SELECTOR, container).filter(
    (node) =>
      !node.hasAttribute('hidden') &&
      node.getAttribute('aria-hidden') !== 'true' &&
      node.getClientRects().length > 0
  );
}

/**
 * Keeps Tab / Shift+Tab inside `container` while active (for dialogs).
 * Returns a release function. Focus placement on open/close is the caller's job.
 */
export function trapFocus(container) {
  if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');

  function onKeydown(event) {
    if (event.key !== 'Tab') return;

    const items = getFocusable(container);
    if (items.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (!container.contains(active)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('keydown', onKeydown);
  return () => document.removeEventListener('keydown', onKeydown);
}

/* ==========================================================================
   6. Scrolling
   ========================================================================== */

/** Page scroll progress as a number from 0 to 1. */
export function getScrollProgress() {
  const doc = document.documentElement;
  const maxScroll = doc.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) return 0;
  return clamp(window.scrollY / maxScroll, 0, 1);
}

/** Smooth scroll to the top (instant when reduced motion is in effect). */
export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/* ==========================================================================
   7. Transitions, URLs, misc
   ========================================================================== */

/**
 * Resolves when `node` finishes a CSS transition (transitionend fired on the
 * node itself) or after `timeout` ms, whichever comes first. The timeout also
 * covers reduced-motion mode where durations are ~1ms and may not fire.
 */
export function transitionDone(node, timeout = 1000) {
  return new Promise((resolve) => {
    let finished = false;
    let timer = 0;

    function onEnd(event) {
      if (event.target === node) finish();
    }

    function finish() {
      if (finished) return;
      finished = true;
      node.removeEventListener('transitionend', onEnd);
      window.clearTimeout(timer);
      resolve();
    }

    node.addEventListener('transitionend', onEnd);
    timer = window.setTimeout(finish, timeout);
  });
}

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Returns `url` if it is a hash, a relative path, or uses an allowed protocol
 * (http, https, mailto, tel). Anything else (e.g. javascript:) returns `fallback`.
 */
export function safeHref(url, fallback = '#') {
  if (typeof url !== 'string') return fallback;
  const value = url.trim();
  if (!value) return fallback;
  if (/^(#|\/|\.\/|\.\.\/)/.test(value)) return value;
  try {
    const parsed = new URL(value, window.location.href);
    return SAFE_PROTOCOLS.includes(parsed.protocol) ? value : fallback;
  } catch (error) {
    return fallback;
  }
}

/** True when the URL points to a different origin (use with rel="noopener noreferrer"). */
export function isExternalUrl(url) {
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch (error) {
    return false;
  }
}