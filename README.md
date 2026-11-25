# claude_port

A premium dark-navy and cyan portfolio for an aspiring Data Analyst, built with plain HTML5, CSS3 and vanilla JavaScript (ES Modules). No build step, no frameworks, no external libraries. It runs on GitHub Pages as-is.

> **Status:** template. Every personal detail is a clearly marked placeholder (yellow dashed `.ph` style, or text in `[SQUARE BRACKETS]`). Nothing here is a real qualification, project or contact detail until you replace it.

## Features

- Cinematic preloader with real load-state progress
- Hero, About, Education, Skills (honest 4-level scale), Research, Projects (filterable), Learning dashboard, AI and analytics workflow, Roadmap, Contact
- Persistent animated olive-glass SVG character with speech bubbles, pupil tracking and sleep mode
- Custom scroll progress orb (click to return to top)
- Interactive Design Studio: accent colour, glass intensity, text size, motion, density, character, 3D tilt, film grain
- Preferences saved in the browser (`localStorage`, key `claude_port:prefs`)
- Responsive navigation, smooth scroll, reveal animations
- Accessibility: skip link, focus management and focus trap, live region, reduced-motion support (system or manual), forced-colours and reduced-transparency fallbacks
- SEO metadata, Open Graph and JSON-LD

## File structure

```text
claude_port/
├── index.html
├── 404.html
├── .nojekyll
├── README.md
├── css/
│   ├── tokens.css      design tokens and preference switches
│   ├── base.css        reset, typography, buttons, utilities
│   ├── glass.css       glassmorphism material and 3D tilt
│   ├── layout.css      background, header, nav, hero, footer
│   ├── sections.css    content components
│   ├── studio.css      Design Studio panel
│   └── motion.css      reveal, preloader, orb, character
├── js/
│   ├── main.js         entry point and renderers
│   ├── content.js      ALL editable text and data
│   ├── utils.js        shared helpers
│   ├── preloader.js
│   ├── nav.js
│   ├── reveal.js
│   ├── progress.js
│   ├── character.js
│   └── studio.js       preferences, dialog and tilt
└── assets/
    ├── favicon.svg
    └── svg/
        ├── noise.svg
        ├── grid.svg
        └── icons.svg
```

## Run locally

ES Modules and the external SVG icon sprite need HTTP, so do not open `index.html` by double-clicking it. Use a local server from the project folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Make it yours

1. Open `js/content.js` and replace every placeholder (names, education, skill levels, projects, dashboard values, roadmap, contact links). Delete `placeholder: true` on items once they are real.
2. Set your real email in `SITE.email`. Until then the contact form shows a "Setup needed" message.
3. In `index.html`, replace `[YOUR NAME]` and `[YOUR-GITHUB-USERNAME]` (title, meta tags, canonical URL, JSON-LD) and fill the placeholder text in the hero and About sections.
4. Optionally add an `og:image` (a 1200x630 image) and reference it in the meta tags.

## Deploy to GitHub Pages

1. Create a repository (this guide assumes it is named `claude_port`) and push all files to the `main` branch.
2. In the repository go to **Settings > Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
3. Your site will be at `https://YOUR-USERNAME.github.io/claude_port/`.

### If your repository has a different name

All pages except `404.html` use relative paths and work under any name. `404.html` uses absolute paths that start with `/claude_port/`. Change them (and the `BASE` constant in its script) to your repository name, or to `/` if you publish a user site at the domain root.

## Design Studio preferences

| Preference | Values | Effect |
| --- | --- | --- |
| Accent | cyan, azure, mint, violet, amber | `data-accent` on `<html>` |
| Glass intensity | 0 to 100 | `--glass-level` |
| Text size | 90 to 125 % | `--font-scale` |
| Motion | system, full, reduced | `data-motion` |
| Density | comfortable, compact | `data-density` |
| Character, 3D tilt, film grain | on or off | `data-character`, `data-tilt`, `data-grain` |

Use **Reset to defaults** in the studio, or delete `claude_port:prefs` from your browser storage.

## Accessibility notes

- Reduced motion follows the operating system unless the studio overrides it.
- Placeholder skill levels are labelled as placeholders in text, not only by colour.
- The Design Studio is a modal dialog: Escape closes it, Tab stays inside it, and focus returns to the control that opened it.

## Known limits and testing status

- **Not browser-tested by the author of this code.** Please test in current Chrome, Firefox, Safari and a phone before publishing.
- Icon sprites do not load over `file://` in some browsers. Use a server.
- `grid.svg` and `favicon.svg` use fixed colours, so they do not follow the studio accent.
- The contact form has no backend. It opens the visitor's email app through `mailto:`.

## Licence

Choose a licence for your own repository (for example MIT) and add a `LICENSE` file.
