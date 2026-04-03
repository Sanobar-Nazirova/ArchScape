/**
 * Generate logo-512.png and logo-192.png from scratch (no external deps).
 * Renders the golden orb logo pixel-by-pixel then writes raw PNG via zlib.
 */
const zlib = require('zlib');
const fs   = require('fs');

/* ── helpers ─────────────────────────────────────────────────────────────── */
const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Evaluate a radial gradient: stops = [[t,r,g,b], ...] */
function radGrad(dist, stops) {
  const t = clamp(dist, 0, 1);
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, r0, g0, b0] = stops[i];
    const [t1, r1, g1, b1] = stops[i + 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return [lerp(r0,r1,f), lerp(g0,g1,f), lerp(b0,b1,f)];
    }
  }
  return stops[stops.length - 1].slice(1);
}

/** Alpha-composite src (r,g,b,a 0-255) over dst buffer at index i */
function composite(dst, i, r, g, b, a) {
  const sa = a / 255, da = dst[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa < 1e-6) return;
  dst[i]     = Math.round((r * sa + dst[i]     * da * (1 - sa)) / oa);
  dst[i + 1] = Math.round((g * sa + dst[i + 1] * da * (1 - sa)) / oa);
  dst[i + 2] = Math.round((b * sa + dst[i + 2] * da * (1 - sa)) / oa);
  dst[i + 3] = Math.round(oa * 255);
}

/** Smooth coverage for a circle edge (anti-alias width 1 px) */
function circleCoverage(px, py, cx, cy, r) {
  const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  return clamp(r + 0.5 - d, 0, 1);
}

/** Smooth coverage for an axis-aligned ellipse */
function ellipseCoverage(px, py, cx, cy, rx, ry) {
  const d = Math.sqrt(((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2);
  return clamp(1.5 - d * 1.5, 0, 1);  // approximate AA
}

/** Un-rotate a point so we can test a rotated ellipse as axis-aligned */
function unrotate(px, py, cx, cy, angleDeg) {
  const a   = (-angleDeg * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  const dx = px - cx, dy = py - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

function rotatedEllipseCoverage(px, py, cx, cy, rx, ry, angleDeg) {
  const [ux, uy] = unrotate(px, py, cx, cy, angleDeg);
  return ellipseCoverage(ux, uy, cx, cy, rx, ry);
}

/* ── render one frame at `size` ──────────────────────────────────────────── */
function render(size) {
  const s   = size / 512;          // scale factor
  const buf = Buffer.alloc(size * size * 4, 0);

  /* colour stop definitions – all gradient origins/radii are in 512-px space */
  const plateStops = [
    [0.00, 255, 255, 255],
    [0.85, 245, 245, 245],
    [1.00, 224, 224, 224],
  ];
  const sphStops = [
    [0.00, 252, 192,  80],
    [0.20, 240, 152,  40],
    [0.50, 212, 112,  16],
    [0.78, 168,  76,   8],
    [1.00, 136,  56,   8],
  ];
  const lensStops = [
    [0.00, 255, 249, 224],
    [0.30, 251, 224, 128],
    [0.65, 216, 160,  40],
    [1.00, 176, 120,  24],
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // map to 512-px space
      const fx = x / s, fy = y / s;

      /* 1 — Plate (white circle, r=250, centre 256,256) */
      const pCov = circleCoverage(fx, fy, 256, 256, 250);
      if (pCov > 0) {
        const pd   = Math.sqrt((fx - 256 * 0.42) ** 2 + (fy - 256 * 0.38) ** 2) / (250 * 0.60);
        const [pr, pg, pb] = radGrad(pd, plateStops);
        composite(buf, idx, pr, pg, pb, Math.round(pCov * 255));
      }

      /* 2 — Sphere (ellipse cx=258 cy=298 rx=218 ry=210) */
      // gradient origin: 32%,26% of bounding box
      const sphLeft = 258 - 218, sphTop = 298 - 210;
      const sphGCx  = sphLeft + 218 * 2 * 0.32, sphGCy = sphTop + 210 * 2 * 0.26;
      const sphR    = Math.sqrt(218 ** 2 + 210 ** 2) * 0.78;
      const sd      = Math.sqrt((fx - sphGCx) ** 2 + (fy - sphGCy) ** 2) / sphR;
      const sCov    = ellipseCoverage(fx, fy, 258, 298, 218, 210) * pCov;
      if (sCov > 0) {
        const [sr, sg, sb] = radGrad(sd, sphStops);
        composite(buf, idx, sr, sg, sb, Math.round(sCov * 255));
      }

      /* 3 — Lens (rotated ellipse cx=228 cy=216 rx=160 ry=118 rotate=-18°) */
      // gradient origin within lens bounding box (36%,28%)
      const lGCx = 228 - 160 + 320 * 0.36, lGCy = 216 - 118 + 236 * 0.28;
      const lR   = Math.sqrt(160 ** 2 + 118 ** 2) * 0.68;
      const lCov = rotatedEllipseCoverage(fx, fy, 228, 216, 160, 118, -18) * pCov;
      if (lCov > 0) {
        const ld       = Math.sqrt((fx - lGCx) ** 2 + (fy - lGCy) ** 2) / lR;
        const [lr, lg, lb] = radGrad(ld, lensStops);
        composite(buf, idx, lr, lg, lb, Math.round(lCov * 255 * 0.95));
      }

      /* 4 — Specular on lens (ellipse at ~178,170, rx=128,ry=90, in rotated space) */
      const [ux, uy] = unrotate(fx, fy, 228, 216, -18);
      const specR    = Math.sqrt(128 ** 2 + 90 ** 2) * 0.58;
      const specD    = Math.sqrt((ux - 178) ** 2 + (uy - 170) ** 2);
      const specCovRaw = clamp(1.2 - specD / specR, 0, 1);
      const specCov  = specCovRaw * lCov;
      if (specCov > 0) {
        const specA = specCovRaw ** 1.6;          // smooth falloff
        composite(buf, idx, 255, 255, 255, Math.round(specA * 220 * specCov));
      }
    }
  }
  return buf;
}

/* ── PNG encoder (raw, no external deps) ─────────────────────────────────── */
function encodePNG(buf, size) {
  const chunks = [];

  const u32be = v => { const b = Buffer.alloc(4); b.writeUInt32BE(v); return b; };

  function chunk(type, data) {
    const typeB = Buffer.from(type, 'ascii');
    let crc = 0xffffffff;
    for (const b of [...typeB, ...data]) {
      crc ^= b;
      for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    crc ^= 0xffffffff;
    return Buffer.concat([u32be(data.length), typeB, data, u32be(crc >>> 0)]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB (we convert RGBA→RGB+alpha row filter)
  // Actually use RGBA (color type 6)
  ihdr[9] = 6;
  chunks.push(chunk('IHDR', ihdr));

  // IDAT — row filter 0 (none) prepended to each scanline
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter type none
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      raw.push(buf[i], buf[i+1], buf[i+2], buf[i+3]);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(raw), { level: 9 });
  chunks.push(chunk('IDAT', compressed));

  // IEND
  chunks.push(chunk('IEND', Buffer.alloc(0)));

  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), ...chunks]);
}

/* ── write both sizes ────────────────────────────────────────────────────── */
for (const size of [512, 192]) {
  console.log(`Rendering ${size}×${size}…`);
  const pixels = render(size);
  const png    = encodePNG(pixels, size);
  fs.writeFileSync(`public/logo-${size}.png`, png);
  console.log(`  → public/logo-${size}.png  (${png.length} bytes)`);
}
console.log('Done.');
