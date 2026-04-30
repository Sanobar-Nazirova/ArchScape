import React, {
  useEffect, useRef, useCallback, useState,
} from 'react';
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory }       from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { yawPitchToWorld, worldToYawPitch } from '../../utils/sphereCoords';
import MediaPanel from './MediaPanel';
import FloorPlanMinimap from './FloorPlanMinimap';
import { useTourStore } from '../../store/useTourStore';
import type {
  Hotspot, MediaPoint, Scene, ToolMode, HotspotIconStyle, PanoramaFormat, FisheyeConfig,
} from '../../types';
import { triggerUpload } from '../../utils/uploadTrigger';
import { formatShortLabel } from '../../utils/panoramaDetector';
import { fisheyeToEquirectangular, autoDetectFisheyeCircles, fisheyeCache } from '../../utils/fisheyeConverter';
import {
  ArrowRight, DoorOpen, Circle, ArrowUpRight, LogOut,
  Info, Image, Video, FileText, FileArchive,
  Play, Pause, Volume2, ZoomIn, ZoomOut, Upload, AlertTriangle,
  ChevronLeft, ChevronRight, Layers,
} from 'lucide-react';

function fisheyeConfigFromFormat(format: PanoramaFormat): FisheyeConfig {
  switch (format) {
    case 'fisheye-dual-sbs':
      return { type: 'dual-sbs', fov: 200, centerX: 0.25, centerY: 0.5, radius: 0.46 };
    case 'fisheye-dual-tb':
      return { type: 'dual-tb', fov: 200, centerX: 0.5, centerY: 0.25, radius: 0.46 };
    default: // fisheye-single
      return { type: 'single', fov: 180, centerX: 0.5, centerY: 0.5, radius: 0.92 };
  }
}

/* ─── Fisheye video shader ────────────────────────────────────────────────
 * Converts a raw dual/single fisheye VideoTexture to equirectangular on the
 * GPU in real-time. Runs the same equidistant projection math as the CPU
 * fisheyeToEquirectangular() but as a GLSL fragment shader per sphere fragment.
 *
 * Sphere UV convention (Three.js SphereGeometry, BackSide):
 *   vUv.x ∈ [0,1]  → lon = x·2π   (0 = +z direction)
 *   vUv.y ∈ [0,1]  → lat = (y-0.5)·π  (0 = south pole, 1 = north pole)
 *
 * VideoTexture has flipY=false so shader v = image_y / H.
 * The front fisheye circle has its +y world content ABOVE the center in
 * image space (smaller image_y), so source_v = center.y − r_v·sin(phi).
 * ─────────────────────────────────────────────────────────────────────── */
const FISHEYE_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FISHEYE_FRAG = /* glsl */`
#define PI 3.14159265358979323846

uniform sampler2D map;
uniform int   fisheyeType;   // 0=single, 1=dual-sbs, 2=dual-tb
uniform float halfFov;       // fovRad / 2
uniform float yawOffset;     // radians — rotates scene horizontally
// Per-eye circle params in normalised image UV space
uniform vec2  frontCenter;   // (cx/W, cy/H) of front circle
uniform vec2  backCenter;    // (cx/W, cy/H) of back circle
uniform float radiusU;       // circle radius as fraction of image WIDTH
uniform float radiusV;       // circle radius as fraction of image HEIGHT

varying vec2 vUv;

// Returns valid=1.0, source UV in xy; or valid=0.0 when theta>halfFov
vec3 projectFisheye(float sx, float sy, float sz, vec2 center) {
  float theta = acos(clamp(sz, -1.0, 1.0));
  if (theta >= halfFov) return vec3(0.0, 0.0, 0.0);
  float phi   = atan(sy, sx);
  float scale = theta / halfFov;
  return vec3(
    center.x + scale * radiusU * cos(phi),
    center.y - scale * radiusV * sin(phi),  // − because image y-axis is inverted vs world
    1.0
  );
}

void main() {
  float lat    = (vUv.y - 0.5) * PI;
  float lon    = vUv.x * 2.0 * PI + yawOffset;
  float coLat  = cos(lat);
  float sx = coLat * sin(lon);
  float sy = sin(lat);
  float sz = coLat * cos(lon);

  vec4 color = vec4(0.0, 0.0, 0.0, 1.0);

  if (fisheyeType == 0) {
    // ── Single fisheye ──────────────────────────────────────────────
    vec3 f = projectFisheye(sx, sy, sz, frontCenter);
    if (f.z > 0.5 && f.x >= 0.0 && f.x <= 1.0 && f.y >= 0.0 && f.y <= 1.0)
      color = texture2D(map, f.xy);

  } else {
    // ── Dual fisheye (SBS or TB) ────────────────────────────────────
    // Adaptive blend window matches actual overlap zone where both eyes
    // are valid: overlapSz = |cos(halfFov)| (positive when fov > 180°)
    float overlapSz = max(0.05, -cos(halfFov));
    float t = clamp((sz + overlapSz) / (2.0 * overlapSz), 0.0, 1.0);

    vec3 front = projectFisheye( sx,  sy,  sz, frontCenter);
    vec3 back  = projectFisheye(-sx,  sy, -sz, backCenter);

    bool frontOk = front.z > 0.5 && front.x >= 0.0 && front.x <= 1.0
                                  && front.y >= 0.0 && front.y <= 1.0;
    bool backOk  = back.z  > 0.5 && back.x  >= 0.0 && back.x  <= 1.0
                                  && back.y  >= 0.0 && back.y  <= 1.0;

    if (frontOk && backOk) {
      vec4 fp = texture2D(map, front.xy);
      vec4 bp = texture2D(map, back.xy);
      color = mix(bp, fp, t);
    } else if (frontOk) {
      color = texture2D(map, front.xy);
    } else if (backOk) {
      color = texture2D(map, back.xy);
    }
  }

  gl_FragColor = color;
}`;

/** Compute normalised circle radii and center positions for the shader uniforms. */
function fisheyeShaderUniforms(cfg: FisheyeConfig, vW: number, vH: number) {
  const { type, fov, centerX, centerY, radius, yawOffset = 0 } = cfg;
  const fovRad  = (fov  * Math.PI) / 180;
  const yawRad  = (yawOffset * Math.PI) / 180;

  let rPx: number, frontCX: number, frontCY: number, backCX: number, backCY: number;

  if (type === 'dual-sbs') {
    rPx    = radius * vW / 2;
    frontCX = centerX;  frontCY = centerY;
    backCX  = 1 - centerX; backCY = centerY;
  } else if (type === 'dual-tb') {
    rPx    = radius * vH / 2;
    frontCX = centerX;  frontCY = centerY;
    backCX  = centerX;  backCY  = 1 - centerY;
  } else { // single
    rPx    = radius * Math.min(vW, vH) / 2;
    frontCX = centerX; frontCY = centerY;
    backCX  = centerX; backCY  = centerY;
  }

  const typeCode = type === 'single' ? 0 : type === 'dual-sbs' ? 1 : 2;

  return {
    map:         { value: null as THREE.Texture | null },
    fisheyeType: { value: typeCode },
    halfFov:     { value: fovRad / 2 },
    yawOffset:   { value: yawRad },
    frontCenter: { value: new THREE.Vector2(frontCX, frontCY) },
    backCenter:  { value: new THREE.Vector2(backCX,  backCY) },
    radiusU:     { value: rPx / vW },
    radiusV:     { value: rPx / vH },
  };
}

function makeFisheyeShaderMaterial(cfg: FisheyeConfig, vW: number, vH: number): THREE.ShaderMaterial {
  const uniforms = fisheyeShaderUniforms(cfg, vW, vH);
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader:   FISHEYE_VERT,
    fragmentShader: FISHEYE_FRAG,
    side: THREE.BackSide,
  });
}


const HOTSPOT_ICONS: Record<HotspotIconStyle, React.ReactNode> = {
  arrow:  <ArrowRight    size={14} />,
  door:   <DoorOpen      size={14} />,
  circle: <Circle        size={14} />,
  stairs: <ArrowUpRight  size={14} />,
  exit:   <LogOut        size={14} />,
};

/** Renders the same hotspot icon used in the 2D overlay onto a canvas, returns a Three.js CanvasTexture. */
function makeHotspotCanvasTexture(iconStyle: HotspotIconStyle): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const cx = S / 2, cy = S / 2, r = S / 2 - 3;

  // Dark circle background
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // Orange border (matches --nm-accent #e07b3f)
  ctx.strokeStyle = '#e07b3f'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.stroke();

  // Icon path (lucide 24×24 viewBox scaled to canvas)
  const scale = S / 24;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#e07b3f'; ctx.lineWidth = 5 / scale;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = '#e07b3f';

  switch (iconStyle) {
    case 'arrow': // ArrowRight
      ctx.beginPath(); ctx.moveTo(5,12); ctx.lineTo(19,12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12,5); ctx.lineTo(19,12); ctx.lineTo(12,19); ctx.stroke();
      break;
    case 'door': // DoorOpen — simplified door silhouette
      ctx.beginPath();
      ctx.moveTo(13,4); ctx.lineTo(7,5.5); ctx.lineTo(7,20); ctx.lineTo(13,20); ctx.lineTo(13,4);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(10.5, 12, 1.2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2,20); ctx.lineTo(22,20); ctx.stroke();
      break;
    case 'circle': // Circle
      ctx.beginPath(); ctx.arc(12,12,7,0,Math.PI*2); ctx.stroke();
      break;
    case 'stairs': // ArrowUpRight
      ctx.beginPath(); ctx.moveTo(7,7); ctx.lineTo(17,7); ctx.lineTo(17,17); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7,17); ctx.lineTo(17,7); ctx.stroke();
      break;
    case 'exit': // LogOut
      ctx.beginPath(); ctx.moveTo(9,21); ctx.lineTo(5,21); ctx.lineTo(5,3); ctx.lineTo(9,3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(16,17); ctx.lineTo(21,12); ctx.lineTo(16,7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(21,12); ctx.lineTo(9,12); ctx.stroke();
      break;
  }
  ctx.restore();
  return new THREE.CanvasTexture(c);
}

function HotspotMarker({
  hotspot, isSelected, isPreview, targetSceneName,
}: {
  hotspot: Hotspot;
  isSelected: boolean;
  isPreview: boolean;
  targetSceneName?: string;
}) {
  const tooltip = hotspot.label || targetSceneName;
  return (
    <div className="flex flex-col items-center gap-1 group select-none" style={{ cursor: isPreview ? 'pointer' : 'grab' }}>
      <div className={[
        'w-10 h-10 rounded-full flex items-center justify-center transition-all',
        'border-2 shadow-lg backdrop-blur-sm',
        isSelected
          ? 'bg-nm-accent border-white text-white scale-110 shadow-nm-accent/40'
          : isPreview
          ? 'bg-black/60 border-white/70 text-white hover:scale-110 hover:bg-nm-accent hover:border-white hotspot-pulse'
          : 'bg-black/50 border-nm-accent/70 text-nm-accent hover:scale-110 hover:bg-nm-accent hover:text-white hotspot-pulse',
      ].join(' ')}>
        {HOTSPOT_ICONS[hotspot.iconStyle]}
      </div>
      {tooltip && (
        <span className={[
          'text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm border whitespace-nowrap font-medium',
          isSelected
            ? 'bg-nm-accent text-white border-white/30 opacity-100'
            : 'bg-black/75 text-white border-white/20 opacity-0 group-hover:opacity-100 transition-opacity',
        ].join(' ')}>
          {targetSceneName && !hotspot.label && <span className="mr-1 opacity-60">→</span>}
          {tooltip}
        </span>
      )}
    </div>
  );
}

