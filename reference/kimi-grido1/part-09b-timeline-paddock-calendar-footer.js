/* ==========================================================================
   PART 9B: timeline, paddock, calendar, footer, contour canvases
   ========================================================================== */
/* bindGate addition in the existing function:
   rootMargin = el.dataset.margin || rootMargin;
*/
const cq = (v) => ((v / 1440) * 100).toFixed(4) + "cqw";             /* same as px() */
const typePx = (v) => `max(${cq(v)}, var(--type-min, 0px))`;

/* ---------- plate geometry (plate-shape.ts) ---------- */
const PLATE_OUTLINE =
  "M13.6168 0.497469H697.378C700.858 0.497469 704.195 1.38786 706.655 2.97277C709.115 4.55769 710.498 6.70729 710.498 8.94869V411.208C710.498 413.449 709.115 415.599 706.655 417.183C704.195 418.768 700.858 419.659 697.378 419.659H460.249C454.073 419.659 447.976 420.555 442.411 422.281C436.847 424.008 431.958 426.519 428.107 429.63L399.246 452.95C395.559 455.928 390.878 458.333 385.55 459.986C380.223 461.639 374.385 462.497 368.472 462.497H13.6168C10.1373 462.497 6.80038 461.607 4.34003 460.022C1.87968 458.437 0.497469 456.288 0.497469 454.046V8.94869C0.497469 6.70729 1.87968 4.55769 4.34003 2.97277C6.80038 1.38786 10.1373 0.497469 13.6168 0.497469Z";
const PLATE_CLIP =
  "M 0.01915,0.00107H 0.98085C 0.98574,0.00107 0.99044,0.00300 0.99390,0.00642C 0.99736,0.00984 0.99930,0.01449 0.99930,0.01933V 0.88815C 0.99930,0.89299 0.99736,0.89763 0.99390,0.90105C 0.99044,0.90448 0.98574,0.90640 0.98085,0.90640H 0.64733C 0.63864,0.90640 0.63007,0.90834 0.62224,0.91206C 0.61442,0.91579 0.60754,0.92122 0.60212,0.92794L 0.56153,0.97830C 0.55635,0.98474 0.54976,0.98993 0.54227,0.99350C 0.53478,0.99707 0.52656,0.99892 0.51825,0.99892H 0.01915C 0.01426,0.99892 0.00956,0.99700 0.00610,0.99358C 0.00264,0.99016 0.00070,0.98551 0.00070,0.98067V 0.01933C 0.00070,0.01449 0.00264,0.00984 0.00610,0.00642C 0.00956,0.00300 0.01426,0.00107 0.01915,0.00107Z";

const ROW_H = { side: 217, centre: 462 };
const TOP_PAD = 169;
const MARK_RISE = 50;
const PARALLAX = { plate: { side: 60, centre: 20 }, copy: 110 };
const YEAR_RESTING = 0.4;
const YEAR_HOLD = 2200;
const GATE_ROW = "0% 0% -25% 0%";
const GATE_CAL = "0% 0% -20% 0%";

const TIMELINE = [
  { year: "2012", frame: "centre", lead: "The first kart.", rest: " At six, Kimi discovered karting — turning a childhood curiosity into something of his own.", cw: 228, alt: "Kimi in kart overalls in the paddock, aged six" },
  { year: "2015", frame: "side", align: "r", alt: "Kimi holding a karting trophy at sunset" },
  { year: "2019", frame: "centre", lead: "Finding his people.", rest: " Kimi joined the Mercedes Junior Programme, marking his first major step into professional motorsport.", cw: 272, alt: "Kimi signing with the Mercedes junior team" },
  { year: "2021", frame: "side", align: "l", alt: "Kimi beside a single-seater in the garage" },
  { year: "2024", frame: "centre", lead: "The year everything changed.", rest: " Formula 2 brought Kimi closer to F1, while Mercedes confirmed him as their future race driver.", cw: 278, alt: "Kimi walking the pit lane in Mercedes kit" },
  { year: "2025", frame: "side", align: "r", alt: "Kimi in the Mercedes garage" },
  { year: "2026", frame: "centre", lead: "From karts to f1.", rest: " Kimi is now racing at the highest level, with Bologna still his anchor — family, home and life beyond racing.", cw: 284, alt: "The Mercedes-AMG F1 car on track" },
];

