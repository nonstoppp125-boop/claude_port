/**
 * js/content.js
 * The single place to edit portfolio text and data. It has no imports and no
 * side effects, and every export is plain data (except the small helper
 * isPlaceholder at the bottom).
 *
 * HONESTY RULE: nothing here is a real qualification, project, date or
 * contact detail. Every personal item is a marked placeholder:
 *   - text wrapped in [SQUARE BRACKETS], or
 *   - an object with placeholder: true.
 * main.js renders such items with the .ph / data-status="placeholder" styling.
 * Replace them with real information, then remove `placeholder: true`.
 *
 * Icon names are passed to icon() in utils.js and must exist in
 * assets/svg/icons.svg as "icon-<name>":
 *   database, chart, brain, compass, spark, check, github, linkedin,
 *   external, mail
 *
 * Status values used by the CSS:
 *   education / projects: "placeholder" | "in-progress" | "completed"
 *   roadmap:              "done" | "current" | "next" | "later"
 */

/* ==========================================================================
   Site and hero
   ========================================================================== */

export const SITE = {
  name: '[YOUR NAME]',
  title: 'Aspiring Data Analyst',
  // Used by the contact form (mailto:). Replace with your real address.
  email: '[YOUR-EMAIL]',
};

/** Rotating phrase shown in #hero-role. Edit to match what you are really studying. */
export const HERO_ROLES = [
  'SQL, Python and data storytelling',
  'statistics and spreadsheets',
  'data cleaning and visualisation',
  'asking better questions of data',
];

/** Messages shown under the preloader bar, in order, as progress advances. */
export const PRELOADER_MESSAGES = [
  'Initialising',
  'Loading styles',
  'Preparing sections',
  'Calibrating charts',
  'Ready',
];

/* ==========================================================================
   About
   ========================================================================== */

export const ABOUT_FACTS = [
  { icon: 'compass', label: 'Goal', value: '[PLACEHOLDER: your career goal]', placeholder: true },
  { icon: 'chart', label: 'Currently learning', value: '[PLACEHOLDER: current focus]', placeholder: true },
  { icon: 'spark', label: 'Curious about', value: '[PLACEHOLDER: a topic you enjoy]', placeholder: true },
  { icon: 'check', label: 'Strength', value: '[PLACEHOLDER: one honest strength]', placeholder: true },
];

/* ==========================================================================
   Education
   ========================================================================== */

export const EDUCATION = [
  {
    date: '[PLACEHOLDER: start – end]',
    title: '[PLACEHOLDER: degree / programme]',
    org: '[PLACEHOLDER: institution]',
    description: '[PLACEHOLDER: one or two lines about what you studied. Only add verified information.]',
    status: 'placeholder',
  },
  {
    date: '[PLACEHOLDER: dates]',
    title: '[PLACEHOLDER: course / certificate]',
    org: '[PLACEHOLDER: platform or provider]',
    description: '[PLACEHOLDER: what the course covered and what you built or learned.]',
    status: 'placeholder',
  },
];

/* ==========================================================================
   Skills
   Level numbers are used as data-level and --level by main.js.
   ========================================================================== */

export const SKILL_LEVELS = [
  { level: 1, label: 'Exploring', description: 'Just started. I know the basics exist.' },
  { level: 2, label: 'Learning', description: 'Following tutorials and still needing guidance.' },
  { level: 3, label: 'Practising', description: 'Using it in small projects, with some lookups.' },
  { level: 4, label: 'Comfortable', description: 'Can use it independently on typical tasks.' },
];

/**
 * Skill names are common data-analyst topics. Every level is set to 1 as a
 * neutral starting point and flagged placeholder: change each one to your
 * real level (1 to 4) and delete `placeholder: true` when you have.
 */
export const SKILL_GROUPS = [
  {
    title: 'Querying and data',
    skills: [
      { name: 'SQL', level: 1, placeholder: true },
      { name: 'Spreadsheets', level: 1, placeholder: true },
      { name: 'Data cleaning', level: 1, placeholder: true },
    ],
  },
  {
    title: 'Programming',
    skills: [
      { name: 'Python', level: 1, placeholder: true },
      { name: 'pandas', level: 1, placeholder: true },
      { name: 'Git and GitHub', level: 1, placeholder: true },
    ],
  },
  {
    title: 'Analysis and communication',
    skills: [
      { name: 'Statistics', level: 1, placeholder: true },
      { name: 'Data visualisation', level: 1, placeholder: true },
      { name: 'Data storytelling', level: 1, placeholder: true },
    ],
  },
];

/* ==========================================================================
   Research interests
   Topics are generic suggestions. Keep, rewrite or replace them.
   ========================================================================== */

export const RESEARCH_INTERESTS = [
  {
    icon: 'chart',
    title: '[PLACEHOLDER: interest 1]',
    text: '[PLACEHOLDER: the question you want to explore and why it matters to you.]',
    tags: ['[tag]', '[tag]'],
    placeholder: true,
  },
  {
    icon: 'brain',
    title: '[PLACEHOLDER: interest 2]',
    text: '[PLACEHOLDER: describe the area, for example data quality, bias or forecasting.]',
    tags: ['[tag]', '[tag]'],
    placeholder: true,
  },
  {
    icon: 'database',
    title: '[PLACEHOLDER: interest 3]',
    text: '[PLACEHOLDER: describe what you would like to investigate with real datasets.]',
    tags: ['[tag]', '[tag]'],
    placeholder: true,
  },
];

/* ==========================================================================
   Projects
   `category` drives the filter chips. Links are empty until a project is real.
   A link is { label, href, icon }.
   ========================================================================== */

export const PROJECT_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'sql', label: 'SQL' },
  { id: 'python', label: 'Python' },
  { id: 'visualisation', label: 'Visualisation' },
];

