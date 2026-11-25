/**
 * js/reveal.js
 * Scroll reveal. Adds the class .is-visible (once) to every [data-reveal]
 * and [data-reveal-stagger] element when it enters the viewport.
 * The hidden and visible states, delays and stagger order are pure CSS
 * (css/motion.css). This module only flips the class.
 *
 * Imports: utils.js
 *
 * Public API:
 *   initReveal(root?) -> { observe, revealAll, destroy }
 *     root     optional element to scan (default: document)
 *     observe(node)   start observing a node added later (for example,
 *                     containers that main.js renders after initReveal)
 *     revealAll()     show everything immediately
 *
 * Call order in main.js: render content first, then initReveal(), so that
 * dynamically rendered [data-reveal-stagger] containers are discovered.
 * Elements inside the hero should be revealed only after the preloader ends
 * (main.js awaits runPreloader() before calling initReveal()).
 */

import { qsa, prefersReducedMotion, onMotionChange } from './utils.js';

const SELECTOR = '[data-reveal], [data-reveal-stagger]';
const VISIBLE = 'is-visible';

export function initReveal(root = document) {
  const supportsObserver = typeof window.IntersectionObserver === 'function';
  let observer = null;

  function show(node) {
    node.classList.add(VISIBLE);
  }

  function revealAll() {
    qsa(SELECTOR, root).forEach(show);
    if (observer) observer.disconnect();
  }

  // No observer support, or reduced motion: show everything immediately.
  if (!supportsObserver || prefersReducedMotion()) {
    revealAll();
  }

  if (supportsObserver) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          show(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        // Trigger slightly before the element is fully inside the viewport.
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.12,
      }
    );
  }

  function observe(node) {
    if (!node || node.classList.contains(VISIBLE)) return;
    if (!observer) {
      show(node);
      return;
    }
    observer.observe(node);
  }

  qsa(SELECTOR, root).forEach(observe);

  // If the user switches to reduced motion later, reveal what is still hidden.
  const stopMotionWatch = onMotionChange((reduced) => {
    if (reduced) revealAll();
  });

  return {
    observe,
    revealAll,
    destroy() {
      if (observer) observer.disconnect();
      stopMotionWatch();
    },
  };
}