/* tiny DOM helper */
const H = (tag, cls, attrs = {}, parent) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  for (const k in attrs) {
    if (k === "style") n.style.cssText = attrs[k];
    else if (k === "text") n.textContent = attrs[k];
    else n.setAttribute(k, attrs[k]);
  }
  if (parent) parent.appendChild(n);
  return n;
};

/* ==========================================================================
   TIMELINE
   ========================================================================== */
function initTimeline() {
  const rowsEl = document.getElementById("tl-rows");
  const rail = document.getElementById("tl-rail");
  if (!rowsEl || !rail) return;

  /* the plate clip (objectBoundingBox) must exist in the DOM */
  const defs = S("svg", { width: 0, height: 0, "aria-hidden": "true", style: "position:absolute" }, document.body);
  const cp = S("clipPath", { id: "tl-clip", clipPathUnits: "objectBoundingBox" }, defs);
  S("path", { d: PLATE_CLIP }, cp);

  TIMELINE.forEach((e, i) => {
    const centre = e.frame === "centre";
    const row = H("div", `tl-row tl-row--${e.frame}${e.align ? " tl-row--" + e.align : ""} tl-row--${i % 2 ? "odd" : "even"}`, {}, rowsEl);

    /* layer 1: the plate and its year (the year rides the plate's parallax) */
    const plateLayer = H("div", "tl-layer", {}, row);
    const plate = H("div", "tl-plate", {}, plateLayer);
    const fill = H("div", "tl-plate__fill", {}, plate);
    const slot = H("div", "tl-plate__slot", {}, fill);
    const img = H("img", "", { "data-asset": `timeline/${e.year}.webp`, width: 1420, height: 1016, alt: e.alt, loading: "lazy" }, slot);
    const outline = S("svg", { class: "tl-plate__outline", viewBox: "0 0 710.995 462.995", preserveAspectRatio: "none", "aria-hidden": "true" }, plate);
    S("path", { d: PLATE_OUTLINE }, outline);

    const year = H("div", "tl-year", {}, plateLayer);
    H("span", "", {
      "data-tx": "letters", "data-stagger": 26, "data-cfg": "year", "data-delay": 0,
      "data-when": "forward", "data-margin": GATE_ROW, text: e.year,
    }, year);

    /* layer 2 (centre rows): the copy, nearest layer, moves most */
    let copyLayer = null;
    if (centre && e.lead) {
      copyLayer = H("div", "tl-layer", {}, row);
      const p = H("p", "tl-copy", { style: `--cw:${cq(e.cw)}` }, copyLayer);
      const inner = H("span", "", {
        "data-rise": 220, "data-y": "0.75rem", "data-cfg": "tlcopy",
        "data-when": "once", "data-margin": GATE_ROW, style: "display:block",
      }, p);
      H("b", "", { text: e.lead }, inner);
      inner.appendChild(document.createTextNode(e.rest));
    }

    /* parallax: top moves +travel -> -travel across the row's whole crossing */
    const trav = (centre ? PARALLAX.plate.centre : PARALLAX.plate.side) / 1440 * 100;
    scrollTrigger(row, {
      start: "top bottom", end: "bottom top",
      from: `${trav.toFixed(4)}cqw`, to: `${(-trav).toFixed(4)}cqw`,
      onUpdate: (v) => { plateLayer.style.top = v; },
    });
    if (copyLayer) {
      const ct = PARALLAX.copy / 1440 * 100;
      scrollTrigger(row, {
        start: "top bottom", end: "bottom top",
        from: `${ct.toFixed(4)}cqw`, to: `${(-ct).toFixed(4)}cqw`,
        onUpdate: (v) => { copyLayer.style.top = v; },
      });
    }

    /* inside the plate: the photograph's own overscan travels -10% -> 0% */
    scrollTrigger(plate, {
      start: "top bottom", end: "top center", from: "-10%", to: "0%",
      onUpdate: (v) => { slot.style.top = v; },
    });

    /* centre rows: the year settles from 1 to 0.4 after a hold */
    if (centre) {
      const settle = new Spring({
        value: 1, ...CFG.settle,
        onUpdate: (v) => { year.style.opacity = String(v); },
      });
      inView(row, { rootMargin: GATE_ROW, once: true }, (v) => {
        if (v) window.setTimeout(() => settle.to(YEAR_RESTING), YEAR_HOLD);
      });
    }

    /* hovering one plate dims every other row (CSS gates it on hover:hover) */
    if (!REDUCED) {
      plate.addEventListener("pointerenter", (ev) => {
        if (ev.pointerType !== "mouse") return;
        rowsEl.classList.add("is-dim"); row.classList.add("is-hover");
      });
      plate.addEventListener("pointerleave", () => {
        rowsEl.classList.remove("is-dim"); row.classList.remove("is-hover");
      });
    }
  });

  /* ---------- the rail: thread + marker that turns five times ---------- */
  const mq = window.matchMedia("(max-width: 1023px)");
  let railTrig = null;

  function buildRail() {
    if (railTrig) railTrig.destroy();
    rail.replaceChildren();
    const narrow = mq.matches;
    const heights = TIMELINE.map((e) => ROW_H[e.frame]);
    const sum = heights.reduce((a, b) => a + b, 0);
    const lead = narrow ? 0 : TOP_PAD;                         /* where the rail begins */
    const viewH = lead + sum;
    const lastTop = lead + heights.slice(0, -1).reduce((a, b) => a + b, 0);
    const rest = lastTop + heights[heights.length - 1] / 2 - MARK_RISE;
    const size = narrow ? 20 : 9;

    const svg = S("svg", { viewBox: `0 0 16 ${viewH}`, preserveAspectRatio: "xMidYMin meet" }, rail);
    const ln = { stroke: "var(--timeline-rail)", "stroke-width": 1 };
    S("line", { ...ln, x1: 8, x2: 8, y1: 0, y2: 98 }, svg);
    S("line", { ...ln, x1: 8, x2: 8, y1: 102, y2: rest, "stroke-dasharray": "6 6" }, svg);
    const bar = S("rect", { x: 7.5, y: 0, width: 1, height: 0, fill: "var(--foreground-on-dark)" }, svg);
    const mark = S("rect", { x: -size / 2, y: -size / 2, width: size, height: size, fill: "#fff" }, svg);

    const update = (p) => {
      const run = p * rest;
      bar.setAttribute("height", String(run));
      mark.setAttribute("transform", `translate(8 ${run}) rotate(${(run / rest) * 1800})`);
    };
    update(0);

    /* the page ends with this block's stack, so "bottom bottom" lets the thread finish */
    railTrig = scrollTrigger(rail, { start: "top center", end: "bottom bottom", onSmooth: update });
  }
  buildRail();
  if (mq.addEventListener) mq.addEventListener("change", buildRail);
  else mq.addListener(buildRail);
}

