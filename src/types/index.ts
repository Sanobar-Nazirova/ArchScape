export type PanoramaFormat =
  | 'equirectangular-mono'
  | 'equirectangular-sbs'   // stereo side-by-side (4:1 total)
  | 'equirectangular-tb'    // stereo top-bottom
  | 'fisheye-single'        // single fisheye circle
  | 'fisheye-dual-sbs'      // dual fisheye side-by-side (like Ricoh Theta)
  | 'fisheye-dual-tb'       // dual fisheye top-bottom
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
  thumbnail?: string;
}

export interface Folder {
  id: string;
  name: string;
  isExpanded: boolean;
}

export interface FloorPlanMarker {
  sceneId: string;
  x: number; // 0–1 normalized
  y: number; // 0–1 normalized
}

export interface FloorPlan {
  imageUrl: string;
  markers: FloorPlanMarker[];
}

export type SelectedElementType = 'scene' | 'hotspot' | 'media' | 'audio' | null;

export interface FisheyeConfig {
  type: 'single' | 'dual-sbs' | 'dual-tb';
  fov: number;       // degrees (typically 180)
  centerX: number;   // 0–1 normalized
  centerY: number;
  radius: number;    // 0–1 relative to min(w,h)/2
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
