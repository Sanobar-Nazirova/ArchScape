import type { FisheyeConfig } from '../types';

// ── Session-level fisheye conversion cache (keyed by sceneId) ────────────
// Cleared when the user saves new adjustment settings for a scene.
export const fisheyeCache = new Map<string, HTMLCanvasElement>();
export function clearFisheyeCache(sceneId: string) { fisheyeCache.delete(sceneId); }

/**
 * Convert a fisheye image to an equirectangular panorama using the equidistant
 * projection model (r = f·θ). Supports single and dual fisheye formats.
 *
 * @param sourceCanvas  Canvas containing the input fisheye image (any size)
 * @param config        Fisheye configuration (type, fov, center, radius)
 * @returns             A new canvas with 2:1 equirectangular output
 */
export function fisheyeToEquirectangular(
  sourceCanvas: HTMLCanvasElement,
  config: FisheyeConfig,
): HTMLCanvasElement {
  const { type, fov, centerX, centerY, radius, yawOffset = 0 } = config;
  const fovRad = (fov * Math.PI) / 180;
  const yawRad = (yawOffset * Math.PI) / 180;

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const srcCtx = sourceCanvas.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH);

  // Output is always 2:1 equirectangular.
  // Base width on the larger source dimension so portrait dual-tb images
  // (where srcH >> srcW) produce an output that matches the circle resolution.
  // Minimum 2048, maximum 4096 to balance quality vs GPU texture budget.
  const outW = Math.min(4096, Math.max(Math.max(srcW, srcH), 2048));
  const outH = Math.round(outW / 2);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d')!;
  const outData = outCtx.createImageData(outW, outH);

  // Fisheye circle parameters (in source pixel space)
  const maxR = Math.min(srcW, srcH) / 2;

  // For dual fisheye, derive per-eye parameters
  const params = buildFisheyeParams(type, srcW, srcH, centerX, centerY, radius, maxR);

  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      // Map output pixel → spherical coordinates.
      //
      // Longitude offset: -1.5π aligns the front circle (lon=0°) with the
      // Three.js camera forward direction (u=0.75 on the sphere). yawOffset
      // lets users rotate the output to move the seam to a less visible spot.
      const lon = (ox / outW) * 2 * Math.PI - Math.PI * 1.5 + yawRad;
      const lat = (oy / outH) * Math.PI - Math.PI / 2;        // −π/2  … π/2

      // Cartesian unit vector
      const sx =  Math.cos(lat) * Math.sin(lon);
      const sy =  Math.sin(lat);
      const sz =  Math.cos(lat) * Math.cos(lon);

      // Determine which eye/circle to sample
      let srcX: number, srcY: number;
      let valid = false;

      if (type === 'single') {
        const result = projectToFisheye(sx, sy, sz, fovRad, params.front);
        if (result) { srcX = result.x; srcY = result.y; valid = true; }
        else { srcX = 0; srcY = 0; }
      } else if (type === 'dual-sbs' || type === 'dual-tb') {
        // Use fovRad so the Overlap/FOV setting is respected.
        // projectToFisheye returns null when theta > fovRad/2 (outside circle).
        const frontResult = projectToFisheye(sx,  sy,  sz,  fovRad, params.front);
        const backResult  = projectToFisheye(-sx, sy, -sz,  fovRad, params.back);

        if (frontResult && backResult) {
          // Overlap zone — blend smoothly. t=1 → pure front, t=0 → pure back.
          //
          // Adaptive blend window: for fov > 180° both eyes are valid over an sz range
          // of [-|cos(fovRad/2)|, +|cos(fovRad/2)|].  Matching the blend window to this
          // exact range eliminates the hard cutoff where one eye drops out.
          // Minimum 0.05 so there's always a little softening even at fov=180°.
          const overlapSz  = Math.max(0.05, -Math.cos(fovRad / 2));
          const t = Math.max(0, Math.min(1, (sz + overlapSz) / (2 * overlapSz)));
          const fp = bilinearSample(srcData, srcW, srcH, frontResult.x, frontResult.y);
          const bp = bilinearSample(srcData, srcW, srcH, backResult.x,  backResult.y);
          if (fp || bp) {
            const dstIdx = (oy * outW + ox) * 4;
            const fr = fp ?? { r: 0, g: 0, b: 0, a: 0 };
            const br = bp ?? { r: 0, g: 0, b: 0, a: 0 };
            outData.data[dstIdx]     = Math.round(fr.r * t + br.r * (1 - t));
            outData.data[dstIdx + 1] = Math.round(fr.g * t + br.g * (1 - t));
            outData.data[dstIdx + 2] = Math.round(fr.b * t + br.b * (1 - t));
            outData.data[dstIdx + 3] = Math.round(fr.a * t + br.a * (1 - t));
          }
          continue; // already wrote pixel
        } else if (frontResult) {
          srcX = frontResult.x; srcY = frontResult.y; valid = true;
        } else if (backResult) {
          srcX = backResult.x; srcY = backResult.y; valid = true;
        } else {
          srcX = 0; srcY = 0;
        }
      } else {
        srcX = 0; srcY = 0;
      }

      if (!valid) continue;

      // Bilinear sample
      const pixel = bilinearSample(srcData, srcW, srcH, srcX, srcY);
      if (!pixel) continue;

      const dstIdx = (oy * outW + ox) * 4;
      outData.data[dstIdx]     = pixel.r;
      outData.data[dstIdx + 1] = pixel.g;
      outData.data[dstIdx + 2] = pixel.b;
      outData.data[dstIdx + 3] = pixel.a;
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return outCanvas;
}

interface EyeParams {
  cx: number;  // circle center x in source pixels
  cy: number;
  r: number;   // circle radius in source pixels
}

