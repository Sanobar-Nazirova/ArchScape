export type PanoramaFormat =
  // ── Equirectangular family ──────────────────────────────────────────────
  | 'equirectangular-mono'   // 2:1  — full sphere (most common)
  | 'equirectangular-sbs'   // 4:1  — stereo side-by-side
  | 'equirectangular-tb'    // 1:1  — stereo top-bottom
  // ── Fisheye family (need conversion before display) ─────────────────────
  | 'fisheye-single'        // ~1:1 — one fisheye circle
  | 'fisheye-dual-sbs'      // ~2:1 — two circles side-by-side (Theta, Insta360)
  | 'fisheye-dual-tb'       // ~1:2 — two circles top-bottom
  // ── Other panorama types ────────────────────────────────────────────────
  | 'cylindrical'           // 360° H × limited V, very wide aspect ratio
  | 'partial'               // < 360° H — wide-angle landscape shot
  | 'rectilinear'           // < 120° FOV, straight lines, flat projection
  | 'vertical'              // Vertical axis — tall buildings / waterfalls
  | 'cubic'                 // 6-face cubemap
  | 'unknown';

export type MediaType = 'panorama-image' | 'panorama-video';
export type ToolMode = 'none' | 'hotspot' | 'media' | 'audio';
export type HotspotIconStyle = 'arrow' | 'door' | 'circle' | 'stairs' | 'exit';
export type MediaPointType = 'image' | 'video' | 'text' | 'pdf';
export type AudioType = 'ambient' | 'spatial';

export interface Hotspot {
  id: string;
  yaw: number;
  pitch: number;
  targetSceneId: string;
  label: string;
  iconStyle: HotspotIconStyle;
  type?: 'navigation' | 'variants' | 'info' | 'comparison' | 'gallery';   // defaults to 'navigation'
  variantSceneIds?: string[];          // for variants type: all variant scene IDs (incl. current)
  infoTitle?: string;                  // for info type: card title
  infoBody?: string;                   // for info type: card body text
  infoIcon?: 'info' | 'star' | 'warning' | 'check'; // for info type: icon choice
  compareSceneId?: string;             // for comparison type: scene to compare against
  compareLabel?: string;               // for comparison type: label for "before" side
  compareLabel2?: string;              // for comparison type: label for "after" side
  galleryImages?: string[];            // for gallery type: array of image URLs / data URLs
}

export interface MediaPoint {
  id: string;
  yaw: number;
  pitch: number;
  type: MediaPointType;
  title: string;
  content: string;
}

export interface AudioSource {
  id: string;
  label: string;
  type: AudioType;
  src: string;
  volume: number;
  loop: boolean;
  yaw?: number;
  pitch?: number;
}

export interface Scene {
  id: string;
  name: string;
  imageUrl: string;
  mediaType: MediaType;
  format: PanoramaFormat;
  folderId: string | null;
  hotspots: Hotspot[];
  mediaPoints: MediaPoint[];
  audioSources: AudioSource[];
  initialYaw: number;
  initialPitch: number;
  aspectRatio?: number;      // original image width/height ratio
  thumbnail?: string;
  tags?: string[];
  stereoEye?: 'left' | 'right';    // which eye to show for SBS/TB stereo
  fisheyeConfig?: FisheyeConfig;   // user-saved adjustments for fisheye scenes
  northOffset?: number;            // yaw (radians) that corresponds to geographic north
}

export interface Folder {
  id: string;
  name: string;
  isExpanded: boolean;
  parentId?: string | null;
  color?: string;
}

export interface FloorPlanMarker {
  sceneId: string;
  x: number; // 0–1 normalized
  y: number; // 0–1 normalized
}

export interface FloorPlan {
  id: string;
  name: string;
  level: number;   // floor level number (e.g. 0 = Ground, 1 = Level 1 …)
  imageUrl: string;
  markers: FloorPlanMarker[];
}

export type SelectedElementType = 'scene' | 'hotspot' | 'media' | 'audio' | null;

export type AppScreen = 'home' | 'project' | 'editor';

export interface Project {
  id: string;
  name: string;
  desc?: string;
  created: number;
  thumbnail?: string;
  tours: Record<string, Tour>;
}

export interface Tour {
  id: string;
  name: string;
  desc?: string;
  created: number;
  updated?: number;
  thumbUrl?: string;
  password?: string;
  scenes: Scene[];
  folders: Folder[];
  floorPlans?: FloorPlan[];
}

export interface FisheyeConfig {
  type: 'single' | 'dual-sbs' | 'dual-tb';
  fov: number;        // degrees (typically 180–220)
  centerX: number;    // 0–1 normalized
  centerY: number;
  radius: number;     // 0–1 relative to min(w,h)/2
  yawOffset?: number; // degrees, rotates the equirectangular output
}

export interface PanoramaDetectionResult {
  format: PanoramaFormat;
  mediaType: MediaType;
  width: number;
  height: number;
  aspectRatio: number;
  needsConversion: boolean;
  suggestedFisheyeConfig?: FisheyeConfig;
}

export interface ProjectedItem {
  id: string;
  type: 'hotspot' | 'media';
  x: number;
  y: number;
  visible: boolean;
  data: Hotspot | MediaPoint;
}
