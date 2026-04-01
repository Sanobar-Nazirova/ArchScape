import React, {
  useEffect, useRef, useCallback, useState,
} from 'react';
import * as THREE from 'three';
import { yawPitchToWorld, worldToYawPitch } from '../../utils/sphereCoords';
import MediaPanel from './MediaPanel';
import FloorPlanMinimap from './FloorPlanMinimap';
import { useTourStore } from '../../store/useTourStore';
import type {
  Hotspot, MediaPoint, Scene, ToolMode, HotspotIconStyle, ProjectedItem,
} from '../../types';
import { triggerUpload } from '../../utils/uploadTrigger';
import { formatShortLabel } from '../../utils/panoramaDetector';
import {
  ArrowRight, DoorOpen, Circle, ArrowUpRight, LogOut,
  Info, Image, Video, FileText, FileArchive,
  Play, Pause, Volume2, ZoomIn, ZoomOut, Upload, AlertTriangle,
} from 'lucide-react';

/* ─── HotspotIcon ─────────────────────────────────────────────────────── */
const HOTSPOT_ICONS: Record<HotspotIconStyle, React.ReactNode> = {
  arrow:  <ArrowRight    size={14} />,
  door:   <DoorOpen      size={14} />,
  circle: <Circle        size={14} />,
  stairs: <ArrowUpRight  size={14} />,
  exit:   <LogOut        size={14} />,
};

function HotspotMarker({
  hotspot, isSelected, isPreview, onClick, targetSceneName,
}: {
  hotspot: Hotspot;
  isSelected: boolean;
  isPreview: boolean;
  onClick: () => void;
  targetSceneName?: string;
}) {
  // Show tooltip: custom label > linked scene name > nothing
  const tooltip = hotspot.label || targetSceneName;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group focus:outline-none"
    >
      <div className={[
        'w-10 h-10 rounded-full flex items-center justify-center transition-all',
        'border-2 shadow-lg backdrop-blur-sm',
        isSelected
          ? 'bg-nm-accent border-white text-white scale-110 shadow-nm-accent/40'
          : isPreview
          ? 'bg-black/60 border-white/70 text-white hover:scale-110 hover:bg-nm-accent hover:border-white hotspot-pulse'
          : 'bg-black/50 border-nm-accent/70 text-nm-accent hover:scale-110 hover:bg-nm-accent hover:text-white hotspot-pulse',
      ].join(' ')}
      >
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
    </button>
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
}