interface FisheyeParams {
  front: EyeParams;
  back: EyeParams;
}

function buildFisheyeParams(
  type: FisheyeConfig['type'],
  srcW: number,
  srcH: number,
  centerX: number,
  centerY: number,
  radius: number,
  maxR: number,
): FisheyeParams {
  if (type === 'single') {
    const params: EyeParams = {
      cx: centerX * srcW,
      cy: centerY * srcH,
      r: radius * maxR,
    };
    return { front: params, back: params };
  }

  if (type === 'dual-sbs') {
    // centerX/centerY = front (left) circle center as fraction of full image
    // radius = fraction of half-image width
    const r = radius * (srcW / 2);
    return {
      front: { cx: centerX * srcW,         cy: centerY * srcH, r },
      back:  { cx: (1 - centerX) * srcW,   cy: centerY * srcH, r },
    };
  }

  // dual-tb
  // centerX/centerY = front (top) circle center as fraction of full image
  // radius = fraction of half-image height
  const r = radius * (srcH / 2);
  return {
    front: { cx: centerX * srcW, cy: centerY * srcH,         r },
    back:  { cx: centerX * srcW, cy: (1 - centerY) * srcH,   r },
  };
}

function projectToFisheye(
  sx: number,
  sy: number,
  sz: number,
  fovRad: number,
  eye: EyeParams,
): { x: number; y: number } | null {
  const theta = Math.acos(Math.max(-1, Math.min(1, sz)));
  if (theta > fovRad / 2) return null;

  const phi = Math.atan2(sy, sx);
  const r = (theta / (fovRad / 2)) * eye.r;

  return {
    x: eye.cx + r * Math.cos(phi),
    y: eye.cy + r * Math.sin(phi),
  };
}

interface RGBA { r: number; g: number; b: number; a: number }

function bilinearSample(
  data: ImageData,
  w: number,
  h: number,
  x: number,
  y: number,
): RGBA | null {
  if (x < 0 || x >= w - 1 || y < 0 || y >= h - 1) return null;

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;

  const sample = (px: number, py: number): RGBA => {
    const idx = (py * w + px) * 4;
    return {
      r: data.data[idx],
      g: data.data[idx + 1],
      b: data.data[idx + 2],
      a: data.data[idx + 3],
    };
  };

  const c00 = sample(x0,     y0);
  const c10 = sample(x0 + 1, y0);
  const c01 = sample(x0,     y0 + 1);
  const c11 = sample(x0 + 1, y0 + 1);

  return {
    r: Math.round(c00.r * (1 - fx) * (1 - fy) + c10.r * fx * (1 - fy) + c01.r * (1 - fx) * fy + c11.r * fx * fy),
    g: Math.round(c00.g * (1 - fx) * (1 - fy) + c10.g * fx * (1 - fy) + c01.g * (1 - fx) * fy + c11.g * fx * fy),
    b: Math.round(c00.b * (1 - fx) * (1 - fy) + c10.b * fx * (1 - fy) + c01.b * (1 - fx) * fy + c11.b * fx * fy),
    a: Math.round(c00.a * (1 - fx) * (1 - fy) + c10.a * fx * (1 - fy) + c01.a * (1 - fx) * fy + c11.a * fx * fy),
  };
}

/**
 * Auto-detect fisheye circle parameters by scanning pixel brightness.
 * Returns normalized centerX/centerY/radius suitable for FisheyeConfig.
 */
export function autoDetectFisheyeCircles(
  canvas: HTMLCanvasElement,
  type: FisheyeConfig['type'],
): Pick<FisheyeConfig, 'centerX' | 'centerY' | 'radius'> {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;

  if (type === 'dual-sbs') {
    const halfW = Math.floor(W / 2);
    const leftPx  = ctx.getImageData(0,      0, halfW, H).data;
    const rightPx = ctx.getImageData(halfW,   0, halfW, H).data;
    const left  = detectCircleInPixels(leftPx,  halfW, H);
    const right = detectCircleInPixels(rightPx, halfW, H);
    const avgR = (left.r + right.r) / 2;
    return {
      centerX: left.cx / W,            // front circle center, full-image fraction
      centerY: left.cy / H,
      radius:  avgR   / halfW,          // fraction of half-width
    };
  }

  if (type === 'dual-tb') {
    const halfH = Math.floor(H / 2);
    const topPx    = ctx.getImageData(0, 0,     W, halfH).data;
    const bottomPx = ctx.getImageData(0, halfH, W, halfH).data;
    const top    = detectCircleInPixels(topPx,    W, halfH);
    const bottom = detectCircleInPixels(bottomPx, W, halfH);
    const avgR = (top.r + bottom.r) / 2;
    return {
      centerX: top.cx / W,
      centerY: top.cy / H,
      radius:  avgR   / halfH,
    };
  }

  // single
  const px = ctx.getImageData(0, 0, W, H).data;
  const circle = detectCircleInPixels(px, W, H);
  return {
    centerX: circle.cx / W,
    centerY: circle.cy / H,
    radius:  circle.r  / (Math.min(W, H) / 2),
  };
}

function detectCircleInPixels(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): { cx: number; cy: number; r: number } {
  // Use a low brightness threshold — fisheye backgrounds are pure black
  const THRESH = 20;
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if ((data[i] + data[i + 1] + data[i + 2]) / 3 > THRESH) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return { cx: w / 2, cy: h / 2, r: Math.min(w, h) / 2 * 0.92 };

  // Bounding box centre is more robust than centroid for partially-dark scenes
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // Use the smaller axis so we always inscribe the circle
  const r  = Math.min((maxX - minX) / 2, (maxY - minY) / 2);

  return { cx, cy, r };
}

/**
 * Load an image File into a canvas element.
 */
export function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}
