import type { FisheyeConfig } from '../types';

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
  const { type, fov, centerX, centerY, radius } = config;
  const fovRad = (fov * Math.PI) / 180;

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const srcCtx = sourceCanvas.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH);

  // Output is always 2:1 equirectangular
  const outW = Math.max(srcW, 1024);
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
      // Map output pixel → spherical coordinates
      const lon = (ox / outW) * 2 * Math.PI - Math.PI;   // −π … π
      const lat = (oy / outH) * Math.PI - Math.PI / 2;   // −π/2 … π/2

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
        const useFront = sz >= 0;
        const eye = useFront ? params.front : params.back;
        // Flip x-axis for back hemisphere (optical axis = −z)
        const lx = useFront ? sx : -sx;
        const lz = useFront ? sz : -sz;
        const result = projectToFisheye(lx, sy, lz, Math.PI, eye);
        if (result) { srcX = result.x; srcY = result.y; valid = true; }
        else { srcX = 0; srcY = 0; }
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
    return {
      front: { cx: srcW * 0.25, cy: srcH * 0.5, r: srcW * 0.25 * 0.92 },
      back:  { cx: srcW * 0.75, cy: srcH * 0.5, r: srcW * 0.25 * 0.92 },
    };
  }

  // dual-tb
  return {
    front: { cx: srcW * 0.5, cy: srcH * 0.25, r: srcH * 0.25 * 0.92 },
    back:  { cx: srcW * 0.5, cy: srcH * 0.75, r: srcH * 0.25 * 0.92 },
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
