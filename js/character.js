/**
 * js/character.js
 * Persistent olive-glass SVG character. Builds the SVG into #character-stage,
 * reacts to the active section with a speech bubble and a mood, follows the
 * pointer with its pupils, and falls asleep after a period of inactivity.
 *
 * Imports: utils.js, content.js (CHARACTER_LINES)
 *
 * DOM contract (index.html / motion.css):
 *   #character-root     data-mood = idle | wave | happy | sleep
 *                       --look-x / --look-y (unitless, about -3..3)
 *   #character-stage    receives <svg class="character__svg">
 *   #character-bubble   `hidden` attribute toggles visibility
 *   <html data-character="on|off">  owned by studio.js; "off" hides the
 *                       character via CSS, and no bubble is shown.
 *
 * SVG class names (exactly those styled in motion.css):
 *   ch-shadow ch-glow ch-antenna ch-antenna-tip ch-body ch-visor
 *   ch-eye (+ ch-eye--l / ch-eye--r) ch-pupil ch-mouth ch-cheek
 *   ch-arm--l ch-arm--r
 *
 * Public API:
 *   initCharacter() -> { start, say, setMood, destroy }
 *     start()          call once after the preloader ends. Until then the
 *                      character stays quiet; the latest section received via
 *                      the "sectionchange" event is then greeted.
 *     say(text, ms)    show the bubble for ms (default 4200)
 *     setMood(mood)    idle | wave | happy | sleep
 *
 * Call order in main.js: initCharacter() BEFORE initNav(), so the first
 * "sectionchange" event (fired by initNav) is received.
 */

import {
  qs,
  svgEl,
  clamp,
  rafThrottle,
  hasFinePointer,
  prefersReducedMotion,
  onMotionChange,
} from './utils.js';
import { CHARACTER_LINES } from './content.js';

const MOODS = ['idle', 'wave', 'happy', 'sleep'];
const BUBBLE_MS = 4200;
const WAVE_MS = 2600;
const SLEEP_AFTER_MS = 30000;
const MAX_LOOK = 3;

/* ==========================================================================
   SVG construction (viewBox 0 0 120 150)
   ========================================================================== */

function buildSvg() {
  const svg = svgEl('svg', {
    class: 'character__svg',
    viewBox: '0 0 120 150',
    focusable: 'false',
    'aria-hidden': 'true',
  });

  // Ground shadow and soft glow behind the body
  svg.appendChild(svgEl('ellipse', { class: 'ch-shadow', cx: 60, cy: 142, rx: 28, ry: 5 }));
  svg.appendChild(svgEl('circle', { class: 'ch-glow', cx: 60, cy: 80, r: 50 }));

  // Arms (drawn behind the body; they pivot from the shoulder in CSS)
  svg.appendChild(svgEl('rect', { class: 'ch-arm--l', x: 13, y: 74, width: 13, height: 36, rx: 6.5 }));
  svg.appendChild(svgEl('rect', { class: 'ch-arm--r', x: 94, y: 74, width: 13, height: 36, rx: 6.5 }));

  // Antenna
  svg.appendChild(svgEl('path', { class: 'ch-antenna', d: 'M60 26 L60 12' }));
  svg.appendChild(svgEl('circle', { class: 'ch-antenna-tip', cx: 60, cy: 9, r: 4.5 }));

  // Body: one glass capsule
  svg.appendChild(svgEl('rect', { class: 'ch-body', x: 26, y: 24, width: 68, height: 104, rx: 32 }));

  // Chest emblem: three bars, a nod to data analysis
  svg.appendChild(
    svgEl('path', {
      d: 'M50 116 V110 M60 116 V104 M70 116 V108',
      fill: 'none',
      'stroke-width': 3,
      'stroke-linecap': 'round',
      style: 'stroke: var(--accent); opacity: 0.8',
    })
  );

  // Visor with two eyes. Each eye is a group so the pupil blinks with it.
  svg.appendChild(svgEl('rect', { class: 'ch-visor', x: 34, y: 42, width: 52, height: 36, rx: 17 }));

  const eye = (side, cx) =>
    svgEl('g', { class: `ch-eye ch-eye--${side}` }, [
      svgEl('ellipse', { cx, cy: 60, rx: 6.5, ry: 7.5 }),
      svgEl('circle', { class: 'ch-pupil', cx, cy: 60, r: 2.8 }),
    ]);
  svg.appendChild(eye('l', 48));
  svg.appendChild(eye('r', 72));

  // Mouth and cheeks
  svg.appendChild(svgEl('path', { class: 'ch-mouth', d: 'M51 91 Q60 99 69 91' }));
  svg.appendChild(svgEl('ellipse', { class: 'ch-cheek', cx: 41, cy: 89, rx: 5, ry: 3 }));
  svg.appendChild(svgEl('ellipse', { class: 'ch-cheek', cx: 79, cy: 89, rx: 5, ry: 3 }));

  return svg;
}

