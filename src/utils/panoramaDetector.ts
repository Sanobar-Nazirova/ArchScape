import type { PanoramaDetectionResult, PanoramaFormat, FisheyeConfig } from '../types';

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogv']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.bmp']);

function ext(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

export async function detectPanorama(file: File): Promise<PanoramaDetectionResult> {
  const fileExt = ext(file.name);
  if (VIDEO_EXTS.has(fileExt) || file.type.startsWith('video/')) return detectVideo(file);
  if (IMAGE_EXTS.has(fileExt) || file.type.startsWith('image/')) return detectImage(file);
  return { format: 'unknown', mediaType: 'panorama-image', width: 0, height: 0, aspectRatio: 0, needsConversion: false };
}

function detectVideo(file: File): Promise<PanoramaDetectionResult> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const w = video.videoWidth, h = video.videoHeight;
      URL.revokeObjectURL(url);
      resolve({
        format: classifyAR(w / h, false),
        mediaType: 'panorama-video',
        width: w, height: h, aspectRatio: w / h,
        needsConversion: false,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ format: 'equirectangular-mono', mediaType: 'panorama-video', width: 0, height: 0, aspectRatio: 0, needsConversion: false });
    };
    video.src = url;
  });
}

function detectImage(file: File): Promise<PanoramaDetectionResult> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      URL.revokeObjectURL(url);
      const ar = w / h;
      const format = classifyAR(ar, true);
      const needsConversion = format.startsWith('fisheye');
      resolve({
        format, mediaType: 'panorama-image',
        width: w, height: h, aspectRatio: ar,
        needsConversion,
        suggestedFisheyeConfig: needsConversion ? buildFisheyeConfig(format, ar) : undefined,
      });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

/**
 * Classify panorama format from aspect ratio.
 *
 * Key ranges (width ÷ height):
 *  > 6      → cylindrical (ultra-wide)
 *  3.6–5    → equirectangular SBS stereo (4:1)
 *  2.5–3.6  → cylindrical (wide)
 *  1.8–2.5  → equirectangular mono (2:1) — most common
 *  1.2–1.8  → partial panorama (wide-angle landscape)
 *  0.8–1.2  → fisheye dual SBS -OR- square partial (ask user)
 *  0.55–0.8 → rectilinear / partial portrait
 *  0.45–0.55→ fisheye dual top-bottom
 *  0.25–0.45→ vertical panorama (tall buildings etc.)
 *  < 0.25   → vertical panorama (extreme)
 */
function classifyAR(ar: number, isImage: boolean): PanoramaFormat {
  if (ar > 6)          return 'cylindrical';
  if (ar >= 3.6)       return 'equirectangular-sbs';
  if (ar >= 2.5)       return 'cylindrical';
  if (ar >= 1.8)       return 'equirectangular-mono';
  if (ar >= 1.2)       return isImage ? 'partial' : 'equirectangular-mono';
  if (ar >= 0.8) {
    // Square-ish: very common for dual fisheye (Theta, Insta360 when exported raw)
    // Stereo equirectangular TB is also 1:1 — default to fisheye for images
    return isImage ? 'fisheye-dual-sbs' : 'equirectangular-tb';
  }
  if (ar >= 0.55)      return isImage ? 'rectilinear' : 'partial';
  if (ar >= 0.40)      return isImage ? 'fisheye-dual-tb' : 'vertical';
  return 'vertical';
}

function buildFisheyeConfig(format: PanoramaFormat, _ar: number): FisheyeConfig {
  switch (format) {
    case 'fisheye-dual-sbs':
      return { type: 'dual-sbs', fov: 200, centerX: 0.25, centerY: 0.5, radius: 0.46 };
    case 'fisheye-dual-tb':
      return { type: 'dual-tb', fov: 200, centerX: 0.5,  centerY: 0.25, radius: 0.46 };
    default:
      return { type: 'single', fov: 180, centerX: 0.5, centerY: 0.5, radius: 0.92 };
  }
}

export function formatLabel(format: PanoramaFormat): string {
  const labels: Record<PanoramaFormat, string> = {
    'equirectangular-mono':  'Equirectangular — Spherical (2:1)',
    'equirectangular-sbs':   'Equirectangular — Stereo Side-by-Side (4:1)',
    'equirectangular-tb':    'Equirectangular — Stereo Top-Bottom (1:1)',
    'fisheye-single':        'Fisheye — Single Circle',
    'fisheye-dual-sbs':      'Fisheye — Dual Side-by-Side (Theta / Insta360)',
    'fisheye-dual-tb':       'Fisheye — Dual Top-Bottom',
    'cylindrical':           'Cylindrical — 360° Horizontal',
    'partial':               'Partial — Wide-Angle (< 360°)',
    'rectilinear':           'Rectilinear — Wide Lens (< 120°)',
    'vertical':              'Vertical Panorama',
    'cubic':                 'Cubic / Cubemap (6 faces)',
    'unknown':               'Unknown — Manual Setup Required',
  };
  return labels[format] ?? format;
}

export function formatShortLabel(format: PanoramaFormat): string {
  const s: Record<PanoramaFormat, string> = {
    'equirectangular-mono':  'EQUIRECT',
    'equirectangular-sbs':   'STEREO SBS',
    'equirectangular-tb':    'STEREO TB',
    'fisheye-single':        'FISHEYE',
    'fisheye-dual-sbs':      'DUAL FISHEYE',
    'fisheye-dual-tb':       'DUAL FISHEYE TB',
    'cylindrical':           'CYLINDRICAL',
    'partial':               'PARTIAL',
    'rectilinear':           'RECTILINEAR',
    'vertical':              'VERTICAL',
    'cubic':                 'CUBIC',
    'unknown':               'UNKNOWN',
  };
  return s[format] ?? format.toUpperCase();
}

export const ALL_FORMATS: PanoramaFormat[] = [
  'equirectangular-mono',
  'equirectangular-sbs',
  'equirectangular-tb',
  'fisheye-single',
  'fisheye-dual-sbs',
  'fisheye-dual-tb',
  'cylindrical',
  'partial',
  'rectilinear',
  'vertical',
  'cubic',
  'unknown',
];