/* ==========================================================================
   CONTOUR CANVASES (marching squares, the hero's field on a 2D canvas)
   ========================================================================== */
function initContours() {
  const LINE_SCALE = 3.8, LINE_COUNT = 2.5, WAVE_AMOUNT = 0.37, WAVE_SPEED = 1.66, LINE_OPACITY = 0.85;
  const CELLS = 96;
  const field = (x, y, t) => {
    let f = Math.sin(x * 1.0 + t * 0.6) * 0.5;
    f += Math.sin(y * 0.85 - t * 0.45) * 0.45;
    f += Math.sin((x + y) * 0.65 + t * 0.35) * 0.35;
    f += Math.sin((x - y) * 0.95 - t * 0.55) * 0.25;
    return f * 0.5 + 0.5;
  };

  document.querySelectorAll("canvas[data-contour]").forEach((canvas) => {
    const token = canvas.dataset.contour === "footer" ? "--footer-contour" : "--paddock-contour";
    const colour = readToken(token);
    const ctx = canvas.getContext("2d");
    const start = performance.now();

    loopInView(canvas, (now) => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (!width || !height) return;
      const bw = Math.round(width * ratio), bh = Math.round(height * ratio);
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const t = ((now - start) / 1000) * WAVE_SPEED;
      const cols = width >= height ? CELLS : Math.max(8, Math.round((CELLS * width) / height));
      const rows = Math.max(8, Math.round((cols * height) / width));
      const stepX = width / cols, stepY = height / rows, aspect = width / height;
      const values = new Float32Array((cols + 1) * (rows + 1));
      for (let j = 0; j <= rows; j += 1) for (let i = 0; i <= cols; i += 1) {
        const nx = ((i / cols) * 2 - 1) * aspect * LINE_SCALE;
        const ny = ((j / rows) * 2 - 1) * LINE_SCALE;
        const qx = nx + Math.sin(ny * 0.8 + t * 0.7) * WAVE_AMOUNT;
        const qy = ny + Math.cos(nx * 0.7 - t * 0.6) * WAVE_AMOUNT;
        values[j * (cols + 1) + i] = field(qx, qy, t) * LINE_COUNT;
      }

      ctx.strokeStyle = colour; ctx.lineWidth = 1; ctx.globalAlpha = LINE_OPACITY; ctx.beginPath();
      for (let level = 0.5; level < LINE_COUNT; level += 1)
        for (let j = 0; j < rows; j += 1) for (let i = 0; i < cols; i += 1) {
          const a = values[j * (cols + 1) + i], b = values[j * (cols + 1) + i + 1];
          const c = values[(j + 1) * (cols + 1) + i + 1], d = values[(j + 1) * (cols + 1) + i];
          const index = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
          if (index === 0 || index === 15) continue;
          const x0 = i * stepX, y0 = j * stepY;
          const top = [x0 + stepX * ((level - a) / (b - a)), y0];
          const right = [x0 + stepX, y0 + stepY * ((level - b) / (c - b))];
          const bottom = [x0 + stepX * ((level - d) / (c - d)), y0 + stepY];
          const left = [x0, y0 + stepY * ((level - a) / (d - a))];
          const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
          switch (index) {
            case 1: case 14: seg(left, bottom); break;
            case 2: case 13: seg(bottom, right); break;
            case 3: case 12: seg(left, right); break;
            case 4: case 11: seg(top, right); break;
            case 6: case 9: seg(top, bottom); break;
            case 7: case 8: seg(left, top); break;
            case 5: seg(left, top); seg(bottom, right); break;
            case 10: seg(left, bottom); seg(top, right); break;
          }
        }
      ctx.stroke(); ctx.globalAlpha = 1;
    }, () => 24);
  });
}