/* ==========================================================================
   Controller
   ========================================================================== */

export function initCharacter() {
  const root = qs('#character-root');
  const stage = qs('#character-stage');
  const bubble = qs('#character-bubble');

  if (!root || !stage) {
    console.warn('[character] #character-root or #character-stage not found; character not initialised.');
    return { start() {}, say() {}, setMood() {}, destroy() {} };
  }

  stage.replaceChildren(buildSvg());

  const cleanups = [];
  let started = false;
  let latestSection = null;
  let lastSpokenSection = null;
  let mood = 'idle';
  let bubbleTimer = 0;
  let moodTimer = 0;
  let sleepTimer = 0;

  const isOff = () => document.documentElement.dataset.character === 'off';

  /* ---------- Mood ---------- */

  function setMood(next) {
    if (!MOODS.includes(next)) return;
    mood = next;
    root.dataset.mood = next;
  }

  function moodForSection(id) {
    if (id === 'hero') return 'wave';
    if (id === 'contact') return 'happy';
    return 'idle';
  }

  function applySectionMood(id) {
    window.clearTimeout(moodTimer);
    const next = moodForSection(id);
    setMood(next);
    if (next === 'wave') {
      moodTimer = window.setTimeout(() => {
        if (mood === 'wave') setMood('idle');
      }, WAVE_MS);
    }
  }

  /* ---------- Speech bubble ---------- */

  function hideBubble() {
    window.clearTimeout(bubbleTimer);
    if (bubble) bubble.hidden = true;
  }

  function say(text, ms = BUBBLE_MS) {
    if (!bubble || !text || isOff() || mood === 'sleep') return;
    window.clearTimeout(bubbleTimer);
    bubble.textContent = text;
    bubble.hidden = false;
    bubbleTimer = window.setTimeout(hideBubble, ms);
  }

  /* ---------- Section changes ---------- */

  function greet(id) {
    if (!id || id === lastSpokenSection) return;
    lastSpokenSection = id;
    applySectionMood(id);
    say(CHARACTER_LINES[id]);
  }

  function onSectionChange(event) {
    latestSection = event.detail && event.detail.id ? event.detail.id : null;
    if (!started) return; // stay quiet during the preloader
    greet(latestSection);
    scheduleSleep();
  }

  document.addEventListener('sectionchange', onSectionChange);
  cleanups.push(() => document.removeEventListener('sectionchange', onSectionChange));

  /* ---------- Sleep and wake ---------- */

  function scheduleSleep() {
    window.clearTimeout(sleepTimer);
    sleepTimer = window.setTimeout(() => {
      window.clearTimeout(moodTimer);
      hideBubble();
      setMood('sleep');
    }, SLEEP_AFTER_MS);
  }

  const onActivity = rafThrottle(() => {
    if (!started) return;
    if (mood === 'sleep') {
      setMood('idle');
      say('Welcome back!', 2400);
    }
    scheduleSleep();
  });

  ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((type) => {
    window.addEventListener(type, onActivity, { passive: true });
    cleanups.push(() => window.removeEventListener(type, onActivity));
  });

  /* ---------- Pupil tracking ---------- */

  function setLook(x, y) {
    root.style.setProperty('--look-x', x.toFixed(2));
    root.style.setProperty('--look-y', y.toFixed(2));
  }

  const onPointerMove = rafThrottle((event) => {
    if (prefersReducedMotion() || mood === 'sleep' || isOff()) {
      setLook(0, 0);
      return;
    }
    const rect = root.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.4;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const strength = clamp(dist / 320, 0, 1);
    setLook((dx / dist) * MAX_LOOK * strength, (dy / dist) * MAX_LOOK * strength);
  });

  if (hasFinePointer()) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    cleanups.push(() => window.removeEventListener('pointermove', onPointerMove));

    const onLeave = () => setLook(0, 0);
    document.documentElement.addEventListener('mouseleave', onLeave);
    cleanups.push(() => document.documentElement.removeEventListener('mouseleave', onLeave));
  }

  const stopMotionWatch = onMotionChange((reduced) => {
    if (reduced) setLook(0, 0);
  });
  cleanups.push(stopMotionWatch);

  /* ---------- Start ---------- */

  setMood('idle');
  setLook(0, 0);
  if (bubble) bubble.hidden = true;

  function start() {
    if (started) return;
    started = true;
    greet(latestSection || 'hero');
    scheduleSleep();
  }

  return {
    start,
    say,
    setMood,
    destroy() {
      window.clearTimeout(bubbleTimer);
      window.clearTimeout(moodTimer);
      window.clearTimeout(sleepTimer);
      cleanups.forEach((fn) => fn());
      cleanups.length = 0;
    },
  };
}
