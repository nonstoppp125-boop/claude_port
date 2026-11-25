/**
 * js/main.js
 * Entry point (loaded by index.html as <script type="module">).
 * Renders content from content.js into the containers in index.html, wires
 * the contact form, then starts every feature module in a safe order.
 *
 * Imports: utils.js, content.js, preloader.js, nav.js, reveal.js,
 *          progress.js, character.js, studio.js
 *
 * Boot order (each step is isolated in try/catch, so one failure never
 * leaves the page blank or the preloader stuck):
 *   1. initStudio()      saved preferences apply immediately
 *   2. render sections   all [data-reveal-stagger] containers get their children
 *   3. initCharacter()   BEFORE initNav(), so it receives the first "sectionchange"
 *   4. initProgress(), initNav(), contact form
 *   5. await runPreloader()
 *   6. initReveal(), initTilt(), character.start(), hero role rotation
 */

import {
  qs,
  qsa,
  el,
  icon,
  onReady,
  safeHref,
  announce,
  pad2,
  clamp,
  prefersReducedMotion,
} from './utils.js';

import {
  SITE,
  HERO_ROLES,
  ABOUT_FACTS,
  EDUCATION,
  SKILL_LEVELS,
  SKILL_GROUPS,
  RESEARCH_INTERESTS,
  PROJECT_CATEGORIES,
  PROJECTS,
  DASHBOARD_SUMMARY,
  DASHBOARD_GAUGES,
  WORKFLOW_STEPS,
  ROADMAP,
  CONTACT_LINKS,
  isPlaceholder,
} from './content.js';

import { runPreloader } from './preloader.js';
import { initNav } from './nav.js';
import { initReveal } from './reveal.js';
import { initProgress } from './progress.js';
import { initCharacter } from './character.js';
import { initStudio, initTilt } from './studio.js';

/* ==========================================================================
   Helpers
   ========================================================================== */

const STATUS_LABELS = {
  placeholder: 'Placeholder',
  'in-progress': 'In progress',
  completed: 'Completed',
  done: 'Done',
  current: 'Current',
  next: 'Next',
  later: 'Later',
};

/** Runs fn and logs (never throws) so one broken feature cannot stop the page. */
function safe(label, fn) {
  try {
    return fn();
  } catch (error) {
    console.error(`[main] ${label} failed:`, error);
    return undefined;
  }
}

/** Text, wrapped in <span class="ph"> when flagged or still containing placeholder markers. */
function phText(text, flagged = false) {
  const value = String(text ?? '');
  if (flagged || isPlaceholder(value)) return el('span', { class: 'ph' }, value);
  return value;
}

function statusBadge(status) {
  return el(
    'span',
    { class: 'badge', dataset: { status } },
    STATUS_LABELS[status] || status
  );
}

function tagList(tags) {
  return el(
    'ul',
    { class: 'tag-list' },
    (tags || []).map((tag) => el('li', { class: 'tag' }, tag))
  );
}

/** True when a link leaves the site over http(s) and should open in a new tab. */
function opensNewTab(href) {
  try {
    const url = new URL(href, window.location.href);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.origin !== window.location.origin
    );
  } catch (error) {
    return false;
  }
}

function setLinkTarget(anchor, rawHref) {
  const href = safeHref(rawHref);
  anchor.setAttribute('href', href);
  if (opensNewTab(href)) {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
    return true;
  }
  return false;
}

function fill(selector, nodes) {
  const container = qs(selector);
  if (!container) {
    console.warn(`[main] ${selector} not found; section skipped.`);
    return null;
  }
  container.replaceChildren(...nodes);
  return container;
}

/* ==========================================================================
   Static text
   ========================================================================== */

function renderStaticText() {
  qsa('[data-ph="name"]').forEach((node) => {
    node.textContent = SITE.name;
    if (!isPlaceholder(SITE.name)) node.classList.remove('ph');
  });

  const year = qs('#footer-year');
  if (year) year.textContent = String(new Date().getFullYear());

  const role = qs('#hero-role');
  if (role && HERO_ROLES.length) role.textContent = HERO_ROLES[0];
}

/* ==========================================================================
   Section renderers
   ========================================================================== */

function renderAbout() {
  fill(
    '#about-facts',
    ABOUT_FACTS.map((fact) =>
      el('li', { class: 'fact' }, [
        icon(fact.icon, 'fact__icon'),
        el('div', { class: 'fact__body' }, [
          el('span', { class: 'fact__label' }, fact.label),
          el('span', { class: 'fact__value' }, phText(fact.value, fact.placeholder)),
        ]),
      ])
    )
  );
}