/* ==========================================================================
   PADDOCK
   ========================================================================== */
const CAL_ROUNDS = [
  { r: "round 18", n: "united states gp", d: "25 oct", x: 347, w: 128, mark: "p1" },
  { r: "round 19", n: "mexico city gp", d: "01 nov", x: 511, w: 120, mark: "p3" },
  { r: "round 20", n: "sao paulo gp", d: "08 nov", x: 675, w: 112, mark: "p5" },
  { r: "round 21", n: "las vegas gp", d: "21 nov", x: 839, w: 110, mark: "p4" },
  { r: "round 22", n: "qatar gp", d: "29 nov", x: 1017, w: 100, mark: "live" },
];
const CAL_LINKS = [
  { x: 416, w: 126, dir: 1 }, { x: 580, w: 128, dir: 1 },
  { x: 743, w: 136, dir: -1 }, { x: 914, w: 124, dir: -1 },
];
const CARD_DELAY = 560, CARD_STAGGER = 90, PULSE_MS = 3200, PULSE_REACH = 3.4, CRAWL_MS = 5200, BRACKET_SPREAD = 5;
const calX = (x) => `calc(50% + ${cq(x - 720)} * var(--cal-spread, 1))`;

/* four corner strokes, one path drawn four ways: tl 270 · tr 0 · br 90 · bl 180 */
function cornerSvg(parent, rot, pos) {
  const s = S("svg", { viewBox: "0 0 10.5 10.5", "aria-hidden": "true" }, parent);
  S("path", { d: "M0 0.5H10V10.5" }, s);
  s.style.transform = `rotate(${rot}deg)`;
  Object.assign(s.style, pos);
  return s;
}