/* ─── VariantHotspotMarker ────────────────────────────────────────────── */
function VariantHotspotMarker({ hotspot, isSelected, isPreview, isOpen, currentSceneId: _currentSceneId, scenes: _scenes }: {
  hotspot: Hotspot; isSelected: boolean; isPreview: boolean;
  isOpen: boolean; currentSceneId: string; scenes: Scene[];
}) {
  const label = hotspot.label || 'Design Options';
  return (
    <div className="flex flex-col items-center gap-1 group select-none" style={{ cursor: isPreview ? 'pointer' : 'grab' }}>
      <div className={[
        'w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 shadow-lg backdrop-blur-sm',
        isSelected || isOpen
          ? 'bg-nm-teal border-white text-white scale-110'
          : isPreview
          ? 'bg-black/60 border-nm-teal/70 text-nm-teal hover:scale-110 hover:bg-nm-teal hover:border-white'
          : 'bg-black/50 border-nm-teal/70 text-nm-teal hover:scale-110 hover:bg-nm-teal hover:text-white',
      ].join(' ')}>
        <Layers size={16} />
      </div>
      <span className={[
        'text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm border whitespace-nowrap font-medium',
        isSelected || isOpen
          ? 'bg-nm-teal text-white border-white/30 opacity-100'
          : 'bg-black/75 text-white border-white/20 opacity-0 group-hover:opacity-100 transition-opacity',
      ].join(' ')}>
        {label}
      </span>
    </div>
  );
}

/* ─── MediaMarker ─────────────────────────────────────────────────────── */
const MEDIA_ICONS: Record<string, React.ReactNode> = {
  image: <Image   size={13} />,
  video: <Video   size={13} />,
  text:  <FileText size={13} />,
  pdf:   <FileArchive size={13} />,
};

function MediaMarker({ media, isSelected, onClick }: {
  media: MediaPoint; isSelected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group focus:outline-none"
    >
      <div className={[
        'w-8 h-8 rounded-full flex items-center justify-center transition-all',
        'border-2 shadow-lg backdrop-blur-sm media-pulse',
        isSelected
          ? 'bg-yellow-500 border-white text-white scale-110'
          : 'bg-black/50 border-yellow-400/70 text-yellow-400 hover:scale-110 hover:bg-yellow-500 hover:text-white',
      ].join(' ')}
      >
        {MEDIA_ICONS[media.type] ?? <Info size={13} />}
      </div>
      {media.title && (
        <span className="text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm border whitespace-nowrap bg-black/60 text-white border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
          {media.title}
        </span>
      )}
    </button>
  );
}