function renderEducation() {
  fill(
    '#education-list',
    EDUCATION.map((item) =>
      el('li', { class: 'timeline__item' }, [
        el('span', { class: 'timeline__marker', aria: { hidden: 'true' } }),
        el('div', { class: 'timeline__card glass' }, [
          el('div', { class: 'timeline__date' }, phText(item.date)),
          el('h3', { class: 'timeline__title' }, phText(item.title)),
          el('div', { class: 'timeline__org' }, phText(item.org)),
          el('p', { class: 'timeline__desc' }, phText(item.description)),
          statusBadge(item.status || 'placeholder'),
        ]),
      ])
    )
  );
}

function renderSkills() {
  const levelLabel = (level) => {
    const found = SKILL_LEVELS.find((entry) => entry.level === level);
    return found ? found.label : `Level ${level}`;
  };

  fill(
    '#skills-legend',
    SKILL_LEVELS.map((entry) =>
      el('li', { class: 'legend__item' }, [
        el('span', {
          class: 'legend__dot',
          dataset: { level: entry.level },
          aria: { hidden: 'true' },
        }),
        el('span', { class: 'legend__text' }, [
          el('strong', {}, entry.label),
          ` – ${entry.description}`,
        ]),
      ])
    )
  );

  fill(
    '#skills-grid',
    SKILL_GROUPS.map((group) =>
      el('article', { class: 'skill-card glass' }, [
        el('h3', { class: 'skill-card__title' }, group.title),
        el(
          'ul',
          { class: 'skill-list' },
          group.skills.map((skill) => {
            const level = clamp(Math.round(Number(skill.level) || 1), 1, SKILL_LEVELS.length);
            const label = levelLabel(level);
            return el('li', { class: 'skill' }, [
              el('div', { class: 'skill__head' }, [
                el('span', { class: 'skill__name' }, skill.name),
                el(
                  'span',
                  { class: 'skill__level' },
                  skill.placeholder ? phText(`${label} · placeholder`, true) : label
                ),
              ]),
              el(
                'div',
                {
                  class: 'skill__bar',
                  role: 'img',
                  'aria-label': `${skill.name}: level ${level} of ${SKILL_LEVELS.length}, ${label}${
                    skill.placeholder ? ' (placeholder value)' : ''
                  }`,
                },
                [
                  el('span', {
                    class: 'skill__fill',
                    dataset: { level },
                    style: { '--level': level },
                  }),
                ]
              ),
            ]);
          })
        ),
      ])
    )
  );
}

function renderResearch() {
  fill(
    '#research-grid',
    RESEARCH_INTERESTS.map((item) =>
      el('article', { class: 'research-card glass glass--lift' }, [
        icon(item.icon, 'research-card__icon'),
        el('h3', { class: 'research-card__title' }, phText(item.title, item.placeholder)),
        el('p', { class: 'research-card__text' }, phText(item.text, item.placeholder)),
        tagList(item.tags),
      ])
    )
  );
}

function renderProjects() {
  const filters = qs('#project-filters');
  const empty = qs('#project-empty');

  const cards = PROJECTS.map((project) => {
    const links = (project.links || []).map((link) => {
      const anchor = el('a', { class: 'btn btn--ghost' }, [
        el('span', {}, link.label),
        icon(link.icon || 'external'),
      ]);
      if (setLinkTarget(anchor, link.href)) {
        anchor.appendChild(el('span', { class: 'sr-only' }, ' (opens in a new tab)'));
      }
      return anchor;
    });

    const node = el(
      'article',
      { class: 'project-card glass glass--lift', dataset: { category: project.category } },
      [
        el('div', { class: 'project-card__media', aria: { hidden: 'true' } }, [
          icon(project.icon || 'chart'),
        ]),
        el('div', { class: 'project-card__body' }, [
          statusBadge(project.status || 'placeholder'),
          el('h3', { class: 'project-card__title' }, phText(project.title)),
          el('p', { class: 'project-card__desc' }, phText(project.description)),
          tagList(project.tags),
          links.length ? el('div', { class: 'project-card__links' }, links) : null,
        ]),
      ]
    );
    return { node, category: project.category };
  });

  fill('#project-grid', cards.map((card) => card.node));

  if (!filters) return;

  const chips = PROJECT_CATEGORIES.map((category) =>
    el(
      'button',
      {
        class: 'chip',
        type: 'button',
        dataset: { filter: category.id },
        aria: { pressed: category.id === 'all' ? 'true' : 'false' },
      },
      category.label
    )
  );
  filters.replaceChildren(...chips);

  function applyFilter(id, announceResult) {
    let visible = 0;
    cards.forEach((card) => {
      const show = id === 'all' || card.category === id;
      card.node.hidden = !show;
      if (show) visible += 1;
    });
    chips.forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.dataset.filter === id));
    });
    if (empty) empty.hidden = visible !== 0;
    if (announceResult) {
      announce(visible === 1 ? '1 project shown' : `${visible} projects shown`);
    }
  }

  filters.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip || !filters.contains(chip)) return;
    applyFilter(chip.dataset.filter, true);
  });

  applyFilter('all', false);
}