function initPaddock() {
  const section = document.getElementById("paddock");
  if (!section) return;

  /* portrait parallax: up only, 0 -> -48 design px */
  const fig = document.getElementById("pad-fig");
  if (fig) {
    scrollTrigger(section, {
      start: "top bottom", end: "bottom top", from: "0cqw", to: `${cq(-48)}`,
      onUpdate: (v) => { fig.style.top = v; },
    });
  }

  /* the two bracket frames (black strokes), fading in at 320 / 460 */
  [["meet", 320], ["stats", 460]].forEach(([name, delay]) => {
    const f = section.querySelector(`.pad__frame[data-frame="${name}"]`);
    if (!f) return;
    f.dataset.rise = delay; f.dataset.y = "0px"; f.dataset.cfg = "reveal"; f.dataset.when = "forward";
    cornerSvg(f, 270, { left: 0, top: 0 });
    cornerSvg(f, 0, { right: 0, top: 0 });
    cornerSvg(f, 90, { right: 0, bottom: 0 });
    cornerSvg(f, 180, { left: 0, bottom: 0 });
  });

  /* stats rows: rule draws in from the left, row rises 40ms after it */
  const statsEl = document.getElementById("pad-stats");
  const rowsLi = Array.from(section.querySelectorAll(".pad__row"));
  rowsLi.forEach((li, i) => {
    li.dataset.rise = 460 + i * 90 + 40; li.dataset.y = "0.75rem"; li.dataset.cfg = "reveal"; li.dataset.when = "forward";
    if (i === 0) return;
    li.style.setProperty("--rule", "0");
    const rule = new Spring({
      value: 0, ...CFG.reveal,
      onUpdate: (v) => li.style.setProperty("--rule", String(clamp01(v))),
    });
    if (statsEl) watchForward(statsEl, (on) => rule.to(on ? 1 : 0, on ? 460 + i * 90 : 0));
  });

  buildCalendar();
}