/* ─── VideoControls ───────────────────────────────────────────────────── */
function VideoControls({ videoEl }: { videoEl: HTMLVideoElement | null }) {
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  if (!videoEl) return null;

  const toggle = () => {
    if (videoEl.paused) { videoEl.play(); setPlaying(true); }
    else { videoEl.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    videoEl.muted = !videoEl.muted;
    setMuted(videoEl.muted);
  };

  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl px-2 py-1.5">
      <span className="text-[10px] text-white/50 mr-1">360° Video</span>
      <button onClick={toggle} className="text-white hover:text-nm-accent p-1 transition-colors" title={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
      <button onClick={toggleMute} className="text-white hover:text-nm-accent p-1 transition-colors" title={muted ? 'Unmute' : 'Mute'}>
        <Volume2 size={13} className={muted ? 'opacity-40' : ''} />
      </button>
    </div>
  );
}

/* ─── ZoomControls ────────────────────────────────────────────────────── */
function ZoomControls({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
      <button onClick={onZoomIn} className="w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg text-white hover:text-nm-accent hover:border-nm-accent/40 transition-colors">
        <ZoomIn size={14} />
      </button>
      <button onClick={onZoomOut} className="w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg text-white hover:text-nm-accent hover:border-nm-accent/40 transition-colors">
        <ZoomOut size={14} />
      </button>
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────────────────────── */
function EmptyViewer() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center select-none px-8">
      {/* Globe icon */}
      <div
        className="w-24 h-24 rounded-nm flex items-center justify-center"
        style={{ boxShadow: '8px 8px 18px var(--sh-d), -5px -5px 12px var(--sh-l)' }}
      >
        <svg viewBox="0 0 80 80" className="w-14 h-14 text-nm-accent opacity-60" fill="none">
          <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="2.5" />
          <ellipse cx="40" cy="40" rx="30" ry="14" stroke="currentColor" strokeWidth="2.5" />
          <line x1="40" y1="10" x2="40" y2="70" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      </div>

      <div className="space-y-2">
        <p className="font-syne font-semibold text-lg text-nm-text">Add Your First Scene</p>
        <p className="text-nm-muted text-sm max-w-xs leading-relaxed">
          Upload panoramic images or 360° videos to start building your virtual tour.
        </p>
      </div>

      {/* Upload CTA */}
      <button
        onClick={triggerUpload}
        className="flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white rounded-nm-sm transition-all hover:scale-[1.03] active:scale-[0.97]"
        style={{ background: 'var(--nm-accent)', boxShadow: '5px 5px 14px rgba(224,123,63,.4), -2px -2px 6px rgba(255,255,255,.06)' }}
      >
        <Upload size={15} />
        Upload Panoramas
      </button>

      <div className="grid grid-cols-3 gap-3 text-center w-full max-w-sm">
        {[
          { label: 'Equirectangular', sub: 'JPG · PNG · WEBP', icon: '🌐' },
          { label: '360° Video',      sub: 'MP4 · WEBM · MOV', icon: '🎬' },
          { label: 'Fisheye',         sub: 'Auto-detected',    icon: '👁' },
        ].map(({ label, sub, icon }) => (
          <div
            key={label}
            className="rounded-nm-sm p-3"
            style={{ boxShadow: 'inset 3px 3px 7px var(--sh-d-in), inset -2px -2px 5px var(--sh-l-in)' }}
          >
            <div className="text-2xl mb-1">{icon}</div>
            <p className="text-xs text-nm-text font-medium leading-tight">{label}</p>
            <p className="text-[10px] text-nm-muted mt-0.5">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── PanoramaViewer ──────────────────────────────────────────────────── */
interface PanoramaViewerProps {
  scene: Scene | null;
  isPreviewMode: boolean;
  activeTool: ToolMode;
  selectedElementId: string | null;
  onHotspotPlace: (yaw: number, pitch: number) => void;
  onMediaPlace: (yaw: number, pitch: number) => void;
  onHotspotClick: (hotspot: Hotspot) => void;
  onHotspotSelect: (hotspotId: string) => void;
  onMediaSelect: (mediaId: string) => void;
  onHotspotReposition: (hotspotId: string, yaw: number, pitch: number) => void;
}

export default function PanoramaViewer({
  scene, isPreviewMode, activeTool, selectedElementId,
  onHotspotPlace, onMediaPlace, onHotspotClick, onHotspotSelect, onMediaSelect,
  onHotspotReposition,
}: PanoramaViewerProps) {
  const { floorPlans, activeFloorPlanId, setActiveFloorPlan, setActiveScene, scenes, setPendingStartView } = useTourStore();

  // Stable refs so XR event handlers always see fresh values
  const scenesRef             = useRef(scenes);
  const setActiveSceneRef     = useRef(setActiveScene);
  const floorPlansRef         = useRef(floorPlans);
  const activeFloorPlanIdRef  = useRef(activeFloorPlanId);
  const setActiveFloorPlanRef = useRef(setActiveFloorPlan);
  useEffect(() => { scenesRef.current = scenes; },                        [scenes]);
  useEffect(() => { setActiveSceneRef.current = setActiveScene; },        [setActiveScene]);
  useEffect(() => { floorPlansRef.current = floorPlans; },                [floorPlans]);
  useEffect(() => { activeFloorPlanIdRef.current = activeFloorPlanId; },  [activeFloorPlanId]);
  useEffect(() => { setActiveFloorPlanRef.current = setActiveFloorPlan; },[setActiveFloorPlan]);
  const floorPlan = floorPlans.find(f => f.id === activeFloorPlanId) ?? floorPlans[0] ?? null;

  // ── Three.js refs ──────────────────────────────────────────────────────
  const containerRef  = useRef<HTMLDivElement>(null);
  const rendererRef   = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef     = useRef<THREE.PerspectiveCamera | null>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const sphereRef     = useRef<THREE.Mesh | null>(null);
  const textureRef    = useRef<THREE.Texture | null>(null);
  const videoElRef    = useRef<HTMLVideoElement | null>(null);
  const shaderMatRef  = useRef<THREE.ShaderMaterial | null>(null);
  const rafRef        = useRef<number>(0);

  // ── Camera state refs (avoid stale closures in rAF) ─────────────────
  const yawRef        = useRef(0);
  const pitchRef      = useRef(0);
  const fovRef        = useRef(90);
  const draggingRef   = useRef(false);
  const lastMouseRef  = useRef({ x: 0, y: 0 });

  // ── Hotspot overlay refs ───────────────────────────────────────────────
  const hotspotContainersRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const mediaContainersRef   = useRef<Map<string, HTMLDivElement>>(new Map());
  const draggingHotspotRef   = useRef<{ id: string; yaw: number; pitch: number } | null>(null);
  const dragStateRef         = useRef<{ hotspotId: string; startX: number; startY: number; moved: boolean } | null>(null);

  // ── Prop refs ─────────────────────────────────────────────────────────
  const sceneRef              = useRef(scene);
  const activeToolRef         = useRef(activeTool);
  const isPreviewModeRef      = useRef(isPreviewMode);
  const onHotspotClickRef     = useRef(onHotspotClick);
  const onHotspotSelectRef    = useRef(onHotspotSelect);
  const onHotspotRepositionRef = useRef(onHotspotReposition);

  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { isPreviewModeRef.current = isPreviewMode; }, [isPreviewMode]);
  useEffect(() => { onHotspotClickRef.current = onHotspotClick; }, [onHotspotClick]);
  useEffect(() => { onHotspotSelectRef.current = onHotspotSelect; }, [onHotspotSelect]);
  useEffect(() => { onHotspotRepositionRef.current = onHotspotReposition; }, [onHotspotReposition]);

  // Shared ref so the VR mute button can reach live audio elements
  const audioElemsRef  = useRef<HTMLAudioElement[]>([]);
  const audioGainsRef  = useRef<GainNode[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────
  const [activeMedia, setActiveMedia] = useState<MediaPoint | null>(null);
  const [minimapYaw, setMinimapYaw]   = useState(0);
  const [openVariantHotspotId, setOpenVariantHotspotId] = useState<string | null>(null);
  const [vrSupported, setVrSupported] = useState(false);
  const [isInVR, setIsInVR]           = useState(false);

  // ── WebXR support detection ────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      (navigator as any).xr?.isSessionSupported('immersive-vr')
        .then((supported: boolean) => setVrSupported(supported))
        .catch(() => setVrSupported(false));
    }
  }, []);

  // ── Enter / exit immersive VR ─────────────────────────────────────────
  const enterVR = async () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    try {
      const session = await (navigator as any).xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      });
      await renderer.xr.setSession(session);
      setIsInVR(true);
      session.addEventListener('end', () => setIsInVR(false));
    } catch (err) {
      console.warn('WebXR session failed:', err);
    }
  };

  // ── Expose fisheye yaw rotation helper (for real-time slider feedback) ──
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)['__sphera_setFisheyeYaw'] = (deg: number) => {
      const sc = sceneRef.current;
      if (!sc?.format.startsWith('fisheye')) return;
      if (shaderMatRef.current) {
        // Fisheye video: update yawOffset uniform directly
        shaderMatRef.current.uniforms.yawOffset.value = (deg * Math.PI) / 180;
      } else {
        // Fisheye image (equirectangular output): shift texture offset
        const tex = textureRef.current;
        if (!tex) return;
        tex.offset.x = -deg / 360;
        tex.updateMatrix();
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { delete (window as any)['__sphera_setFisheyeYaw']; };
  }, []);

  // ── Expose camera view getter globally (for "Set from current view" button) ──
  useEffect(() => {
    const getCameraView = () => ({ yaw: yawRef.current, pitch: pitchRef.current });
    (window as unknown as Record<string, unknown>)['__sphera_getCameraView'] = getCameraView;
    return () => { delete (window as unknown as Record<string, unknown>)['__sphera_getCameraView']; };
  }, []);

  // ── Three.js init (once) ──────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch (_e) {
      console.error('WebGL not supported:', _e);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const threeScene = new THREE.Scene();
    threeSceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(90, container.clientWidth / container.clientHeight, 0.01, 50);
    camera.rotation.order = 'YXZ';
    cameraRef.current = camera;

    // Panorama sphere (inside surface).
    // Radius 10 = 10 m in WebXR scale. Keeping it at human-room scale prevents
    // the VR depth-reprojection system from placing the surface at "infinity",
    // which otherwise makes every object in the panorama look enormous.
    const geo  = new THREE.SphereGeometry(10, 64, 32);
    const mat  = new THREE.MeshBasicMaterial({ color: 0x111119, side: THREE.BackSide });
    const mesh = new THREE.Mesh(geo, mat);
    threeScene.add(mesh);
    sphereRef.current = mesh;

    // ── WebXR controllers ─────────────────────────────────────────────
    const raycaster   = new THREE.Raycaster();
    const tmpMat      = new THREE.Matrix4();

    // Helper: make a visible ray beam (thin cylinder — WebGL ignores linewidth > 1)
    const makeRay = (color: number) => {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false });
      // 2 m beam; the raycaster still uses 500 for hotspot proximity
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.001, 2, 6), mat);
      mesh.position.set(0, 0, -1);   // centred 1 m in front of controller
      mesh.rotation.x = Math.PI / 2; // align cylinder with -Z axis
      return mesh;
    };

    // ── Left controller panel (popup) ─────────────────────────────────
    const PW = 0.22, PH = 0.28;           // panel dimensions (metres)
    const PX = 512,  PY = Math.round(512 * PH / PW);  // canvas resolution
    const ROWS_VISIBLE = 5;

    let panelOpen    = false;
    let panelTab: 'scenes' | 'floorplan' = 'scenes';
    let panelScroll  = 0;               // first visible scene index
    let audioMuted   = false;
    let prevSqueeze  = false;           // for edge detection
    let hoveredAction: string | null = null;  // button under right-ray cursor
    let pressedAction: string | null = null;  // button being pressed (flash)
    let fpDetailId:   string | null = null;   // floor plan open in detail view
    const fpImgCache = new Map<string, HTMLImageElement>(); // floor plan image cache

    // Panel canvas + mesh
    const panelCvs = document.createElement('canvas');
    panelCvs.width = PX; panelCvs.height = PY;
    const panelTex = new THREE.CanvasTexture(panelCvs);
    const panelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(PW, PH),
      new THREE.MeshBasicMaterial({ map: panelTex, transparent: true, side: THREE.DoubleSide, depthTest: false }),
    );
    panelMesh.visible = false;
    // Floats in front of and above the left controller
    panelMesh.position.set(0.01, 0.18, -0.08);
    panelMesh.rotation.x = -0.4;
    panelMesh.userData.isPanel = true;

    // All interactive meshes inside the panel (rebuilt each redraw)
    type PanelBtn = { mesh: THREE.Mesh; action: string };
    let panelBtns: PanelBtn[] = [];
    const panelGroup = new THREE.Group();
    panelGroup.add(panelMesh);

    // Canvas drawing helpers
    const pc = panelCvs.getContext('2d')!;
    const fillRR = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
      pc.fillStyle = fill; pc.beginPath(); pc.roundRect(x, y, w, h, r); pc.fill();
    };
    const strokeRR = (x: number, y: number, w: number, h: number, r: number, stroke: string, lw: number) => {
      pc.strokeStyle = stroke; pc.lineWidth = lw; pc.beginPath(); pc.roundRect(x, y, w, h, r); pc.stroke();
    };

    // Build an invisible hit-test plane for each row/button, parented to panelMesh
    const makePanelHitPlane = (nx: number, ny: number, nw: number, nh: number, action: string): THREE.Mesh => {
      // nx,ny,nw,nh are 0-1 normalised positions on the panel canvas
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(nw * PW, nh * PH),
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide, depthTest: false }),
      );
      mesh.position.set((nx + nw / 2 - 0.5) * PW, -(ny + nh / 2 - 0.5) * PH, 0.002);
      mesh.userData.action = action;
      panelMesh.add(mesh);
      return mesh;
    };

    // ── Helpers for drawing floor plan markers ─────────────────────────
    const getFpImage = (fp: { id: string; imageUrl: string }): HTMLImageElement | null => {
      if (fpImgCache.has(fp.id)) return fpImgCache.get(fp.id)!;
      const img = new window.Image() as HTMLImageElement;
      img.src = fp.imageUrl;
      // Data URLs decode synchronously — img.complete is true immediately
      if (img.complete) { fpImgCache.set(fp.id, img); return img; }
      // Network URLs: redraw once loaded, but defer with setTimeout to avoid
      // re-entering redrawPanel before the current call has finished
      img.onload  = () => { fpImgCache.set(fp.id, img); setTimeout(redrawPanel, 0); };
      img.onerror = () => { fpImgCache.set(fp.id, img); }; // cache even on error
      return null;
    };

    let panelRedrawing = false;
    const redrawPanel = () => {
      if (panelRedrawing) return;
      panelRedrawing = true;
      try { _redrawPanel(); } finally { panelRedrawing = false; }
    };
    const _redrawPanel = () => {
      const allSc    = scenesRef.current;
      const activeSc = sceneRef.current;
      pc.clearRect(0, 0, PX, PY);

      // Background
      fillRR(0, 0, PX, PY, 24, 'rgba(14,14,22,0.96)');
      strokeRR(1, 1, PX - 2, PY - 2, 23, 'rgba(224,123,63,0.6)', 3);

      // ── Tab bar ──────────────────────────────────────────────────────
      const tabBarH = PY * 0.10;
      const tabBarY = PY * 0.0;
      const tabW    = PX * 0.47;
      const tabGap  = PX * 0.02;
      const tabs = [
        { label: '📍 Scenes',    key: 'scenes'    as const },
        { label: '🗺 Floor Plan', key: 'floorplan' as const },
      ];
      tabs.forEach((t, i) => {
        const tx      = PX * 0.02 + i * (tabW + tabGap);
        const active  = panelTab === t.key;
        const hovered = hoveredAction === `tab:${t.key}`;
        const pressed = pressedAction === `tab:${t.key}`;
        fillRR(tx, tabBarY + PY * 0.01, tabW, tabBarH * 0.82, 10,
          pressed ? 'rgba(224,123,63,0.55)' :
          hovered ? 'rgba(224,123,63,0.38)' :
          active  ? 'rgba(224,123,63,0.28)' : 'rgba(255,255,255,0.05)');
        strokeRR(tx, tabBarY + PY * 0.01, tabW, tabBarH * 0.82, 10,
          (active || hovered || pressed) ? '#e07b3f' : 'rgba(255,255,255,0.12)',
          pressed ? 3 : active ? 2 : hovered ? 2 : 1);
        pc.fillStyle = (active || hovered || pressed) ? '#e07b3f' : 'rgba(224,221,216,0.55)';
        pc.font = `${(active || hovered) ? 'bold ' : ''}${PX * 0.042}px Inter,sans-serif`;
        pc.textAlign = 'center'; pc.textBaseline = 'middle';
        pc.fillText(t.label, tx + tabW / 2, tabBarY + tabBarH * 0.45);
      });

      // Separator
      pc.strokeStyle = 'rgba(224,123,63,0.25)'; pc.lineWidth = 1;
      pc.beginPath(); pc.moveTo(PX * 0.03, tabBarH); pc.lineTo(PX * 0.97, tabBarH); pc.stroke();

      const contentTop = tabBarH + PY * 0.01;

      // Rebuild hit planes — dispose GPU resources from previous draw
      panelBtns.forEach(b => {
        panelMesh.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.MeshBasicMaterial).dispose();
      });
      panelBtns = [];
      // Tab buttons always present
      tabs.forEach((t, i) => {
        const nx = 0.02 + i * ((0.47 + 0.02));
        panelBtns.push({ mesh: makePanelHitPlane(nx, 0.01, 0.47, tabBarH / PY * 0.82, `tab:${t.key}`), action: `tab:${t.key}` });
      });

      // ── SCENES tab ───────────────────────────────────────────────────
      if (panelTab === 'scenes') {
        // Scene count label
        pc.fillStyle = 'rgba(224,221,216,0.45)';
        pc.font = `${PX * 0.038}px Inter,sans-serif`;
        pc.textAlign = 'right'; pc.textBaseline = 'middle';
        pc.fillText(`${allSc.findIndex(s => s.id === activeSc?.id) + 1} / ${allSc.length}`, PX * 0.97, contentTop + PY * 0.025);

        const rowH    = PY * 0.107;
        const rowTop  = contentTop + PY * 0.05;
        const visible = allSc.slice(panelScroll, panelScroll + ROWS_VISIBLE);
        visible.forEach((sc, i) => {
          const isActive  = sc.id === activeSc?.id;
          const isHovered = hoveredAction === `scene:${sc.id}`;
          const isPressed = pressedAction === `scene:${sc.id}`;
          const y = rowTop + i * (rowH + PY * 0.012);
          // Background
          if (isPressed)      fillRR(PX * 0.03, y, PX * 0.94, rowH, 10, 'rgba(255,255,255,0.18)');
          else if (isActive)  fillRR(PX * 0.03, y, PX * 0.94, rowH, 10, 'rgba(224,123,63,0.22)');
          else if (isHovered) fillRR(PX * 0.03, y, PX * 0.94, rowH, 10, 'rgba(255,255,255,0.08)');
          // Border
          strokeRR(PX * 0.03, y, PX * 0.94, rowH, 10,
            isPressed ? '#fff' : isActive ? '#e07b3f' : isHovered ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.08)',
            isPressed ? 2.5 : isActive ? 2.5 : isHovered ? 1.5 : 1);
          // Index pill
          fillRR(PX * 0.055, y + rowH * 0.2, PX * 0.09, rowH * 0.6, 6,
            isPressed ? '#fff' : isActive ? '#e07b3f' : isHovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)');
          pc.fillStyle = (isActive || isHovered || isPressed) ? (isPressed ? '#222' : '#fff') : 'rgba(224,221,216,0.6)';
          pc.font = `bold ${PX * 0.042}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          pc.fillText(String(panelScroll + i + 1), PX * 0.1, y + rowH * 0.5);
          // Name
          pc.fillStyle = isPressed ? '#222' : (isActive || isHovered) ? '#fff' : 'rgba(224,221,216,0.85)';
          pc.font = `${(isActive || isHovered || isPressed) ? 'bold ' : ''}${PX * 0.042}px Inter,sans-serif`;
          pc.textAlign = 'left'; pc.textBaseline = 'middle';
          const maxW = PX * 0.72;
          let name = sc.name;
          while (pc.measureText(name).width > maxW && name.length > 3) name = name.slice(0, -2) + '…';
          pc.fillText(name, PX * 0.175, y + rowH * 0.5);
          const rowNY = (rowTop + i * (rowH + PY * 0.012)) / PY;
          panelBtns.push({ mesh: makePanelHitPlane(0.03, rowNY, 0.94, rowH / PY, `scene:${sc.id}`), action: `scene:${sc.id}` });
        });

        const arrowY  = rowTop + ROWS_VISIBLE * (rowH + PY * 0.012) + PY * 0.01;
        const canUp   = panelScroll > 0;
        const canDown = panelScroll + ROWS_VISIBLE < allSc.length;
        const upHov   = hoveredAction === 'scrollUp',   upPrs  = pressedAction === 'scrollUp';
        const dnHov   = hoveredAction === 'scrollDown', dnPrs  = pressedAction === 'scrollDown';
        fillRR(PX * 0.03, arrowY, PX * 0.44, PY * 0.06, 10,
          upPrs ? 'rgba(255,255,255,0.22)' : upHov ? 'rgba(224,123,63,0.3)' : canUp ? 'rgba(224,123,63,0.18)' : 'rgba(255,255,255,0.04)');
        fillRR(PX * 0.53, arrowY, PX * 0.44, PY * 0.06, 10,
          dnPrs ? 'rgba(255,255,255,0.22)' : dnHov ? 'rgba(224,123,63,0.3)' : canDown ? 'rgba(224,123,63,0.18)' : 'rgba(255,255,255,0.04)');
        pc.font = `bold ${PX * 0.05}px Inter,sans-serif`; pc.textAlign = 'center'; pc.textBaseline = 'middle';
        pc.fillStyle = upPrs ? '#fff' : canUp ? '#e07b3f' : 'rgba(255,255,255,0.2)'; pc.fillText('▲', PX * 0.25, arrowY + PY * 0.03);
        pc.fillStyle = dnPrs ? '#fff' : canDown ? '#e07b3f' : 'rgba(255,255,255,0.2)'; pc.fillText('▼', PX * 0.75, arrowY + PY * 0.03);
        const arrowNY = arrowY / PY;
        panelBtns.push({ mesh: makePanelHitPlane(0.03, arrowNY, 0.44, 0.06, 'scrollUp'),   action: 'scrollUp' });
        panelBtns.push({ mesh: makePanelHitPlane(0.53, arrowNY, 0.44, 0.06, 'scrollDown'), action: 'scrollDown' });

        const footerY  = arrowY + PY * 0.08;
        const footBtns = [
          { label: '⟳ Reset', col: '#3bbfb5', action: 'reset' },
          { label: audioMuted ? '🔇 Unmute' : '🔊 Mute', col: '#3bbfb5', action: 'mute' },
          { label: '✕ Exit',  col: '#e05454', action: 'exit'  },
        ];
        const fbW = (PX * 0.94 - 2 * PX * 0.02) / 3;
        footBtns.forEach((fb, i) => {
          const fx  = PX * 0.03 + i * (fbW + PX * 0.02);
          const fHov = hoveredAction === fb.action;
          const fPrs = pressedAction === fb.action;
          fillRR(fx, footerY, fbW, PY * 0.065, 10,
            fPrs ? fb.col + 'cc' : fHov ? fb.col + '55' : fb.col + '22');
          strokeRR(fx, footerY, fbW, PY * 0.065, 10, fb.col, fPrs ? 2.5 : fHov ? 2 : 1.5);
          pc.fillStyle = fPrs ? '#fff' : fb.col;
          pc.font = `bold ${PX * 0.036}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          pc.fillText(fb.label, fx + fbW / 2, footerY + PY * 0.032);
          const nw = (0.94 - 2 * 0.02) / 3;
          const nx = 0.03 + i * (nw + 0.02);
          panelBtns.push({ mesh: makePanelHitPlane(nx, footerY / PY, nw, 0.065, fb.action), action: fb.action });
        });
      }

      // ── FLOOR PLAN tab ───────────────────────────────────────────────
      if (panelTab === 'floorplan') {
        const allFp   = floorPlansRef.current;
        const detailFp = allFp.find(f => f.id === fpDetailId) ?? null;

        if (allFp.length === 0) {
          // Empty state
          pc.fillStyle = 'rgba(224,221,216,0.4)';
          pc.font = `${PX * 0.044}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          pc.fillText('No floor plans added', PX / 2, contentTop + (PY - contentTop) / 2);

        } else if (!detailFp) {
          // ── List view: show uploaded floor plans ───────────────────────
          pc.fillStyle = 'rgba(224,221,216,0.5)';
          pc.font = `${PX * 0.036}px Inter,sans-serif`;
          pc.textAlign = 'left'; pc.textBaseline = 'middle';
          pc.fillText('Select a floor plan', PX * 0.05, contentTop + PY * 0.03);

          const rowH  = PY * 0.115;
          const rowGap = PY * 0.014;
          allFp.forEach((fp, i) => {
            const y   = contentTop + PY * 0.07 + i * (rowH + rowGap);
            const act = hoveredAction === `fp-detail:${fp.id}`;
            const prs = pressedAction === `fp-detail:${fp.id}`;
            const hasMark = fp.markers.some(m => allSc.find(s => s.id === m.sceneId)?.id === activeSc?.id);
            fillRR(PX * 0.04, y, PX * 0.92, rowH, 10,
              prs ? 'rgba(59,191,181,0.45)' : act ? 'rgba(59,191,181,0.2)' : 'rgba(255,255,255,0.05)');
            strokeRR(PX * 0.04, y, PX * 0.92, rowH, 10,
              prs ? '#3bbfb5' : act ? '#3bbfb5' : 'rgba(255,255,255,0.1)', prs ? 2.5 : act ? 2 : 1);
            // Floor icon
            pc.fillStyle = '#3bbfb5';
            pc.font = `bold ${PX * 0.05}px Inter,sans-serif`;
            pc.textAlign = 'center'; pc.textBaseline = 'middle';
            pc.fillText('🗺', PX * 0.11, y + rowH * 0.5);
            // Name
            pc.fillStyle = act || prs ? '#fff' : 'rgba(224,221,216,0.9)';
            pc.font = `${act || prs ? 'bold ' : ''}${PX * 0.044}px Inter,sans-serif`;
            pc.textAlign = 'left'; pc.textBaseline = 'middle';
            let nm = fp.name;
            while (pc.measureText(nm).width > PX * 0.55 && nm.length > 3) nm = nm.slice(0, -2) + '…';
            pc.fillText(nm, PX * 0.18, y + rowH * 0.38);
            // Marker count
            pc.fillStyle = 'rgba(224,221,216,0.4)';
            pc.font = `${PX * 0.033}px Inter,sans-serif`;
            pc.fillText(`${fp.markers.length} location${fp.markers.length !== 1 ? 's' : ''}`, PX * 0.18, y + rowH * 0.68);
            // "You are here" indicator
            if (hasMark) {
              fillRR(PX * 0.72, y + rowH * 0.22, PX * 0.195, rowH * 0.56, 6, 'rgba(224,123,63,0.25)');
              pc.fillStyle = '#e07b3f'; pc.font = `bold ${PX * 0.03}px Inter,sans-serif`;
              pc.textAlign = 'center'; pc.textBaseline = 'middle';
              pc.fillText('📍 Here', PX * 0.815, y + rowH * 0.5);
            }
            panelBtns.push({ mesh: makePanelHitPlane(0.04, y / PY, 0.92, rowH / PY, `fp-detail:${fp.id}`), action: `fp-detail:${fp.id}` });
          });

        } else {
          // ── Detail view: show floor plan image with markers ────────────
          // Scale the panel bigger when in detail view
          panelMesh.scale.set(1.25, 1.4, 1);

          // Header: back button + prev/next floor plan arrows + name
          const hdrH = PY * 0.09;
          const fpIdx  = allFp.findIndex(f => f.id === fpDetailId);
          const hasPrev = fpIdx > 0;
          const hasNext = fpIdx < allFp.length - 1;

          const bkHov = hoveredAction === 'fp-back', bkPrs = pressedAction === 'fp-back';
          fillRR(PX * 0.03, contentTop + PY * 0.005, PX * 0.18, hdrH * 0.78, 8,
            bkPrs ? 'rgba(255,255,255,0.25)' : bkHov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)');
          pc.fillStyle = bkPrs ? '#fff' : 'rgba(224,221,216,0.7)';
          pc.font = `bold ${PX * 0.038}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          pc.fillText('‹ Back', PX * 0.12, contentTop + hdrH * 0.44);
          panelBtns.push({ mesh: makePanelHitPlane(0.03, (contentTop + PY * 0.005) / PY, 0.18, hdrH * 0.78 / PY, 'fp-back'), action: 'fp-back' });

          // Prev arrow
          const pvHov = hoveredAction === 'fp-prev', pvPrs = pressedAction === 'fp-prev';
          fillRR(PX * 0.23, contentTop + PY * 0.005, PX * 0.1, hdrH * 0.78, 6,
            !hasPrev ? 'rgba(255,255,255,0.02)' : pvPrs ? 'rgba(59,191,181,0.45)' : pvHov ? 'rgba(59,191,181,0.2)' : 'rgba(255,255,255,0.06)');
          pc.fillStyle = !hasPrev ? 'rgba(255,255,255,0.15)' : pvPrs || pvHov ? '#3bbfb5' : 'rgba(224,221,216,0.7)';
          pc.font = `bold ${PX * 0.045}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          pc.fillText('◀', PX * 0.28, contentTop + hdrH * 0.44);
          if (hasPrev) panelBtns.push({ mesh: makePanelHitPlane(0.23, (contentTop + PY * 0.005) / PY, 0.1, hdrH * 0.78 / PY, 'fp-prev'), action: 'fp-prev' });

          // Floor plan name (center)
          pc.fillStyle = '#3bbfb5';
          pc.font = `bold ${PX * 0.038}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          let hdrName = detailFp.name;
          while (pc.measureText(hdrName).width > PX * 0.36 && hdrName.length > 3) hdrName = hdrName.slice(0, -2) + '…';
          pc.fillText(hdrName, PX * 0.5, contentTop + hdrH * 0.44);

          // Next arrow
          const nxHov = hoveredAction === 'fp-next', nxPrs = pressedAction === 'fp-next';
          fillRR(PX * 0.67, contentTop + PY * 0.005, PX * 0.1, hdrH * 0.78, 6,
            !hasNext ? 'rgba(255,255,255,0.02)' : nxPrs ? 'rgba(59,191,181,0.45)' : nxHov ? 'rgba(59,191,181,0.2)' : 'rgba(255,255,255,0.06)');
          pc.fillStyle = !hasNext ? 'rgba(255,255,255,0.15)' : nxPrs || nxHov ? '#3bbfb5' : 'rgba(224,221,216,0.7)';
          pc.font = `bold ${PX * 0.045}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          pc.fillText('▶', PX * 0.72, contentTop + hdrH * 0.44);
          if (hasNext) panelBtns.push({ mesh: makePanelHitPlane(0.67, (contentTop + PY * 0.005) / PY, 0.1, hdrH * 0.78 / PY, 'fp-next'), action: 'fp-next' });

          // Image area
          const imgPad   = PX * 0.03;
          const imgAreaX = imgPad;
          const imgAreaY = contentTop + hdrH + PY * 0.01;
          const imgAreaW = PX - imgPad * 2;
          const footerH  = PY * 0.075;
          const imgAreaH = PY - imgAreaY - footerH - PY * 0.01;
          strokeRR(imgAreaX, imgAreaY, imgAreaW, imgAreaH, 10, 'rgba(59,191,181,0.4)', 1.5);

          const img = getFpImage(detailFp);
          if (img) {
            const sc2img = Math.min(imgAreaW / img.width, imgAreaH / img.height);
            const dw = img.width  * sc2img;
            const dh = img.height * sc2img;
            const dx = imgAreaX + (imgAreaW - dw) / 2;
            const dy = imgAreaY + (imgAreaH - dh) / 2;
            pc.save();
            pc.beginPath(); pc.roundRect(imgAreaX, imgAreaY, imgAreaW, imgAreaH, 10); pc.clip();
            pc.drawImage(img, dx, dy, dw, dh);
            pc.restore();

            // Markers with name tags
            for (const marker of detailFp.markers) {
              const sc = allSc.find(s => s.id === marker.sceneId);
              if (!sc) continue;
              const mx = dx + marker.x * dw;
              const my = dy + marker.y * dh;
              const isAct = sc.id === activeSc?.id;
              const isHov = hoveredAction === `scene:${sc.id}`;
              const isPrs = pressedAction === `scene:${sc.id}`;
              const r = isAct ? 11 : isHov || isPrs ? 10 : 8;
              const dotColor = isAct ? '#e07b3f' : isPrs ? '#fff' : isHov ? '#7fe8e2' : '#3bbfb5';
              // Outer glow
              pc.beginPath(); pc.arc(mx, my, r + 5, 0, Math.PI * 2);
              pc.fillStyle = isAct ? 'rgba(224,123,63,0.35)' : isPrs ? 'rgba(59,191,181,0.55)' : isHov ? 'rgba(59,191,181,0.4)' : 'rgba(59,191,181,0.25)'; pc.fill();
              pc.beginPath(); pc.arc(mx, my, r, 0, Math.PI * 2);
              pc.fillStyle = dotColor; pc.fill();
              if (isAct) {
                pc.save(); pc.translate(mx, my); pc.rotate(-yawRef.current);
                pc.fillStyle = '#fff'; pc.beginPath();
                pc.moveTo(0, -r + 2); pc.lineTo(-3, 2); pc.lineTo(3, 2); pc.closePath(); pc.fill();
                pc.restore();
              } else {
                pc.fillStyle = isHov || isPrs ? '#003a38' : '#fff';
                pc.font = `bold ${r * 1.2}px Inter,sans-serif`;
                pc.textAlign = 'center'; pc.textBaseline = 'middle';
                pc.fillText(String(allSc.findIndex(s => s.id === sc.id) + 1), mx, my);
              }
              // Name tag
              const tagFz = 13;
              pc.font = `bold ${tagFz}px Inter,sans-serif`;
              let tagTxt = sc.name;
              while (pc.measureText(tagTxt).width > 106 && tagTxt.length > 3) tagTxt = tagTxt.slice(0, -2) + '…';
              const tagW = pc.measureText(tagTxt).width + 14;
              const tagH = tagFz + 8;
              const tagX = Math.max(imgAreaX + 2, Math.min(imgAreaX + imgAreaW - tagW - 2, mx - tagW / 2));
              const tagY = my + r + 5;
              fillRR(tagX, tagY, tagW, tagH, 4,
                isAct ? 'rgba(224,123,63,0.88)' : isPrs ? 'rgba(59,191,181,0.9)' : isHov ? 'rgba(59,191,181,0.65)' : 'rgba(20,20,32,0.82)');
              strokeRR(tagX, tagY, tagW, tagH, 4, dotColor, isPrs || isHov ? 2 : 1);
              pc.fillStyle = isAct || isPrs || isHov ? '#fff' : dotColor;
              pc.font = `bold ${tagFz}px Inter,sans-serif`;
              pc.textAlign = 'center'; pc.textBaseline = 'middle';
              pc.fillText(tagTxt, tagX + tagW / 2, tagY + tagH / 2);
              // Hit plane
              const hl = Math.min(mx - r - 4, tagX), hr = Math.max(mx + r + 4, tagX + tagW);
              if (!isAct) panelBtns.push({ mesh: makePanelHitPlane(hl / PX, (my - r - 4) / PY, (hr - hl) / PX, (tagY + tagH + 2 - (my - r - 4)) / PY, `scene:${sc.id}`), action: `scene:${sc.id}` });
            }
          } else {
            pc.fillStyle = 'rgba(224,221,216,0.3)'; pc.font = `${PX * 0.04}px Inter,sans-serif`;
            pc.textAlign = 'center'; pc.textBaseline = 'middle';
            pc.fillText('Loading…', imgAreaX + imgAreaW / 2, imgAreaY + imgAreaH / 2);
          }

          // Footer: exit VR
          const footY  = PY - footerH;
          const exitHov = hoveredAction === 'exit', exitPrs = pressedAction === 'exit';
          fillRR(PX * 0.69, footY, PX * 0.28, footerH * 0.78, 8, exitPrs ? '#e05454cc' : exitHov ? '#e0545455' : '#e0545422');
          strokeRR(PX * 0.69, footY, PX * 0.28, footerH * 0.78, 8, '#e05454', exitPrs ? 2.5 : 1.5);
          pc.fillStyle = exitPrs ? '#fff' : '#e05454'; pc.font = `bold ${PX * 0.036}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          pc.fillText('✕ Exit VR', PX * 0.69 + PX * 0.14, footY + footerH * 0.39);
          panelBtns.push({ mesh: makePanelHitPlane(0.69, footY / PY, 0.28, footerH * 0.78 / PY, 'exit'), action: 'exit' });
        }

        // Reset panel scale when not in detail view
        if (!detailFp) panelMesh.scale.set(1, 1, 1);
      }

      panelTex.needsUpdate = true;
    };

    const activatePanelAction = (action: string) => {
      // Flash pressed state, then execute after short delay
      pressedAction = action;
      hoveredAction = null;
      redrawPanel();
      setTimeout(() => {
        pressedAction = null;
        if (action.startsWith('scene:')) {
          setActiveSceneRef.current(action.slice(6));
          panelOpen = false;
          panelMesh.visible = false;
          return;
        }
        if (action.startsWith('tab:')) {
          panelTab = action.slice(4) as 'scenes' | 'floorplan';
          fpDetailId = null;
          panelMesh.scale.set(1, 1, 1);
          redrawPanel(); return;
        }
        if (action.startsWith('fp:')) {
          setActiveFloorPlanRef.current(action.slice(3));
          redrawPanel(); return;
        }
        if (action.startsWith('fp-detail:')) {
          fpDetailId = action.slice(10);
          redrawPanel(); return;
        }
        if (action === 'fp-back') {
          fpDetailId = null;
          panelMesh.scale.set(1, 1, 1);
          redrawPanel(); return;
        }
        if (action === 'fp-prev' || action === 'fp-next') {
          const allFp = floorPlansRef.current;
          const idx = allFp.findIndex(f => f.id === fpDetailId);
          if (action === 'fp-prev' && idx > 0) fpDetailId = allFp[idx - 1].id;
          if (action === 'fp-next' && idx < allFp.length - 1) fpDetailId = allFp[idx + 1].id;
          redrawPanel(); return;
        }
        switch (action) {
          case 'scrollUp':
            panelScroll = Math.max(0, panelScroll - 1);
            redrawPanel(); break;
          case 'scrollDown':
            panelScroll = Math.min(Math.max(0, scenesRef.current.length - ROWS_VISIBLE), panelScroll + 1);
            redrawPanel(); break;
          case 'reset': {
            const sc = sceneRef.current;
            if (sc) { yawRef.current = sc.initialYaw; pitchRef.current = sc.initialPitch; }
            redrawPanel(); break;
          }
          case 'mute':
            audioMuted = !audioMuted;
            audioElemsRef.current.forEach(a => { a.muted = audioMuted; });
            audioGainsRef.current.forEach(g => { g.gain.value = audioMuted ? 0 : (g as any)._baseVol ?? 1; });
            redrawPanel(); break;
          case 'exit':
            renderer.xr.getSession()?.end();
            break;
        }
      }, 130);
    };

    // ── Set up left (0) and right (1) controllers ──────────────────────
    // Absolute URL avoids path resolution issues inside the XR frame.
    // No trailing slash — fetchProfile constructs its own slash separator.
    const xrProfilesBase = window.location.href.replace(/\/[^/]*$/, '') + '/xr-profiles';
    const controllerModelFactory = new XRControllerModelFactory();
    controllerModelFactory.path  = xrProfilesBase;
    const handModelFactory = new XRHandModelFactory();

    const leftCtrl  = renderer.xr.getController(0);
    const rightCtrl = renderer.xr.getController(1);

    // Left: orange ray + wrist panel
    leftCtrl.add(makeRay(0xe07b3f));
    leftCtrl.add(panelGroup);
    threeScene.add(leftCtrl);

    // Right: teal ray — primary interaction
    rightCtrl.add(makeRay(0x3bbfb5));
    threeScene.add(rightCtrl);

    // Grip spaces — real Quest 3 Touch Plus GLB models
    const leftGrip  = renderer.xr.getControllerGrip(0);
    const rightGrip = renderer.xr.getControllerGrip(1);
    leftGrip.add(controllerModelFactory.createControllerModel(leftGrip));
    rightGrip.add(controllerModelFactory.createControllerModel(rightGrip));
    threeScene.add(leftGrip);
    threeScene.add(rightGrip);

    // Hand spaces — 'spheres' profile uses Three.js geometry (offline)
    const leftHand  = renderer.xr.getHand(0);
    const rightHand = renderer.xr.getHand(1);
    leftHand.add(handModelFactory.createHandModel(leftHand, 'spheres'));
    rightHand.add(handModelFactory.createHandModel(rightHand, 'spheres'));
    threeScene.add(leftHand);
    threeScene.add(rightHand);

    // Right trigger → interact with panel buttons OR scene hotspots
    rightCtrl.addEventListener('select', () => {
      tmpMat.identity().extractRotation(rightCtrl.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(rightCtrl.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat).normalize();

      // Panel buttons (when open)
      if (panelOpen && panelBtns.length > 0) {
        const hits = raycaster.intersectObjects(panelBtns.map(b => b.mesh));
        if (hits.length > 0) {
          activatePanelAction(hits[0].object.userData.action as string);
          return;
        }
      }

      // Scene hotspot navigation
      const sc = sceneRef.current;
      if (!sc) return;
      const origin = raycaster.ray.origin.clone();
      const dir    = raycaster.ray.direction.clone();
      let best: { hs: typeof sc.hotspots[0]; proj: number } | null = null;
      for (const hs of sc.hotspots) {
        const wp  = yawPitchToWorld(hs.yaw, hs.pitch);
        const pos = new THREE.Vector3(wp.x, wp.y, wp.z).normalize().multiplyScalar(490);
        const toP = pos.clone().sub(origin);
        const proj = toP.dot(dir);
        const dist = toP.clone().sub(dir.clone().multiplyScalar(proj)).length();
        if (dist < 35 && (!best || proj > best.proj)) best = { hs, proj };
      }
      if (best) onHotspotClickRef.current(best.hs);
    });

    // Left squeeze (grip) → toggle panel
    // Detected in animate loop via gamepad API
    const updateBtnHover = () => {
      if (!renderer.xr.isPresenting) return;

      // Left squeeze: toggle panel on press edge
      const session = renderer.xr.getSession();
      if (session) {
        for (const src of session.inputSources) {
          if (src.handedness === 'left' && src.gamepad) {
            const squeeze = src.gamepad.buttons[1]?.pressed ?? false;
            if (squeeze && !prevSqueeze) {
              panelOpen = !panelOpen;
              panelMesh.visible = panelOpen;
              if (panelOpen) {
                panelScroll = Math.max(0, (scenesRef.current.findIndex(s => s.id === sceneRef.current?.id) ?? 0) - 1);
                redrawPanel();
              } else {
                fpDetailId = null;
                panelMesh.scale.set(1, 1, 1);
              }
            }
            prevSqueeze = squeeze;
          }
        }
      }

      // Hover highlight: right controller ray over panel buttons
      if (panelOpen && panelBtns.length > 0) {
        tmpMat.identity().extractRotation(rightCtrl.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(rightCtrl.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat).normalize();
        const hits      = raycaster.intersectObjects(panelBtns.map(b => b.mesh));
        const hitAction = hits[0]?.object.userData.action ?? null;
        if (hitAction !== hoveredAction) {
          hoveredAction = hitAction;
          redrawPanel();
        }
      } else if (hoveredAction !== null) {
        hoveredAction = null;
        if (panelOpen) redrawPanel();
      }
    };

    // Animation loop (setAnimationLoop required for WebXR)
    let frame = 0;
    const animate = () => {
      frame++;

      const cam = cameraRef.current!;
      cam.rotation.y = -yawRef.current;
      cam.rotation.x = pitchRef.current;
      cam.fov = fovRef.current;
      cam.updateProjectionMatrix();

      // Update video texture every frame
      if (videoElRef.current && textureRef.current) {
        (textureRef.current as THREE.VideoTexture).needsUpdate = true;
      }

      // Imperatively update hotspot/media overlay positions every frame
      const w = container.clientWidth;
      const h = container.clientHeight;
      const sc = sceneRef.current;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      if (sc) {
        for (const hs of (sc.hotspots ?? [])) {
          const el = hotspotContainersRef.current.get(hs.id);
          if (!el) continue;
          // use dragging override position if active
          const pos = draggingHotspotRef.current?.id === hs.id ? draggingHotspotRef.current : hs;
          const wp = yawPitchToWorld(pos.yaw, pos.pitch);
          const v = new THREE.Vector3(wp.x, wp.y, wp.z);
          const proj = v.clone().project(cam);
          const visible = forward.dot(v.normalize()) > 0.15;
          const x = (proj.x + 1) / 2 * w;
          const y = (1 - proj.y) / 2 * h;
          el.style.transform = `translate3d(${x}px,${y}px,0)`;
          el.style.opacity = visible ? '1' : '0';
          el.style.pointerEvents = visible ? 'auto' : 'none';
        }
        for (const mp of (sc.mediaPoints ?? [])) {
          const el = mediaContainersRef.current.get(mp.id);
          if (!el) continue;
          const wp = yawPitchToWorld(mp.yaw, mp.pitch);
          const v = new THREE.Vector3(wp.x, wp.y, wp.z);
          const proj = v.clone().project(cam);
          const visible = forward.dot(v.normalize()) > 0.15;
          const x = (proj.x + 1) / 2 * w;
          const y = (1 - proj.y) / 2 * h;
          el.style.transform = `translate3d(${x}px,${y}px,0)`;
          el.style.opacity = visible ? '1' : '0';
          el.style.pointerEvents = visible ? 'auto' : 'none';
        }
        if (frame % 10 === 0) setMinimapYaw(yawRef.current);
      }

      // In VR, keep the panorama sphere centred on the user's head so the
      // local-floor reference space offset doesn't shift the viewer away from
      // the sphere's centre (which would make the panorama look magnified).
      if (renderer.xr.isPresenting && sphereRef.current) {
        sphereRef.current.position.copy(renderer.xr.getCamera().position);
      }

      // Update wrist menu button hover highlight every 3 frames
      if (frame % 3 === 0 && renderer.xr.isPresenting) updateBtnHover();

      renderer.render(threeScene, cam);
    };
    renderer.setAnimationLoop(animate);

    // Resize observer
    const ro = new ResizeObserver(() => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      if (cameraRef.current) {
        cameraRef.current.aspect = container.clientWidth / container.clientHeight;
        cameraRef.current.updateProjectionMatrix();
      }
    });
    ro.observe(container);

    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── 3D hotspot sprites for WebXR — same icons as 2D overlay ──────────
  useEffect(() => {
    const threeScene = threeSceneRef.current;
    if (!threeScene || !scene) return;

    // Remove old markers
    const old = threeScene.children.filter(c => c.userData.vrHotspot);
    old.forEach(c => { (c as THREE.Sprite).material?.map?.dispose(); threeScene.remove(c); });

    for (const hs of scene.hotspots) {
      const wp  = yawPitchToWorld(hs.yaw, hs.pitch);
      const pos = new THREE.Vector3(wp.x, wp.y, wp.z).normalize().multiplyScalar(470);

      // Sprite with the same icon as the 2D hotspot button
      const tex  = makeHotspotCanvasTexture(hs.iconStyle);
      const mat  = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.scale.set(38, 38, 1);
      sprite.userData.vrHotspot = true;
      sprite.userData.hotspotId = hs.id;
      threeScene.add(sprite);
    }

    return () => {
      const markers = threeScene.children.filter(c => c.userData.vrHotspot);
      markers.forEach(c => { (c as THREE.Sprite).material?.map?.dispose(); threeScene.remove(c); });
    };
  }, [scene?.id, scene?.hotspots]);

  // ── Scene audio playback ──────────────────────────────────────────────
  useEffect(() => {
    const sources = scene?.audioSources ?? [];
    if (sources.length === 0) return;

    // Browser autoplay policy: audio only works after a user gesture.
    // We attempt play() and silently ignore NotAllowedError.
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const nodes: { source: AudioBufferSourceNode | null; gain: GainNode; panner?: PannerNode }[] = [];
    const htmlEls: HTMLAudioElement[] = [];
    audioElemsRef.current = htmlEls;
    audioGainsRef.current = [];

    // Use Web Audio API for spatial, HTMLAudioElement for ambient (simpler + loopable)
    for (const as of sources) {
      if (as.type === 'spatial' && as.yaw !== undefined && as.pitch !== undefined) {
        // Spatial: positional audio via PannerNode
        const gain   = audioCtx.createGain();
        gain.gain.value = as.volume ?? 1;
        (gain as any)._baseVol = gain.gain.value;
        audioGainsRef.current.push(gain);
        const panner = audioCtx.createPanner();
        panner.panningModel   = 'HRTF';
        panner.distanceModel  = 'inverse';
        panner.refDistance    = 1;
        panner.maxDistance    = 10000;
        panner.rolloffFactor  = 1;
        // Convert yaw/pitch to 3D position (unit sphere)
        const y = (as.yaw  ?? 0) * (Math.PI / 180);
        const p = (as.pitch ?? 0) * (Math.PI / 180);
        panner.positionX.value = Math.sin(y) * Math.cos(p);
        panner.positionY.value = Math.sin(p);
        panner.positionZ.value = -Math.cos(y) * Math.cos(p);
        panner.connect(gain);
        gain.connect(audioCtx.destination);

        fetch(as.src)
          .then(r => r.arrayBuffer())
          .then(buf => audioCtx.decodeAudioData(buf))
          .then(decoded => {
            const src = audioCtx.createBufferSource();
            src.buffer = decoded;
            src.loop   = as.loop ?? false;
            src.connect(panner);
            src.start(0);
            nodes.push({ source: src, gain, panner });
          })
          .catch(console.warn);
        nodes.push({ source: null, gain, panner });
      } else {
        // Ambient: simple HTMLAudioElement
        const el = new Audio(as.src);
        el.volume = Math.min(1, Math.max(0, as.volume ?? 1));
        el.loop   = as.loop ?? false;
        el.play().catch(() => {
          // Retry on next user interaction
          const resume = () => { el.play().catch(console.warn); document.removeEventListener('pointerdown', resume); };
          document.addEventListener('pointerdown', resume, { once: true });
        });
        htmlEls.push(el);
      }
    }

    return () => {
      audioElemsRef.current = [];
      audioGainsRef.current = [];
      htmlEls.forEach(el => { el.pause(); el.src = ''; });
      nodes.forEach(n => { try { n.source?.stop(); } catch {} });
      audioCtx.close().catch(console.warn);
    };
  }, [scene?.id]);

  // ── Load texture when scene changes ───────────────────────────────────
  useEffect(() => {
    if (!sphereRef.current || !scene) return;

    // If previous scene used a fisheye shader material, restore plain material
    if (shaderMatRef.current) {
      shaderMatRef.current.dispose();
      shaderMatRef.current = null;
      sphereRef.current.material = new THREE.MeshBasicMaterial({
        color: 0x111119, side: THREE.BackSide,
      });
    }

    const mat = sphereRef.current.material as THREE.MeshBasicMaterial;

    // Cleanup previous
    if (textureRef.current) { textureRef.current.dispose(); textureRef.current = null; }
    if (videoElRef.current) { videoElRef.current.pause(); videoElRef.current.src = ''; videoElRef.current = null; }
    mat.map = null;
    mat.color.set(0x111119);
    mat.needsUpdate = true;

    // Use pending start view if switching via variant, otherwise use scene default
    const pv = useTourStore.getState().pendingStartView;
    if (pv) {
      yawRef.current   = pv.yaw;
      pitchRef.current = pv.pitch;
      useTourStore.getState().setPendingStartView(null);
    } else {
      yawRef.current   = scene.initialYaw;
      pitchRef.current = scene.initialPitch;
    }
    setActiveMedia(null);

    // Cap image to WebGL max texture size to avoid silent GPU failures on large SBS/TB panoramas
    const capImageSize = (img: HTMLImageElement): HTMLImageElement | HTMLCanvasElement => {
      const maxTex = rendererRef.current?.capabilities.maxTextureSize ?? 4096;
      if (img.naturalWidth <= maxTex && img.naturalHeight <= maxTex) return img;
      const scale = Math.min(maxTex / img.naturalWidth, maxTex / img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.floor(img.naturalWidth  * scale);
      canvas.height = Math.floor(img.naturalHeight * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas;
    };

    const applyTexture = (texture: THREE.Texture) => {
      // ── Swap geometry based on panorama format ────────────────────────
      const mesh = sphereRef.current!;
      const oldGeo = mesh.geometry;
      let newGeo: THREE.BufferGeometry;
      const ar = scene.aspectRatio ?? 2;

      switch (scene.format) {
        case 'cylindrical': {
          const height = Math.min(16, 10 / Math.max(ar, 0.5));
          newGeo = new THREE.CylinderGeometry(10, 10, height, 64, 1, true);
          break;
        }
        case 'partial':
        case 'rectilinear': {
          const hFov = ar > 1.5 ? Math.PI * 1.2 : Math.PI * 0.8;
          const vFov = hFov / Math.max(ar, 0.1);
          newGeo = new THREE.SphereGeometry(10, 48, 24,
            -hFov / 2, hFov, Math.PI / 2 - vFov / 2, vFov);
          break;
        }
        case 'vertical': {
          const vFov2 = Math.PI * 1.2;
          const hFov2 = Math.min(Math.PI * 0.5, vFov2 * (scene.aspectRatio ?? 0.4));
          newGeo = new THREE.SphereGeometry(10, 32, 48,
            -hFov2 / 2, hFov2, Math.PI / 2 - vFov2 / 2, vFov2);
          break;
        }
        default:
          newGeo = new THREE.SphereGeometry(10, 64, 32);
      }

      if (oldGeo !== newGeo) { oldGeo.dispose(); mesh.geometry = newGeo; }

      // ── Set ALL texture properties before the single needsUpdate = true ──
      texture.colorSpace = THREE.SRGBColorSpace;

      // wrapS must be RepeatWrapping for all equirectangular formats to avoid the black
      // vertical seam (ClampToEdge interpolates backwards across the full texture at u=0/u=1).
      //
      // Stereo eye selection:
      //   SBS — left eye = u[0→0.5], right eye = u[0.5→1.0]
      //   TB (image, flipY=true) — image top = left eye → UV v[0.5→1.0] after flip
      //                            image bottom = right eye → UV v[0→0.5] after flip
      //   TB (video, flipY=false) — no flip, so top = v[1→0.5], bottom = v[0.5→0]
      //                             left eye (top) → UV v[0.5→1.0]; right eye → v[0→0.5]
      //   Both image and video TB land the same way: left eye = v[0.5→1.0]
      const isRightEye = scene.stereoEye === 'right';
      switch (scene.format) {
        case 'equirectangular-sbs':
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.repeat.set(0.5, 1);
          texture.offset.set(isRightEye ? 0.5 : 0, 0);
          break;
        case 'equirectangular-tb':
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.repeat.set(1, 0.5);
          // image flipY=true: left eye → v[0.5,1.0]; right eye → v[0,0.5]
          // video flipY=false: same result because video flips y independently
          texture.offset.set(0, isRightEye ? 0 : 0.5);
          break;
        default:
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.repeat.set(1, 1);
          texture.offset.set(0, 0);
      }

      texture.updateMatrix();  // apply repeat/offset to the UV transform matrix
      texture.needsUpdate = true; // single upload with all correct settings

      textureRef.current = texture;
      mat.map = texture;
      mat.color.set(0xffffff);
      mat.side = THREE.BackSide;
      mat.needsUpdate = true;
    };

    if (scene.mediaType === 'panorama-video') {
      const video = document.createElement('video');
      video.src        = scene.imageUrl;
      video.loop       = true;
      video.muted      = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.addEventListener('canplay', () => {
        const vt = new THREE.VideoTexture(video);
        videoElRef.current = video;

        if (scene.format.startsWith('fisheye')) {
          // ── Fisheye video: GPU shader converts in real-time ─────────────
          const cfg = scene.fisheyeConfig
            ? { ...scene.fisheyeConfig }
            : fisheyeConfigFromFormat(scene.format as PanoramaFormat);
          const mesh = sphereRef.current!;
          const shaderMat = makeFisheyeShaderMaterial(cfg, video.videoWidth, video.videoHeight);
          shaderMat.uniforms.map.value = vt;
          // Ensure standard full-sphere geometry
          const oldGeo = mesh.geometry;
          const newGeo = new THREE.SphereGeometry(10, 64, 32);
          if (oldGeo !== newGeo) { oldGeo.dispose(); mesh.geometry = newGeo; }
          mesh.material = shaderMat;
          shaderMatRef.current = shaderMat;
          textureRef.current   = vt;
        } else {
          applyTexture(vt);
        }

        video.play().catch(console.warn);
      }, { once: true });
      video.load();
    } else if (scene.imageUrl) {
      const img = new window.Image() as HTMLImageElement;
      img.onload = () => {
        // ── Raw fisheye: auto-detect circles + convert to equirectangular ──
        if (scene.format.startsWith('fisheye')) {
          // Check cache to avoid re-converting on every scene switch
          const cached = fisheyeCache.get(scene.id);
          if (cached) {
            applyTexture(new THREE.Texture(cached));
            return;
          }
          // Draw into canvas; cap per-dimension at 4096 so conversion stays fast
          // while preserving enough resolution for a good 360° output (≥11 px/°).
          const MAX = 4096;
          const scale = Math.min(1, MAX / img.naturalWidth, MAX / img.naturalHeight);
          const raw = document.createElement('canvas');
          raw.width  = Math.floor(img.naturalWidth  * scale);
          raw.height = Math.floor(img.naturalHeight * scale);
          raw.getContext('2d')!.drawImage(img, 0, 0, raw.width, raw.height);
          // Use saved user config if available; otherwise auto-detect from pixels
          const cfg = scene.fisheyeConfig
            ? { ...scene.fisheyeConfig }
            : fisheyeConfigFromFormat(scene.format as PanoramaFormat);
          if (!scene.fisheyeConfig) {
            try {
              const detected = autoDetectFisheyeCircles(raw, cfg.type);
              Object.assign(cfg, detected);
            } catch { /* keep defaults on any error */ }
          }
          // Convert fisheye → equirectangular and cache
          const converted = fisheyeToEquirectangular(raw, cfg);
          fisheyeCache.set(scene.id, converted);
          applyTexture(new THREE.Texture(converted));
          return;
        }

        // ── Normal equirectangular / other formats ──────────────────────
        const source = capImageSize(img);
        const texture = new THREE.Texture(source as HTMLImageElement);
        applyTexture(texture);
      };
      img.onerror = (_err: unknown) => console.error('Image load error');
      img.src = scene.imageUrl;
    }
  }, [  // eslint-disable-line react-hooks/exhaustive-deps
    scene?.id, scene?.imageUrl, scene?.format, scene?.mediaType, scene?.stereoEye,
    scene?.fisheyeConfig?.fov, scene?.fisheyeConfig?.yawOffset, scene?.fisheyeConfig?.radius,
  ]);

  // Reset initial view when scene's initialYaw/Pitch changes
  useEffect(() => {
    if (!scene) return;
    yawRef.current   = scene.initialYaw;
    pitchRef.current = scene.initialPitch;
  }, [scene?.initialYaw, scene?.initialPitch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Event handlers ────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeToolRef.current !== 'none') return;
    draggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = (fovRef.current / 90) * 0.25 * (Math.PI / 180);
    yawRef.current   += dx * sensitivity;
    pitchRef.current -= dy * sensitivity;
    pitchRef.current  = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitchRef.current));
  }, []);

  const handleMouseUp   = useCallback(() => { draggingRef.current = false; }, []);
  const handleMouseLeave = useCallback(() => { draggingRef.current = false; }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    fovRef.current = Math.max(30, Math.min(120, fovRef.current + e.deltaY * 0.04));
    e.preventDefault();
  }, []);

  // Touch support
  const lastTouchRef   = useRef({ x: 0, y: 0 });
  const lastPinchRef   = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && activeToolRef.current === 'none') {
      const dx = e.touches[0].clientX - lastTouchRef.current.x;
      const dy = e.touches[0].clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const s = (fovRef.current / 90) * 0.3 * (Math.PI / 180);
      yawRef.current   += dx * s;
      pitchRef.current -= dy * s;
      pitchRef.current  = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitchRef.current));
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = lastPinchRef.current - dist;
      fovRef.current = Math.max(30, Math.min(120, fovRef.current + delta * 0.1));
      lastPinchRef.current = dist;
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    const camera    = cameraRef.current;
    const sphere    = sphereRef.current;
    if (!container || !camera || !sphere) return;

    const rect = container.getBoundingClientRect();
    const nx   = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
    const ny   = -((e.clientY - rect.top) / rect.height) *  2 + 1;

    if (activeToolRef.current === 'hotspot' || activeToolRef.current === 'media') {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
      const hits = ray.intersectObject(sphere);
      if (hits.length > 0) {
        const pt = hits[0].point.clone().normalize();
        const { yaw, pitch } = worldToYawPitch(pt.x, pt.y, pt.z);
        if (activeToolRef.current === 'hotspot') onHotspotPlace(yaw, pitch);
        else onMediaPlace(yaw, pitch);
      }
    }
  }, [onHotspotPlace, onMediaPlace]);

  // ── Hotspot drag handlers ─────────────────────────────────────────────
  const handleHotspotPointerDown = useCallback((e: React.PointerEvent, hotspotId: string) => {
    if (isPreviewModeRef.current) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = { hotspotId, startX: e.clientX, startY: e.clientY, moved: false };
  }, []);

  const handleHotspotPointerMove = useCallback((e: React.PointerEvent, hotspotId: string) => {
    const ds = dragStateRef.current;
    if (!ds || ds.hotspotId !== hotspotId) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) ds.moved = true;
    if (!ds.moved) return;
    const container = containerRef.current;
    const camera = cameraRef.current;
    const sphere = sphereRef.current;
    if (!container || !camera || !sphere) return;
    const rect = container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const hits = ray.intersectObject(sphere);
    if (hits.length > 0) {
      const pt = hits[0].point.clone().normalize();
      const { yaw, pitch } = worldToYawPitch(pt.x, pt.y, pt.z);
      draggingHotspotRef.current = { id: hotspotId, yaw, pitch };
    }
  }, []);

  const handleHotspotPointerUp = useCallback((e: React.PointerEvent, hotspot: Hotspot) => {
    const ds = dragStateRef.current;
    dragStateRef.current = null;
    if (ds?.moved) {
      e.stopPropagation();
      const dh = draggingHotspotRef.current;
      draggingHotspotRef.current = null;
      if (dh && dh.id === hotspot.id) {
        onHotspotRepositionRef.current(hotspot.id, dh.yaw, dh.pitch);
      }
      return;
    }
    draggingHotspotRef.current = null;
    // it was a click — always navigate if linked, also select in edit mode
    if (isPreviewModeRef.current) {
      onHotspotClickRef.current(hotspot);
    } else {
      onHotspotSelectRef.current(hotspot.id);
      // teleport to linked scene in edit mode too
      if (hotspot.targetSceneId) onHotspotClickRef.current(hotspot);
    }
  }, []);

  const zoomIn  = useCallback(() => { fovRef.current = Math.max(30, fovRef.current - 10); }, []);
  const zoomOut = useCallback(() => { fovRef.current = Math.min(120, fovRef.current + 10); }, []);

  // ── Scene navigation (keyboard + arrows) ─────────────────────────────
  const sceneIdx  = scenes.findIndex(s => s.id === scene?.id);
  const prevScene = sceneIdx > 0 ? scenes[sceneIdx - 1] : null;
  const nextScene = sceneIdx < scenes.length - 1 ? scenes[sceneIdx + 1] : null;

  const goToPrev = useCallback(() => {
    if (prevScene) setActiveScene(prevScene.id);
  }, [prevScene, setActiveScene]);

  const goToNext = useCallback(() => {
    if (nextScene) setActiveScene(nextScene.id);
  }, [nextScene, setActiveScene]);

  // Keyboard navigation — left/right arrows navigate scenes; wasd to look around
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft')  { goToPrev(); }
      if (e.key === 'ArrowRight') { goToNext(); }
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-')           zoomOut();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToPrev, goToNext, zoomIn, zoomOut]);

  const cursor = activeTool !== 'none' ? 'crosshair' : draggingRef.current ? 'grabbing' : 'grab';

  // Always render the container so Three.js can initialize on mount.
  // EmptyViewer is shown as an overlay when there is no active scene.
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: 'var(--nm-base)', cursor: scene ? cursor : 'default' }}
      onMouseDown={scene ? handleMouseDown : undefined}
      onMouseMove={scene ? handleMouseMove : undefined}
      onMouseUp={scene ? handleMouseUp : undefined}
      onMouseLeave={scene ? handleMouseLeave : undefined}
      onWheel={scene ? handleWheel : undefined}
      onClick={scene ? (e => { handleClick(e); setOpenVariantHotspotId(null); }) : undefined}
      onTouchStart={scene ? handleTouchStart : undefined}
      onTouchMove={scene ? handleTouchMove : undefined}
      onTouchEnd={scene ? handleMouseUp : undefined}
    >
      {/* ── Three.js canvas is appended here by the renderer ── */}

      {/* ── Empty state overlay ── */}
      {!scene && (
        <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: 'var(--nm-base)', pointerEvents: 'auto' }}>
          <EmptyViewer />
        </div>
      )}

      {scene && (
        <>
          {/* Hotspots overlay — positions updated imperatively every frame */}
          <div className="absolute inset-0 overflow-visible" style={{ zIndex: 5, pointerEvents: 'none' }}>
            {(scene.hotspots ?? []).map(hs => (
              <div
                key={hs.id}
                ref={el => {
                  if (el) hotspotContainersRef.current.set(hs.id, el);
                  else hotspotContainersRef.current.delete(hs.id);
                }}
                className="absolute"
                style={{ top: 0, left: 0, transform: 'translate3d(-9999px,-9999px,0)', willChange: 'transform', opacity: 0, pointerEvents: 'none' }}
                onPointerDown={e => handleHotspotPointerDown(e, hs.id)}
                onPointerMove={e => handleHotspotPointerMove(e, hs.id)}
                onPointerUp={e => {
                  const ds = dragStateRef.current;
                  dragStateRef.current = null;
                  if (ds?.moved) {
                    e.stopPropagation();
                    const dh = draggingHotspotRef.current;
                    draggingHotspotRef.current = null;
                    if (dh && dh.id === hs.id) {
                      onHotspotRepositionRef.current(hs.id, dh.yaw, dh.pitch);
                    }
                    return;
                  }
                  draggingHotspotRef.current = null;
                  if (hs.type === 'variants') {
                    if (isPreviewModeRef.current) {
                      setOpenVariantHotspotId(id => id === hs.id ? null : hs.id);
                    } else {
                      onHotspotSelectRef.current(hs.id);
                    }
                  } else {
                    handleHotspotPointerUp(e, hs);
                  }
                }}
              >
                <div style={{ transform: 'translate(-50%,-50%)' }}>
                  {hs.type === 'variants' ? (
                    <VariantHotspotMarker
                      hotspot={hs}
                      isSelected={selectedElementId === hs.id}
                      isPreview={isPreviewMode}
                      isOpen={openVariantHotspotId === hs.id}
                      currentSceneId={scene.id}
                      scenes={scenes}
                    />
                  ) : (
                    <HotspotMarker
                      hotspot={hs}
                      isSelected={selectedElementId === hs.id}
                      isPreview={isPreviewMode}
                      targetSceneName={scenes.find(s => s.id === hs.targetSceneId)?.name}
                    />
                  )}
                </div>
              </div>
            ))}
            {(scene.mediaPoints ?? []).map(mp => (
              <div
                key={mp.id}
                ref={el => {
                  if (el) mediaContainersRef.current.set(mp.id, el);
                  else mediaContainersRef.current.delete(mp.id);
                }}
                className="absolute"
                style={{ top: 0, left: 0, transform: 'translate3d(-9999px,-9999px,0)', willChange: 'transform', opacity: 0, pointerEvents: 'none' }}
                onClick={() => {
                  if (isPreviewMode) setActiveMedia(mp);
                  else { onMediaSelect(mp.id); setActiveMedia(mp); }
                }}
              >
                <div style={{ transform: 'translate(-50%,-50%)' }}>
                  <MediaMarker
                    media={mp}
                    isSelected={selectedElementId === mp.id}
                    onClick={() => {}}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ── Variant options panel ── */}
          {openVariantHotspotId && (() => {
            const hs = scene?.hotspots.find(h => h.id === openVariantHotspotId);
            if (!hs?.variantSceneIds?.length) return null;
            return (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-black/85 backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-white/10"
                onClick={e => e.stopPropagation()}>
                <p className="text-[10px] text-white/50 text-center mb-2.5 uppercase tracking-wide">{hs.label || 'Design Options'}</p>
                <div className="flex gap-2">
                  {hs.variantSceneIds.map(sid => {
                    const s = scenes.find(sc => sc.id === sid);
                    const isCurrent = sid === scene?.id;
                    return (
                      <button
                        key={sid}
                        onClick={() => {
                          if (!isCurrent) {
                            setPendingStartView({ yaw: yawRef.current, pitch: pitchRef.current });
                            setActiveScene(sid);
                          }
                          setOpenVariantHotspotId(null);
                        }}
                        className={['flex flex-col items-center gap-1 rounded-xl overflow-hidden transition-all', isCurrent ? 'ring-2 ring-nm-teal scale-105' : 'opacity-70 hover:opacity-100 hover:scale-105'].join(' ')}
                        style={{ width: 80 }}
                      >
                        {s?.thumbnail
                          ? <img src={s.thumbnail} className="w-full object-cover" style={{ height: 54 }} />
                          : <div className="w-full bg-nm-surface/80 flex items-center justify-center" style={{ height: 54 }}>
                              <Layers size={16} className="text-nm-teal/50" />
                            </div>
                        }
                        <p className="text-[9px] text-white/80 px-1 pb-1 text-center truncate w-full">{s?.name ?? sid}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Tool hint banner ── */}
          {activeTool !== 'none' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/70 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full border border-white/10 pointer-events-none">
              {activeTool === 'hotspot'
                ? 'Click anywhere in the panorama to place a navigation hotspot'
                : 'Click anywhere in the panorama to place a media information point'}
            </div>
          )}

          {/* ── Scene label + format badge (editor mode) ── */}
          {!isPreviewMode && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                <div className={[
                  'w-2 h-2 rounded-full flex-shrink-0',
                  scene.mediaType === 'panorama-video' ? 'bg-purple-400' : 'bg-nm-accent',
                ].join(' ')} />
                <span className="text-white text-xs font-medium">{scene.name}</span>
                <span className="text-white/40 text-[10px] border-l border-white/10 pl-2">
                  {formatShortLabel(scene.format)}
                </span>
              </div>
              {/* Fisheye warning — not yet converted */}
              {scene.format.startsWith('fisheye') && (
                <div className="flex items-center gap-1.5 bg-yellow-500/90 backdrop-blur-sm px-2.5 py-1.5 rounded-xl pointer-events-auto">
                  <AlertTriangle size={11} className="text-black" />
                  <span className="text-black text-[10px] font-semibold">Fisheye — convert for best quality</span>
                </div>
              )}
            </div>
          )}

          {/* ── Zoom controls ── */}
          <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />

          {/* ── Video controls ── */}
          {scene.mediaType === 'panorama-video' && (
            <VideoControls videoEl={videoElRef.current} />
          )}

          {/* ── Media panel ── */}
          {activeMedia && (
            <MediaPanel media={activeMedia} onClose={() => setActiveMedia(null)} />
          )}

          {/* ── WebXR / Immersive VR button (preview mode, supported device) ── */}
          {isPreviewMode && vrSupported && (
            <button
              data-enter-vr
              onClick={isInVR ? undefined : enterVR}
              className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all"
              style={{
                background: isInVR ? 'rgba(59,191,181,0.85)' : 'rgba(224,123,63,0.90)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              }}
              title={isInVR ? 'In VR mode — remove headset to exit' : 'Enter immersive VR'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z"/>
                <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
              </svg>
              {isInVR ? 'In VR' : 'Enter VR'}
            </button>
          )}

          {/* ── Scene navigation arrows (editor only — preview uses PresentationHUD) ── */}
          {scenes.length > 1 && !isPreviewMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
              <button
                onClick={goToPrev}
                disabled={!prevScene}
                className="w-9 h-9 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl text-white hover:text-nm-accent hover:border-nm-accent/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={prevScene ? `← ${prevScene.name}  (←)` : 'No previous scene'}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl text-center min-w-[80px]">
                <p className="text-white text-[11px] font-medium truncate max-w-[120px]">{scene.name}</p>
                <p className="text-white/40 text-[9px]">{sceneIdx + 1} / {scenes.length}</p>
              </div>
              <button
                onClick={goToNext}
                disabled={!nextScene}
                className="w-9 h-9 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl text-white hover:text-nm-accent hover:border-nm-accent/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={nextScene ? `${nextScene.name} → (→)` : 'No next scene'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── Floor plan minimap ── */}
          {floorPlans.length > 0 && (
            <FloorPlanMinimap
              floorPlans={floorPlans}
              activeFloorPlanId={activeFloorPlanId ?? floorPlans[0]?.id ?? null}
              onFloorPlanChange={setActiveFloorPlan}
              currentSceneId={scene.id}
              currentYaw={minimapYaw}
              onSceneChange={setActiveScene}
              isEditMode={!isPreviewMode}
            />
          )}
        </>
      )}
    </div>
  );
}