function renderDashboard() {
  fill(
    '#dashboard-summary',
    DASHBOARD_SUMMARY.map((stat) =>
      el('div', { class: 'stat' }, [
        el('div', { class: 'stat__value' }, stat.value),
        el('div', { class: 'stat__label' }, phText(stat.label, stat.placeholder)),
      ])
    )
  );

  const grid = fill(
    '#dashboard-grid',
    DASHBOARD_GAUGES.map((gauge) => {
      const value = clamp(Math.round(Number(gauge.value) || 0), 0, 100);
      return el('div', { class: 'gauge', dataset: { value } }, [
        el(
          'div',
          {
            class: 'gauge__dial',
            role: 'img',
            'aria-label': `${gauge.label}: ${value} percent${gauge.note ? ` (${gauge.note})` : ''}`,
            style: { '--value': 0 },
          },
          [
            el('div', { class: 'gauge__ring' }),
            el('div', { class: 'gauge__value' }, '0%'),
          ]
        ),
        el('div', { class: 'gauge__label' }, gauge.label),
        el('div', { class: 'gauge__note' }, gauge.note || ''),
      ]);
    })
  );

  if (grid) animateGauges(grid);
}

/** Counts each gauge from 0 to its value when the grid first scrolls into view. */
function animateGauges(grid) {
  const gauges = qsa('.gauge', grid).map((node) => ({
    dial: qs('.gauge__dial', node),
    text: qs('.gauge__value', node),
    target: Number(node.dataset.value) || 0,
  }));

  const setValue = (gauge, value) => {
    gauge.dial.style.setProperty('--value', String(value));
    gauge.text.textContent = `${Math.round(value)}%`;
  };

  function run() {
    if (prefersReducedMotion()) {
      gauges.forEach((gauge) => setValue(gauge, gauge.target));
      return;
    }
    const duration = 1100;
    const start = performance.now();

    function frame(now) {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      gauges.forEach((gauge) => setValue(gauge, gauge.target * eased));
      if (t < 1) window.requestAnimationFrame(frame);
      else gauges.forEach((gauge) => setValue(gauge, gauge.target));
    }
    window.requestAnimationFrame(frame);
  }

  if (typeof window.IntersectionObserver !== 'function') {
    run();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        run();
      }
    },
    { threshold: 0.3 }
  );
  observer.observe(grid);
}

function renderWorkflow() {
  fill(
    '#workflow-steps',
    WORKFLOW_STEPS.map((step, index) =>
      el('li', { class: 'workflow__step glass' }, [
        el('div', { class: 'workflow__num', aria: { hidden: 'true' } }, pad2(index + 1)),
        el('div', { class: 'workflow__body' }, [
          el('h3', { class: 'workflow__title' }, step.title),
          el('p', { class: 'workflow__text' }, step.text),
          tagList(step.tags),
        ]),
      ])
    )
  );
}

function renderRoadmap() {
  fill(
    '#roadmap-track',
    ROADMAP.map((item) =>
      el('li', { class: 'roadmap__item', dataset: { status: item.status } }, [
        el('span', { class: 'roadmap__marker', aria: { hidden: 'true' } }),
        el('div', { class: 'roadmap__card glass' }, [
          el('div', { class: 'roadmap__date' }, phText(item.date)),
          el('h3', { class: 'roadmap__title' }, item.title),
          el('p', { class: 'roadmap__text' }, phText(item.text)),
          statusBadge(item.status),
        ]),
      ])
    )
  );
}

function renderContact() {
  fill(
    '#contact-list',
    CONTACT_LINKS.map((link) => {
      const anchor = el('a', { class: 'contact-link glass glass--lift' }, [
        icon(link.icon, 'contact-link__icon'),
        el('div', { class: 'contact-link__body' }, [
          el('span', { class: 'contact-link__label' }, link.label),
          el('span', { class: 'contact-link__value' }, phText(link.value, link.placeholder)),
        ]),
      ]);
      const newTab = setLinkTarget(anchor, link.href);
      if (link.placeholder || isPlaceholder(link.href)) {
        anchor.setAttribute('title', 'Placeholder link: replace it in js/content.js');
      }
      if (newTab) {
        anchor.appendChild(el('span', { class: 'sr-only' }, ' (opens in a new tab)'));
      }
      return el('li', {}, [anchor]);
    })
  );
}

