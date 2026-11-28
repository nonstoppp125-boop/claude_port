/* ==========================================================================
   SEASON, PART C: map dots
   Rebuilt runtime fallback: the original packed dot payload was not present
   in the saved branch. Recreate a deterministic lattice from TRACK_RIBBON
   so the season renderer remains functional without fabricated packed data.
   ========================================================================== */
const DOT_LATTICE = {
  originX: 0,
  originY: 0,
  pitchX: 3.5,
  pitchY: 3.5,
};
const DOT_RADIUS = 1.05;

const DOTS = (() => {
  const empty = () => ({
    columns: new Int32Array(0),
    rows: new Int32Array(0),
    points: new Float32Array(0),
    count: 0,
  });

  if (typeof Path2D === "undefined") return empty();
  const probe = document.createElement("canvas");
  const ctx = probe.getContext("2d");
  if (!ctx) return empty();

  const values = (TRACK_RIBBON.match(/-?(?:\d+\.?\d*|\.\d+)/g) || []).map(Number);
  if (values.length < 6 || values.length % 2 !== 0) return empty();

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (let k = 0; k < values.length; k += 2) {
    const x = values[k], y = values[k + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  let shape;
  try { shape = new Path2D(TRACK_RIBBON); }
  catch (error) { console.warn("[season] track path could not build dot mask:", error); return empty(); }

  const i0 = Math.floor(minX / DOT_LATTICE.pitchX);
  const i1 = Math.ceil(maxX / DOT_LATTICE.pitchX);
  const j0 = Math.floor(minY / DOT_LATTICE.pitchY);
  const j1 = Math.ceil(maxY / DOT_LATTICE.pitchY);
  const columns = [], rows = [], points = [];

  for (let j = j0; j <= j1; j += 1) {
    const y = DOT_LATTICE.originY + j * DOT_LATTICE.pitchY;
    for (let i = i0; i <= i1; i += 1) {
      const x = DOT_LATTICE.originX + i * DOT_LATTICE.pitchX;
      if (!ctx.isPointInPath(shape, x, y)) continue;
      columns.push(i);
      rows.push(j);
      points.push(x, y);
    }
  }

  return {
    columns: Int32Array.from(columns),
    rows: Int32Array.from(rows),
    points: Float32Array.from(points),
    count: columns.length,
  };
})();

/* ===== PART 8C ENDS HERE. Part 8D continues inside the same script. ===== */