function buildCalendar() {
  const cal = document.getElementById("cal");
  if (!cal) return;
  const GATE = { "data-when": "forward", "data-margin": GATE_CAL };
  const gate = (el, delay, y, cfg = "reveal") => {
    el.dataset.rise = delay; el.dataset.y = y; el.dataset.cfg = cfg;
    el.dataset.when = "forward"; el.dataset.margin = GATE_CAL;
  };

  /* dashed connectors; the two left of the live round crawl right, the two right crawl left */
  const linkEls = CAL_LINKS.map((l, i) => {
    const a = H("i", "cal__link", {
      style: `left:${calX(l.x)};width:calc(${cq(l.w)} * var(--cal-spread, 1));top:calc(${cq(131.5)} + var(--cal-mark-drop, 0px));--dash:${cq(7)};--period:${cq(11.45)}`,
    }, cal);
    a.dataset.scale = "x";
    gate(a, CARD_DELAY + i * CARD_STAGGER, "0px");
    return { el: a, dir: l.dir };
  });
  loopClock(cal, CRAWL_MS, EASE.linear, (p) => {
    linkEls.forEach(({ el, dir }) => { el.style.backgroundPositionX = `calc(${dir * p} * ${cq(11.45)})`; });
  });

  let pulseCircle = null;

  CAL_ROUNDS.forEach((r, i) => {
    const live = r.mark === "live";
    const base = CARD_DELAY + i * CARD_STAGGER;

    const card = H("div", `cal__card${live ? " cal__card--live" : ""}`, {
      style: `left:calc(50% + ${cq(r.x + r.w / 2 - 720)} * var(--cal-spread, 1) - ${cq(r.w / 2)});top:calc(${cq(43)} + var(--cal-card-drop, 0px));width:var(--cal-card-w, ${cq(r.w)});gap:${typePx(12)}`,
    }, cal);
    if (i < 2) card.setAttribute("data-hide-phone", "");
    gate(card, base, "0.5rem");
    H("span", "", { style: `font-size:${typePx(12)};letter-spacing:${cq(-0.24)}`, text: r.r }, card);
    const name = H("span", "cal__name", { text: r.n }, card);
    name.style.display = "block";
    gate(name, base + 110, "0.3em", "name");
    H("span", "", { style: `font-size:${typePx(14)};letter-spacing:${cq(-0.28)}`, text: r.d }, card);

    /* marker on the connector run, centred on the card, fading in at +60 */
    const mark = H("div", "cal__mark", {
      style: `left:calc(50% + ${cq(r.x + r.w / 2 - 720)} * var(--cal-spread, 1));top:calc(${cq(126)} + var(--cal-mark-drop, 0px));font-size:${typePx(12)}`,
    }, cal);
    const inner = H("span", "", { style: "display:grid;place-items:center" }, mark);
    gate(inner, base + 60, "0px");
    if (/^p\d+$/.test(r.mark)) {
      inner.textContent = r.mark;
    } else {
      const svg = S("svg", { viewBox: "0 0 11 11", "aria-hidden": "true" }, inner);
      if (live) {
        pulseCircle = S("circle", { class: "cal__pulse", cx: 5.5, cy: 5.5, r: 5.5 }, svg);
        S("circle", { cx: 5.5, cy: 5.5, r: 5.5, fill: "var(--accent)" }, svg);
      } else {
        S("circle", { cx: 5.5, cy: 5.5, r: 5, fill: "none", stroke: "#fff", "stroke-width": 1 }, svg);
      }
    }

    if (live) {
      card.addEventListener("pointerenter", () => cal.style.setProperty("--bracket-spread", cq(BRACKET_SPREAD)));
      card.addEventListener("pointerleave", () => cal.style.removeProperty("--bracket-spread"));
    }
  });

  /* the live pulse: ring r = 5.5 + v * 5.5 * 3.4, opacity 0.5 (1-v)^2, every 3200ms */
  if (pulseCircle) {
    loopClock(cal, PULSE_MS, EASE.outQuad, (v) => {
      pulseCircle.setAttribute("r", String(5.5 + v * 5.5 * PULSE_REACH));
      pulseCircle.style.opacity = String(0.5 * (1 - v) * (1 - v));
    });
  }

  /* the live bracket: accent corners from x 669 to 781, y 32 to 113 */
  const br = H("div", "cal__bracket", {
    style: `left:${calX(669)};width:calc(${cq(112)} * var(--cal-spread, 1));top:calc(${cq(32)} + var(--bracket-drop, 0px));height:calc(${cq(81)} + var(--bracket-stretch, 0px))`,
  }, cal);
  gate(br, CARD_DELAY + 5 * CARD_STAGGER, "0px");
  cornerSvg(br, 270, { left: "calc(-1 * var(--bs))", top: "calc(-1 * var(--bs))" });
  cornerSvg(br, 0, { right: "calc(-1 * var(--bs))", top: "calc(-1 * var(--bs))" });
  cornerSvg(br, 90, { right: "calc(-1 * var(--bs))", bottom: "calc(-1 * var(--bs))" });
  cornerSvg(br, 180, { left: "calc(-1 * var(--bs))", bottom: "calc(-1 * var(--bs))" });
}

/* ==========================================================================
   FOOTER: the figure rides back into place as the page bottoms out
   ========================================================================== */
function initFooter() {
  const footer = document.getElementById("footer");
  const layer = footer && footer.querySelector(".foot__fig-layer");
  if (!layer) return;
  /* window closes at "bottom bottom": the resting frame is exact */
  scrollTrigger(footer, {
    start: "top bottom", end: "bottom bottom",
    from: cq(60), to: "0cqw",
    onUpdate: (v) => { layer.style.top = v; },
  });
}

/* ===== PART 9B ENDS HERE. Part 10 (hero wrapper, boot, closing tags) goes next. ===== */