/* ==========================================================================
   Contact form (no server: opens the visitor's email app via mailto:)
   ========================================================================== */

function initContactForm() {
  const form = qs('#contact-form');
  const status = qs('#contact-status');
  if (!form) return;

  const fields = [
    {
      input: qs('#contact-name'),
      error: qs('#contact-name-error'),
      isValid: (input) => input.value.trim().length > 0,
    },
    {
      input: qs('#contact-email'),
      error: qs('#contact-email-error'),
      isValid: (input) => input.value.trim().length > 0 && input.checkValidity(),
    },
    {
      input: qs('#contact-message'),
      error: qs('#contact-message-error'),
      isValid: (input) => input.value.trim().length > 0,
    },
  ].filter((field) => field.input && field.error);

  function setStatus(message, kind) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-success', kind === 'success');
    status.classList.toggle('is-error', kind === 'error');
  }

  function showError(field, invalid) {
    field.input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    field.error.hidden = !invalid;
    if (invalid) field.input.setAttribute('aria-describedby', field.error.id);
    else field.input.removeAttribute('aria-describedby');
  }

  fields.forEach((field) => {
    field.input.addEventListener('input', () => {
      if (field.input.getAttribute('aria-invalid') === 'true' && field.isValid(field.input)) {
        showError(field, false);
      }
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    setStatus('', '');

    let firstInvalid = null;
    fields.forEach((field) => {
      const invalid = !field.isValid(field.input);
      showError(field, invalid);
      if (invalid && !firstInvalid) firstInvalid = field.input;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      setStatus('Please fix the highlighted fields.', 'error');
      return;
    }

    if (isPlaceholder(SITE.email)) {
      setStatus(
        'Setup needed: a real email address has not been added yet (see SITE.email in js/content.js).',
        'error'
      );
      return;
    }

    const name = qs('#contact-name').value.trim();
    const email = qs('#contact-email').value.trim();
    const message = qs('#contact-message').value.trim();

    const subject = `Portfolio message from ${name}`;
    const body = `${message}\n\n— ${name} (${email})`;
    const href =
      `mailto:${SITE.email}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    setStatus('Opening your email app…', 'success');
    window.location.href = href;
  });
}

/* ==========================================================================
   Hero role rotation
   ========================================================================== */

function startHeroRoles() {
  const node = qs('#hero-role');
  if (!node || HERO_ROLES.length < 2) return;

  let index = 0;
  node.style.transition = 'opacity 240ms ease';

  window.setInterval(() => {
    if (document.hidden || prefersReducedMotion()) return;
    node.style.opacity = '0';
    window.setTimeout(() => {
      index = (index + 1) % HERO_ROLES.length;
      node.textContent = HERO_ROLES[index];
      node.style.opacity = '1';
    }, 260);
  }, 3800);
}

/* ==========================================================================
   Boot
   ========================================================================== */

function revealEverything() {
  qsa('[data-reveal], [data-reveal-stagger]').forEach((node) => node.classList.add('is-visible'));
}

async function boot() {
  const html = document.documentElement;

  // 1. Preferences first: accent, motion, size and glass apply immediately.
  safe('initStudio', initStudio);

  // 2. Content.
  safe('renderStaticText', renderStaticText);
  safe('renderAbout', renderAbout);
  safe('renderEducation', renderEducation);
  safe('renderSkills', renderSkills);
  safe('renderResearch', renderResearch);
  safe('renderProjects', renderProjects);
  safe('renderDashboard', renderDashboard);
  safe('renderWorkflow', renderWorkflow);
  safe('renderRoadmap', renderRoadmap);
  safe('renderContact', renderContact);

  // 3. Character BEFORE nav, so it receives the first "sectionchange".
  const character = safe('initCharacter', initCharacter);

  // 4. Scroll-driven features and the form.
  safe('initProgress', initProgress);
  safe('initNav', initNav);
  safe('initContactForm', initContactForm);

  // 5. Preloader. If it fails, never leave the page locked or covered.
  try {
    await runPreloader();
  } catch (error) {
    console.error('[main] runPreloader failed:', error);
    const overlay = qs('#preloader');
    if (overlay) overlay.hidden = true;
    html.classList.remove('is-loading');
  }

  // 6. Reveal, tilt, character and hero rotation.
  const reveal = safe('initReveal', initReveal);
  if (!reveal) revealEverything();

  safe('initTilt', initTilt);
  if (character) safe('character.start', () => character.start());
  safe('startHeroRoles', startHeroRoles);
}

onReady(boot);