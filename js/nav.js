/**
 * js/nav.js
 * Responsive navigation: mobile menu, scrolled-header state, active-section
 * highlighting, smooth in-page links and keyboard handling.
 *
 * Imports: utils.js
 *
 * DOM contract (index.html / layout.css):
 *   #site-header          gets .is-open (menu open) and .is-scrolled
 *   #nav-toggle           aria-expanded + aria-label kept in sync
 *   #site-nav             the menu panel
 *   [data-nav-link="id"]  every link, including the brand link
 *   [data-section]        every section with an id
 *
 * Public API:
 *   initNav() -> { closeMenu, openMenu, setActive, destroy }
 *   Also dispatches a "sectionchange" CustomEvent on document whenever the
 *   active section changes: event.detail = { id }. character.js listens to it.
 */

import { qs, qsa, rafThrottle, prefersReducedMotion } from './utils.js';

const DESKTOP_QUERY = '(min-width: 70rem)';
const SCROLLED_AT = 8;

export function initNav() {
  const header = qs('#site-header');
  const toggle = qs('#nav-toggle');
  const panel = qs('#site-nav');

  if (!header || !toggle || !panel) {
    console.warn('[nav] Required elements are missing; navigation not initialised.');
    return { closeMenu() {}, openMenu() {}, setActive() {}, destroy() {} };
  }

  const links = qsa('[data-nav-link]');
  const sections = qsa('[data-section]').filter((node) => node.id);
  const desktop = window.matchMedia(DESKTOP_QUERY);
  const cleanups = [];

  function on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  /* ---------- Mobile menu ---------- */

  function isOpen() {
    return header.classList.contains('is-open');
  }

  function openMenu() {
    if (desktop.matches) return;
    header.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
  }

  function closeMenu({ returnFocus = false } = {}) {
    if (!isOpen()) return;
    header.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    if (returnFocus) toggle.focus();
  }

  on(toggle, 'click', () => {
    if (isOpen()) closeMenu();
    else openMenu();
  });

  // Escape closes the menu and returns focus to the toggle.
  on(document, 'keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      closeMenu({ returnFocus: true });
    }
  });

  // Click outside the header closes the menu.
  on(document, 'pointerdown', (event) => {
    if (isOpen() && !header.contains(event.target)) closeMenu();
  });

  // Leaving the mobile layout always resets the menu.
  const onViewportChange = () => {
    if (desktop.matches) closeMenu();
  };
  if (typeof desktop.addEventListener === 'function') {
    desktop.addEventListener('change', onViewportChange);
    cleanups.push(() => desktop.removeEventListener('change', onViewportChange));
  } else if (typeof desktop.addListener === 'function') {
    desktop.addListener(onViewportChange);
    cleanups.push(() => desktop.removeListener(onViewportChange));
  }

  /* ---------- In-page links ---------- */

  function scrollToHash(hash, { updateHistory = true } = {}) {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    const target = id ? document.getElementById(id) : null;
    if (!target) return false;

    target.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });

    if (updateHistory && window.location.hash !== `#${id}`) {
      history.pushState(null, '', `#${id}`);
    }

    // Move keyboard focus to the target without a second scroll.
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    return true;
  }

  on(document, 'click', (event) => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const hash = anchor.getAttribute('href');
    if (!hash || hash === '#') return;

    if (scrollToHash(hash)) {
      event.preventDefault();
      if (anchor.closest('#site-nav') || anchor.closest('#site-header')) closeMenu();
    }
  });

  on(window, 'popstate', () => {
    if (window.location.hash) scrollToHash(window.location.hash, { updateHistory: false });
  });

  /* ---------- Active section ---------- */

  let activeId = null;

  function setActive(id) {
    if (!id || id === activeId) return;
    activeId = id;

    links.forEach((link) => {
      const match = link.dataset.navLink === id;
      link.classList.toggle('is-active', match);
      if (match) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });

    document.dispatchEvent(new CustomEvent('sectionchange', { detail: { id } }));
  }

  function computeActive() {
    if (sections.length === 0) return;

    // Reading line: just below the fixed header, 35% down the viewport.
    const line = window.innerHeight * 0.35;
    let current = sections[0].id;

    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= line) current = section.id;
    }

    // At the very bottom of the page the last section wins.
    const doc = document.documentElement;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
      current = sections[sections.length - 1].id;
    }

    setActive(current);
  }

  /* ---------- Scroll state ---------- */

  const onScroll = rafThrottle(() => {
    header.classList.toggle('is-scrolled', window.scrollY > SCROLLED_AT);
    computeActive();
  });

  on(window, 'scroll', onScroll, { passive: true });
  on(window, 'resize', onScroll, { passive: true });

  // Initial state, plus a deep link such as /#projects on first load.
  onScroll();
  if (window.location.hash) {
    window.requestAnimationFrame(() => scrollToHash(window.location.hash, { updateHistory: false }));
  }

  return {
    openMenu,
    closeMenu,
    setActive,
    destroy() {
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
    },
  };
}
