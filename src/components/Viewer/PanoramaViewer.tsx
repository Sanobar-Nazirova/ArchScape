import React, {
  useEffect, useRef, useCallback, useState,
} from 'react';
import * as THREE from 'three';
import { yawPitchToWorld, worldToYawPitch } from '../../utils/sphereCoords';
import { useThreeScene } from './hooks/useThreeScene';
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
  const floorPlan = floorPlans.find(f => f.id === activeFloorPlanId) ?? floorPlans[0] ?? null;

  // ── Three.js refs ──────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const textureRef   = useRef<THREE.Texture | null>(null);
  const videoElRef   = useRef<HTMLVideoElement | null>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial | null>(null);

  // ── Camera state refs (avoid stale closures in rAF) ─────────────────
  const yawRef        = useRef(0);
  const pitchRef      = useRef(0);
  const fovRef        = useRef(75);
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

  // Stable store refs so VR/animation loop closures always see fresh values
  const scenesRef             = useRef(scenes);
  const setActiveSceneRef     = useRef(setActiveScene);
  const floorPlansRef         = useRef(floorPlans);
  const setActiveFloorPlanRef = useRef(setActiveFloorPlan);
  useEffect(() => { scenesRef.current = scenes; },                        [scenes]);
  useEffect(() => { setActiveSceneRef.current = setActiveScene; },        [setActiveScene]);
  useEffect(() => { floorPlansRef.current = floorPlans; },                [floorPlans]);
  useEffect(() => { setActiveFloorPlanRef.current = setActiveFloorPlan; },[setActiveFloorPlan]);

  // Shared mutable refs for VR mute button and hotspot label sprites
  const hotspotLabelSpritesRef = useRef<Map<string, THREE.Sprite>>(new Map());
  const audioElemsRef          = useRef<HTMLAudioElement[]>([]);
  const audioGainsRef          = useRef<GainNode[]>([]);

  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { isPreviewModeRef.current = isPreviewMode; }, [isPreviewMode]);
  useEffect(() => { onHotspotClickRef.current = onHotspotClick; }, [onHotspotClick]);
  useEffect(() => { onHotspotSelectRef.current = onHotspotSelect; }, [onHotspotSelect]);
  useEffect(() => { onHotspotRepositionRef.current = onHotspotReposition; }, [onHotspotReposition]);

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

  // ── Three.js init, XR controllers, animation loop ─────────────────────
  const { rendererRef, cameraRef, threeSceneRef, sphereRef, enterVR } = useThreeScene({
    containerRef,
    yawRef, pitchRef, fovRef,
    videoElRef, textureRef, shaderMatRef,
    sceneRef, scenesRef, floorPlansRef,
    hotspotContainersRef, mediaContainersRef, hotspotLabelSpritesRef,
    draggingHotspotRef, onHotspotClickRef,
    setActiveSceneRef, setActiveFloorPlanRef,
    audioElemsRef, audioGainsRef,
    setIsInVR, setMinimapYaw,
  });

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
          const height = Math.min(800, 500 / Math.max(ar, 0.5));
          newGeo = new THREE.CylinderGeometry(500, 500, height, 64, 1, true);
          break;
        }
        case 'partial':
        case 'rectilinear': {
          const hFov = ar > 1.5 ? Math.PI * 1.2 : Math.PI * 0.8;
          const vFov = hFov / Math.max(ar, 0.1);
          newGeo = new THREE.SphereGeometry(500, 48, 24,
            -hFov / 2, hFov, Math.PI / 2 - vFov / 2, vFov);
          break;
        }
        case 'vertical': {
          const vFov2 = Math.PI * 1.2;
          const hFov2 = Math.min(Math.PI * 0.5, vFov2 * (scene.aspectRatio ?? 0.4));
          newGeo = new THREE.SphereGeometry(500, 32, 48,
            -hFov2 / 2, hFov2, Math.PI / 2 - vFov2 / 2, vFov2);
          break;
        }
        default:
          newGeo = new THREE.SphereGeometry(500, 64, 32);
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
          const newGeo = new THREE.SphereGeometry(500, 64, 32);
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

    const sensitivity = (fovRef.current / 75) * 0.25 * (Math.PI / 180);
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
      const s = (fovRef.current / 75) * 0.3 * (Math.PI / 180);
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
      onClick={scene ? handleClick : undefined}
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
                style={{ top: 0, left: 0, transform: 'translate3d(-9999px,-9999px,0)', willChange: 'transform', opacity: 0 }}
                onMouseDown={e => e.stopPropagation()}
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
                  const isVariants = hs.type === 'variants' || (hs.variantSceneIds?.length ?? 0) > 0;
                  if (isVariants) {
                    e.stopPropagation();
                    setOpenVariantHotspotId(id => id === hs.id ? null : hs.id);
                    if (!isPreviewModeRef.current) onHotspotSelectRef.current(hs.id);
                  } else {
                    handleHotspotPointerUp(e, hs);
                  }
                }}
              >
                <div style={{ transform: 'translate(-50%,-50%)' }}>
                  {(hs.type === 'variants' || (hs.variantSceneIds?.length ?? 0) > 0) ? (
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
            if (!hs) return null;
            const variantIds = hs.variantSceneIds ?? [];
            return (
              <div
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] bg-black/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 min-w-[200px]"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                  <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">{hs.label || 'Design Options'}</p>
                  <button
                    onClick={() => setOpenVariantHotspotId(null)}
                    className="text-white/30 hover:text-white/70 transition-colors ml-4 text-lg leading-none"
                  >×</button>
                </div>
                {/* Option thumbnails */}
                {variantIds.length > 0 ? (
                  <div className="flex gap-2 p-3">
                    {variantIds.map(sid => {
                      const s = scenes.find(sc => sc.id === sid);
                      const isCurrent = sid === scene?.id;
                      return (
                        <button
                          key={sid}
                          disabled={isCurrent}
                          onClick={() => {
                            setPendingStartView({ yaw: yawRef.current, pitch: pitchRef.current });
                            setActiveScene(sid);
                            setOpenVariantHotspotId(null);
                          }}
                          className={[
                            'flex flex-col items-center rounded-xl overflow-hidden transition-all border-2',
                            isCurrent
                              ? 'border-nm-teal scale-105 opacity-100 cursor-default'
                              : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105 cursor-pointer',
                          ].join(' ')}
                          style={{ width: 88 }}
                        >
                          {s?.thumbnail
                            ? <img src={s.thumbnail} alt={s.name} className="w-full object-cover" style={{ height: 56 }} />
                            : <div className="w-full bg-white/5 flex items-center justify-center" style={{ height: 56 }}>
                                <Layers size={18} className="text-nm-teal/40" />
                              </div>
                          }
                          <div className="w-full bg-white/5 px-1.5 py-1.5">
                            <p className="text-[9px] text-white/80 text-center truncate w-full leading-tight">{s?.name ?? '—'}</p>
                            {isCurrent && <p className="text-[8px] text-nm-teal text-center mt-0.5">● Active</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-6 py-5 text-center">
                    <Layers size={20} className="text-white/20 mx-auto mb-2" />
                    <p className="text-xs text-white/40">No design options added yet.</p>
                    {!isPreviewMode && (
                      <p className="text-[10px] text-white/25 mt-1">Add variant scenes in the Properties Panel.</p>
                    )}
                  </div>
                )}
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