export const PROJECTS = [
  {
    id: 'project-1',
    title: '[PLACEHOLDER: Project title 1]',
    description: '[PLACEHOLDER: the question, the dataset and what you found. Add only real work.]',
    category: 'sql',
    status: 'placeholder',
    icon: 'database',
    tags: ['[tool]', '[tool]'],
    links: [],
  },
  {
    id: 'project-2',
    title: '[PLACEHOLDER: Project title 2]',
    description: '[PLACEHOLDER: describe the analysis, the method and the result in two sentences.]',
    category: 'python',
    status: 'placeholder',
    icon: 'chart',
    tags: ['[tool]', '[tool]'],
    links: [],
  },
  {
    id: 'project-3',
    title: '[PLACEHOLDER: Project title 3]',
    description: '[PLACEHOLDER: describe the dashboard or chart and what decision it supports.]',
    category: 'visualisation',
    status: 'placeholder',
    icon: 'spark',
    tags: ['[tool]', '[tool]'],
    links: [],
  },
];

/* ==========================================================================
   Learning progress dashboard
   Values are 0 to 100 and self-assessed. All start at 0 as placeholders.
   ========================================================================== */

export const DASHBOARD_SUMMARY = [
  { value: '0', label: 'Courses completed', placeholder: true },
  { value: '0', label: 'Projects finished', placeholder: true },
  { value: '0', label: 'Hours this month', placeholder: true },
];

export const DASHBOARD_GAUGES = [
  { label: 'SQL', value: 0, note: 'Placeholder' },
  { label: 'Python', value: 0, note: 'Placeholder' },
  { label: 'Statistics', value: 0, note: 'Placeholder' },
  { label: 'Visualisation', value: 0, note: 'Placeholder' },
];

/* ==========================================================================
   AI and analytics workflow
   A generic, responsible process. Edit it to describe how you really work.
   ========================================================================== */

export const WORKFLOW_STEPS = [
  {
    title: 'Frame the question',
    text: 'Write the business or research question first, in my own words, before any tool is opened.',
    tags: ['Question', 'Scope'],
  },
  {
    title: 'Explore and clean the data',
    text: 'Inspect columns, types, missing values and outliers. AI can suggest checks, and I run and read them.',
    tags: ['SQL', 'Python'],
  },
  {
    title: 'Analyse and verify',
    text: 'Use AI to explain methods or draft code, then verify every result against the data and a second source.',
    tags: ['Statistics', 'Verification'],
  },
  {
    title: 'Visualise and explain',
    text: 'Choose a chart that fits the question, then explain what it shows, and what it does not show.',
    tags: ['Charts', 'Storytelling'],
  },
  {
    title: 'Document and reflect',
    text: 'Record assumptions, limits and what I learned so that the work can be checked and repeated.',
    tags: ['Notes', 'Git'],
  },
];

/* ==========================================================================
   Learning roadmap
   Dates are placeholders. Statuses: done | current | next | later.
   ========================================================================== */

export const ROADMAP = [
  {
    date: '[PLACEHOLDER: date]',
    title: 'Build core foundations',
    text: '[PLACEHOLDER: e.g. spreadsheets, SQL basics, descriptive statistics.]',
    status: 'current',
  },
  {
    date: '[PLACEHOLDER: date]',
    title: 'Complete a first end-to-end project',
    text: '[PLACEHOLDER: from question to cleaned data to a finished chart and write-up.]',
    status: 'next',
  },
  {
    date: '[PLACEHOLDER: date]',
    title: 'Deepen Python and visualisation',
    text: '[PLACEHOLDER: pandas, plotting libraries and a dashboard tool.]',
    status: 'later',
  },
  {
    date: '[PLACEHOLDER: date]',
    title: 'Apply for junior or internship roles',
    text: '[PLACEHOLDER: portfolio review, practice interviews and applications.]',
    status: 'later',
  },
];

/* ==========================================================================
   Contact
   href values below are obvious placeholders. main.js passes every href
   through safeHref() and flags the ones that contain a placeholder marker.
   ========================================================================== */

export const CONTACT_LINKS = [
  {
    icon: 'mail',
    label: 'Email',
    value: '[YOUR-EMAIL]',
    href: 'mailto:YOUR-EMAIL@example.com',
    placeholder: true,
  },
  {
    icon: 'github',
    label: 'GitHub',
    value: '[YOUR-GITHUB-USERNAME]',
    href: 'https://github.com/YOUR-GITHUB-USERNAME',
    placeholder: true,
  },
  {
    icon: 'linkedin',
    label: 'LinkedIn',
    value: '[YOUR-LINKEDIN-URL]',
    href: 'https://www.linkedin.com/in/YOUR-LINKEDIN-ID',
    placeholder: true,
  },
];

/* ==========================================================================
   Character speech bubble
   Keys are section ids from index.html. character.js shows the line when a
   section becomes active. Keep each line short.
   ========================================================================== */

export const CHARACTER_LINES = {
  hero: 'Hi! Welcome to the portfolio.',
  about: 'A little about the person behind the data.',
  education: 'Learning never stops.',
  skills: 'Honest levels. No inflated bars.',
  research: 'Good questions come first.',
  projects: 'Real projects will live here.',
  dashboard: 'Progress, one step at a time.',
  workflow: 'AI helps. I verify.',
  roadmap: 'The road ahead.',
  contact: 'Say hello!',
};

/* ==========================================================================
   Helper
   ========================================================================== */

/**
 * True when a string still contains placeholder markers, so main.js can
 * style it as .ph or mark a link as unfinished.
 */
export function isPlaceholder(text) {
  return typeof text === 'string' && /\[[^\]]+\]|YOUR-|example\.com/i.test(text);
}