export default function PanoramaViewer({
  scene, isPreviewMode, activeTool, selectedElementId,
  onHotspotPlace, onMediaPlace, onHotspotClick, onHotspotSelect, onMediaSelect,
}: PanoramaViewerProps) {
  const { floorPlan, setActiveScene, scenes } = useTourStore();

  // ── Three.js refs ──────────────────────────────────────────────────────
  const containerRef  = useRef<HTMLDivElement>(null);
  const rendererRef   = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef     = useRef<THREE.PerspectiveCamera | null>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const sphereRef     = useRef<THREE.Mesh | null>(null);
  const textureRef    = useRef<THREE.Texture | null>(null);
  const videoElRef    = useRef<HTMLVideoElement | null>(null);
  const rafRef        = useRef<number>(0);

  // ── Camera state refs (avoid stale closures in rAF) ─────────────────
  const yawRef        = useRef(0);
  const pitchRef      = useRef(0);
  const fovRef        = useRef(75);
  const draggingRef   = useRef(false);
  const lastMouseRef  = useRef({ x: 0, y: 0 });
  const cameraYawRef  = useRef(0); // tracked for minimap

  // ── Prop refs ─────────────────────────────────────────────────────────
  const sceneRef        = useRef(scene);
  const activeToolRef   = useRef(activeTool);
  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);

  // ── UI state ──────────────────────────────────────────────────────────
  const [projectedItems, setProjectedItems] = useState<ProjectedItem[]>([]);
  const [activeMedia, setActiveMedia]       = useState<MediaPoint | null>(null);
  const [minimapYaw, setMinimapYaw]         = useState(0);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const threeScene = new THREE.Scene();
    threeSceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 2000);
    camera.rotation.order = 'YXZ';
    cameraRef.current = camera;

    // Panorama sphere (inside surface)
    const geo  = new THREE.SphereGeometry(500, 64, 32);
    const mat  = new THREE.MeshBasicMaterial({ color: 0x111119, side: THREE.BackSide });
    const mesh = new THREE.Mesh(geo, mat);
    threeScene.add(mesh);
    sphereRef.current = mesh;

    // Animation loop
    let frame = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
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

      // Project hotspots/media (every 2 frames for performance)
      if (frame % 2 === 0) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const sc = sceneRef.current;
        const items: ProjectedItem[] = [];

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);

        if (sc) {
          for (const hs of sc.hotspots) {
            const wp = yawPitchToWorld(hs.yaw, hs.pitch);
            const v = new THREE.Vector3(wp.x, wp.y, wp.z);
            const proj = v.clone().project(cam);
            const dot = forward.dot(v);
            items.push({
              id: hs.id, type: 'hotspot',
              x: (proj.x + 1) / 2 * w,
              y: (1 - proj.y) / 2 * h,
              visible: dot > 0.15,
              data: hs,
            });
          }
          for (const mp of sc.mediaPoints) {
            const wp = yawPitchToWorld(mp.yaw, mp.pitch);
            const v = new THREE.Vector3(wp.x, wp.y, wp.z);
            const proj = v.clone().project(cam);
            const dot = forward.dot(v);
            items.push({
              id: mp.id, type: 'media',
              x: (proj.x + 1) / 2 * w,
              y: (1 - proj.y) / 2 * h,
              visible: dot > 0.15,
              data: mp,
            });
          }
        }
        setProjectedItems(items);

        // Update minimap direction every 10 frames
        if (frame % 10 === 0) {
          cameraYawRef.current = yawRef.current;
          setMinimapYaw(yawRef.current);
        }
      }

      renderer.render(threeScene, cam);
    };
    animate();

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
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── Load texture when scene changes ───────────────────────────────────
  useEffect(() => {
    if (!sphereRef.current || !scene) return;

    const mat = sphereRef.current.material as THREE.MeshBasicMaterial;

    // Cleanup previous
    if (textureRef.current) { textureRef.current.dispose(); textureRef.current = null; }
    if (videoElRef.current) { videoElRef.current.pause(); videoElRef.current.src = ''; videoElRef.current = null; }
    mat.map = null;
    mat.color.set(0x111119);
    mat.needsUpdate = true;

    // Reset camera to scene initial view
    yawRef.current   = scene.initialYaw;
    pitchRef.current = scene.initialPitch;
    setActiveMedia(null);

    const applyTexture = (texture: THREE.Texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      // ── Swap geometry based on panorama format ────────────────────────
      const mesh = sphereRef.current!;
      const oldGeo = mesh.geometry;
      let newGeo: THREE.BufferGeometry;
      const ar = scene.aspectRatio ?? 2;

      switch (scene.format) {
        case 'cylindrical': {
          // Open cylinder — 360° horizontal, limited vertical based on AR
          const height = Math.min(800, 500 / Math.max(ar, 0.5));
          newGeo = new THREE.CylinderGeometry(500, 500, height, 64, 1, true);
          // Cylinder UV wraps correctly with BackSide
          break;
        }
        case 'partial':
        case 'rectilinear': {
          // Partial sphere — limit horizontal spread based on AR
          // phiLength = horizontal FOV in radians (estimate from AR)
          const hFov = ar > 1.5 ? Math.PI * 1.2 : Math.PI * 0.8; // ~150° or ~100°
          const vFov = hFov / Math.max(ar, 0.1);
          newGeo = new THREE.SphereGeometry(500, 48, 24,
            -hFov / 2, hFov,                          // phi (horizontal)
            Math.PI / 2 - vFov / 2, vFov              // theta (vertical)
          );
          break;
        }
        case 'vertical': {
          // Tall narrow — partial sphere tilted
          const vFov2 = Math.PI * 1.2; // ~216°
          const hFov2 = Math.min(Math.PI * 0.5, vFov2 * (scene.aspectRatio ?? 0.4));
          newGeo = new THREE.SphereGeometry(500, 32, 48,
            -hFov2 / 2, hFov2,
            Math.PI / 2 - vFov2 / 2, vFov2
          );
          break;
        }
        default:
          // equirectangular-mono/sbs/tb, fisheye-*, cubic, unknown → sphere
          newGeo = new THREE.SphereGeometry(500, 64, 32);
      }

      if (oldGeo !== newGeo) {
        oldGeo.dispose();
        mesh.geometry = newGeo;
      }

      // ── UV adjustments for stereo formats ─────────────────────────────
      switch (scene.format) {
        case 'equirectangular-sbs':
          texture.repeat.set(0.5, 1);
          texture.offset.set(0, 0);
          break;
        case 'equirectangular-tb':
          texture.repeat.set(1, 0.5);
          texture.offset.set(0, 0.5);
          break;
        default:
          texture.repeat.set(1, 1);
          texture.offset.set(0, 0);
      }

      // ── Flip sphere inside-out for BackSide rendering ──────────────────
      mat.side = (scene.format === 'partial' || scene.format === 'rectilinear' || scene.format === 'vertical')
        ? THREE.BackSide
        : THREE.BackSide; // always BackSide — camera is inside

      textureRef.current = texture;
      mat.map = texture;
      mat.color.set(0xffffff);
      mat.needsUpdate      = true;
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
        applyTexture(vt);
        video.play().catch(console.warn);
      }, { once: true });
      video.load();
    } else if (scene.imageUrl) {
      const img = new window.Image() as HTMLImageElement;
      img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        applyTexture(texture);
      };
      img.onerror = (_err: unknown) => console.error('Image load error');
      img.src = scene.imageUrl;
    }
  }, [scene?.id, scene?.imageUrl, scene?.format, scene?.mediaType]);  // eslint-disable-line react-hooks/exhaustive-deps

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

  const zoomIn  = useCallback(() => { fovRef.current = Math.max(30, fovRef.current - 10); }, []);
  const zoomOut = useCallback(() => { fovRef.current = Math.min(120, fovRef.current + 10); }, []);

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
          {/* ── Overlay: hotspots + media markers ── */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
            {projectedItems.map(item => {
              if (!item.visible) return null;
              return (
                <div
                  key={item.id}
                  className="absolute pointer-events-auto"
                  style={{
                    left: item.x,
                    top:  item.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {item.type === 'hotspot' ? (
                    <HotspotMarker
                      hotspot={item.data as Hotspot}
                      isSelected={selectedElementId === item.id}
                      isPreview={isPreviewMode}
                      targetSceneName={scenes.find(s => s.id === (item.data as Hotspot).targetSceneId)?.name}
                      onClick={() => {
                        if (isPreviewMode) onHotspotClick(item.data as Hotspot);
                        else onHotspotSelect(item.id);
                      }}
                    />
                  ) : (
                    <MediaMarker
                      media={item.data as MediaPoint}
                      isSelected={selectedElementId === item.id}
                      onClick={() => {
                        if (isPreviewMode) setActiveMedia(item.data as MediaPoint);
                        else { onMediaSelect(item.id); setActiveMedia(item.data as MediaPoint); }
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

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

          {/* ── Floor plan minimap ── */}
          {floorPlan && (
            <FloorPlanMinimap
              floorPlan={floorPlan}
              currentSceneId={scene.id}
              currentYaw={minimapYaw}
              onSceneChange={setActiveScene}
            />
          )}
        </>
      )}
    </div>
  );
}
