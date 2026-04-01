import type { PanoramaDetectionResult, PanoramaFormat, FisheyeConfig } from '../types';

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogv']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.bmp']);

function ext(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i).toLowerCase() : '';
}

/**
 * Auto-detect the format of a panorama file.
 * Returns a PanoramaDetectionResult with format, mediaType, and conversion hints.
 */
export async function detectPanorama(file: File): Promise<PanoramaDetectionResult> {
  const fileExt = ext(file.name);

  if (VIDEO_EXTS.has(fileExt) || file.type.startsWith('video/')) {
    return detectVideo(file);
  }

  if (IMAGE_EXTS.has(fileExt) || file.type.startsWith('image/')) {
    return detectImage(file);
  }

  // Unknown type — default to mono image
  return {
    format: 'unknown',
    mediaType: 'panorama-image',
    width: 0,
    height: 0,
    aspectRatio: 0,
    needsConversion: false,
  };
}

function detectVideo(file: File): Promise<PanoramaDetectionResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      URL.revokeObjectURL(url);
      const ar = w / h;
      resolve({
        format: classifyByAspectRatio(ar, false),
        mediaType: 'panorama-video',
        width: w,
        height: h,
        aspectRatio: ar,
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
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      URL.revokeObjectURL(url);
      const ar = w / h;

      const format = classifyByAspectRatio(ar, true);
      const needsConversion = format.startsWith('fisheye');

      let suggestedFisheyeConfig: FisheyeConfig | undefined;
      if (needsConversion) {
        suggestedFisheyeConfig = buildFisheyeConfig(format, ar);
      }

      resolve({
        format,
        mediaType: 'panorama-image',
        width: w,
        height: h,
        aspectRatio: ar,
        needsConversion,
        suggestedFisheyeConfig,
      });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

function classifyByAspectRatio(ar: number, isImage: boolean): PanoramaFormat {
  // Standard 2:1 equirectangular (mono or top-bottom stereo)
  if (ar >= 1.8 && ar <= 2.2) return 'equirectangular-mono';

  // Wide 4:1 — stereo side-by-side
  if (ar >= 3.6 && ar <= 4.4) return 'equirectangular-sbs';

  // Square-ish (1:1) — could be dual fisheye or top-bottom stereo
  if (ar >= 0.9 && ar <= 1.1) {
    // For images: dual fisheye is common at ~1:1 (e.g. Ricoh Theta, Insta360)
    // Top-bottom stereo is also common at 1:1 (each half = 2:1)
    // Default assumption: dual fisheye for images, top-bottom stereo for videos
    return isImage ? 'fisheye-dual-sbs' : 'equirectangular-tb';
  }

  // Tall image (0.5:1) — could be fisheye dual top-bottom or portrait stereo
  if (ar >= 0.45 && ar <= 0.55) return 'fisheye-dual-tb';

  // Single fisheye: roughly circular, typically aspect ≈ 1:1 but handled above.
  // Remaining cases — treat as unknown.
  return 'unknown';
}

function buildFisheyeConfig(format: PanoramaFormat, _ar: number): FisheyeConfig {
  switch (format) {
    case 'fisheye-dual-sbs':
      return { type: 'dual-sbs', fov: 180, centerX: 0.25, centerY: 0.5, radius: 0.92 };
    case 'fisheye-dual-tb':
      return { type: 'dual-tb', fov: 180, centerX: 0.5,  centerY: 0.25, radius: 0.92 };
    case 'fisheye-single':
    default:
      return { type: 'single', fov: 180, centerX: 0.5, centerY: 0.5, radius: 0.92 };
  }
}

/** Human-readable label for a PanoramaFormat */
export function formatLabel(format: PanoramaFormat): string {
  const labels: Record<PanoramaFormat, string> = {
    'equirectangular-mono':  'Equirectangular (Mono)',
    'equirectangular-sbs':   'Equirectangular Stereo Side-by-Side',
    'equirectangular-tb':    'Equirectangular Stereo Top-Bottom',
    'fisheye-single':        'Fisheye (Single)',
    'fisheye-dual-sbs':      'Dual Fisheye (Side-by-Side)',
    'fisheye-dual-tb':       'Dual Fisheye (Top-Bottom)',
    'unknown':               'Unknown',
  };
  return labels[format] ?? format;
}

/** All selectable formats for manual override */
export const ALL_FORMATS: PanoramaFormat[] = [
  'equirectangular-mono',
  'equirectangular-sbs',
  'equirectangular-tb',
  'fisheye-single',
  'fisheye-dual-sbs',
  'fisheye-dual-tb',
  'unknown',
];
