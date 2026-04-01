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
import {
  ArrowRight, DoorOpen, Circle, ArrowUpRight, LogOut,
  Info, Image, Video, FileText, FileArchive,
  Play, Pause, Volume2, ZoomIn, ZoomOut,
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
  hotspot, isSelected, isPreview, onClick,
}: {
  hotspot: Hotspot;
  isSelected: boolean;
  isPreview: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-1 group focus:outline-none',
      ].join(' ')}
    >
      <div className={[
        'w-10 h-10 rounded-full flex items-center justify-center transition-all',
        'border-2 shadow-lg backdrop-blur-sm',
        isSelected
          ? 'bg-sphera-accent border-white text-white scale-110 shadow-sphera-accent/40'
          : isPreview
          ? 'bg-black/60 border-white/70 text-white hover:scale-110 hover:bg-sphera-accent hover:border-white hotspot-pulse'
          : 'bg-black/50 border-sphera-accent/70 text-sphera-accent hover:scale-110 hover:bg-sphera-accent hover:text-white hotspot-pulse',
      ].join(' ')}
      >
        {HOTSPOT_ICONS[hotspot.iconStyle]}
      </div>
      {hotspot.label && (
        <span className={[
          'text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm border whitespace-nowrap',
          isSelected
            ? 'bg-sphera-accent text-white border-white/30'
            : 'bg-black/60 text-white border-white/20 opacity-0 group-hover:opacity-100 transition-opacity',
        ].join(' ')}>
          {hotspot.label}
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
      <button onClick={toggle} className="text-white hover:text-sphera-accent p-1 transition-colors" title={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
      <button onClick={toggleMute} className="text-white hover:text-sphera-accent p-1 transition-colors" title={muted ? 'Unmute' : 'Mute'}>
        <Volume2 size={13} className={muted ? 'opacity-40' : ''} />
      </button>
    </div>
  );
}

/* ─── ZoomControls ────────────────────────────────────────────────────── */
function ZoomControls({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
      <button onClick={onZoomIn} className="w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg text-white hover:text-sphera-accent hover:border-sphera-accent/40 transition-colors">
        <ZoomIn size={14} />
      </button>
      <button onClick={onZoomOut} className="w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg text-white hover:text-sphera-accent hover:border-sphera-accent/40 transition-colors">
        <ZoomOut size={14} />
      </button>
    </div>
  );
}

/* ─── Empty state ─────────────────────────────────────────────────────── */
function EmptyViewer() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center select-none px-8">
      <div className="w-20 h-20 rounded-2xl bg-sphera-surface border border-sphera-border flex items-center justify-center">
        <svg viewBox="0 0 80 80" className="w-12 h-12 text-sphera-muted" fill="none">
          <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="2" />
          <ellipse cx="40" cy="40" rx="30" ry="14" stroke="currentColor" strokeWidth="2" />
          <line x1="40" y1="10" x2="40" y2="70" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      <div className="space-y-2">
        <p className="text-white font-semibold text-lg">Start Your Virtual Tour</p>
        <p className="text-sphera-muted text-sm max-w-sm leading-relaxed">
          Click <span className="text-white font-medium">Upload Panoramas</span> in the toolbar to import your files.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center w-full max-w-sm">
        {[
          { label: 'Equirectangular', sub: 'JPG · PNG · WEBP', icon: '🌐' },
          { label: '360° Video',      sub: 'MP4 · WEBM · MOV', icon: '🎬' },
          { label: 'Fisheye',         sub: 'Auto-converted',    icon: '👁' },
        ].map(({ label, sub, icon }) => (
          <div key={label} className="bg-sphera-surface border border-sphera-border rounded-xl p-3">
            <div className="text-2xl mb-1">{icon}</div>
            <p className="text-xs text-sphera-text font-medium leading-tight">{label}</p>
            <p className="text-[10px] text-sphera-muted mt-0.5">{sub}</p>
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
  const { floorPlan, setActiveScene } = useTourStore();

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
      texture.colorSpace  = THREE.SRGBColorSpace;
      texture.wrapS       = THREE.ClampToEdgeWrapping;
      texture.wrapT       = THREE.ClampToEdgeWrapping;

      // Handle stereo formats by UV cropping
      switch (scene.format) {
        case 'equirectangular-sbs':
          // Left eye = left half
          texture.repeat.set(0.5, 1);
          texture.offset.set(0, 0);
          break;
        case 'equirectangular-tb':
          // Left eye = top half (UV y=0.5 to 1.0)
          texture.repeat.set(1, 0.5);
          texture.offset.set(0, 0.5);
          break;
        default:
          texture.repeat.set(1, 1);
          texture.offset.set(0, 0);
      }

      textureRef.current   = texture;
      mat.map              = texture;
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
      const img = new Image();
      img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        applyTexture(texture);
      };
      img.onerror = (err) => console.error('Image load error:', err);
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

  // ─────────────────────────────────────────────────────────────────────
  if (!scene) {
    return (
      <div className="w-full h-full bg-sphera-bg flex items-center justify-center">
        <EmptyViewer />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-sphera-bg select-none"
      style={{ cursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      {/* ── Three.js canvas rendered here ── */}

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

      {/* ── Scene label (editor mode) ── */}
      {!isPreviewMode && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10 pointer-events-none">
          <div className={[
            'w-2 h-2 rounded-full',
            scene.mediaType === 'panorama-video' ? 'bg-purple-400' : 'bg-sphera-accent',
          ].join(' ')} />
          <span className="text-white text-xs font-medium">{scene.name}</span>
          <span className="text-white/40 text-[10px]">{scene.format.replace('equirectangular-', '').toUpperCase()}</span>
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
    </div>
  );
}
