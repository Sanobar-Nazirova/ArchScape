import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { X, Glasses, ChevronLeft, ChevronRight, Smartphone, ArrowLeft } from 'lucide-react';
import type { Scene } from '../types';

interface Props {
  scene: Scene | null;
  scenes: Scene[];
  onSceneChange: (id: string) => void;
  onClose: () => void;
  onChangeTour?: () => void;
  autoEnterVR?: boolean;
}

export default function ImmersiveViewer({ scene, scenes, onSceneChange, onClose, onChangeTour, autoEnterVR }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const rendererRef   = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef     = useRef<THREE.PerspectiveCamera | null>(null);
  const sphereRef     = useRef<THREE.Mesh | null>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const yawRef        = useRef(scene?.initialYaw ?? 0);
  const pitchRef      = useRef(scene?.initialPitch ?? 0);

  const [vrSupported, setVrSupported] = useState(false);
  const [gyroActive,  setGyroActive]  = useState(false);
  const [gyroAvail,   setGyroAvail]   = useState(false);
  // When true, show a full-screen "Tap to Enter VR" splash as the first thing the
  // user sees. Dismissed by tapping the button (which also calls enterVR).
  const [showVRSplash, setShowVRSplash] = useState(!!autoEnterVR);

  const sceneIdx = scenes.findIndex(s => s.id === scene?.id);
  const prevScene = sceneIdx > 0 ? scenes[sceneIdx - 1] : null;
  const nextScene = sceneIdx < scenes.length - 1 ? scenes[sceneIdx + 1] : null;

  // ── Three.js init ──────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const threeScene = new THREE.Scene();
    threeSceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(
      75, container.clientWidth / container.clientHeight, 0.1, 2000,
    );
    camera.rotation.order = 'YXZ';
    cameraRef.current = camera;

    const geo = new THREE.SphereGeometry(500, 64, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x111119, side: THREE.BackSide });
    const mesh = new THREE.Mesh(geo, mat);
    threeScene.add(mesh);
    sphereRef.current = mesh;

    // ── Mouse / touch drag ─────────────────────────────────────────────
    let pointerDown = false;
    let lastX = 0, lastY = 0;
    const onDown  = (e: PointerEvent) => { pointerDown = true; lastX = e.clientX; lastY = e.clientY; };
    const onMove  = (e: PointerEvent) => {
      if (!pointerDown) return;
      const sens = (camera.fov / 75) * 0.003;
      yawRef.current   += (e.clientX - lastX) * sens;
      pitchRef.current  = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05,
        pitchRef.current - (e.clientY - lastY) * sens));
      lastX = e.clientX; lastY = e.clientY;
    };
    const onUp    = () => { pointerDown = false; };
    const onWheel = (e: WheelEvent) => {
      camera.fov = Math.max(30, Math.min(110, camera.fov + e.deltaY * 0.05));
      camera.updateProjectionMatrix();
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    // ── WebXR capability check ─────────────────────────────────────────
    navigator.xr?.isSessionSupported('immersive-vr')
      .then(s => setVrSupported(s))
      .catch(() => {});

    // ── XR session lifecycle ───────────────────────────────────────────
    renderer.xr.addEventListener('sessionstart', () => {
      camera.rotation.set(0, 0, 0);
    });
    renderer.xr.addEventListener('sessionend', () => {
      camera.rotation.y = -yawRef.current;
      camera.rotation.x =  pitchRef.current;
    });

    // ── Animate loop ───────────────────────────────────────────────────
    const animate = (_t: number, xrFrame?: XRFrame) => {
      if (!xrFrame) {
        camera.rotation.y = -yawRef.current;
        camera.rotation.x =  pitchRef.current;
        camera.updateProjectionMatrix();
      }
      renderer.render(threeScene, camera);
    };
    renderer.setAnimationLoop(animate);

    // ── Resize observer ────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);

    // ── Detect gyro availability ───────────────────────────────────────
    if (typeof DeviceOrientationEvent !== 'undefined') {
      setGyroAvail(true);
    }

    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // ── Load texture when scene changes ────────────────────────────────────
  useEffect(() => {
    if (!sphereRef.current || !scene) return;
    const mat = sphereRef.current.material as THREE.MeshBasicMaterial;

    yawRef.current   = scene.initialYaw   ?? 0;
    pitchRef.current = scene.initialPitch ?? 0;

    if (!scene.imageUrl) {
      mat.map = null;
      mat.color.set(0x111119);
      mat.needsUpdate = true;
      return;
    }

    mat.map = null;
    mat.color.set(0x111119);
    mat.needsUpdate = true;

    const loader = new THREE.TextureLoader();
    loader.load(scene.imageUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      if (sphereRef.current) {
        const m = sphereRef.current.material as THREE.MeshBasicMaterial;
        m.map = tex;
        m.color.set(0xffffff);
        m.needsUpdate = true;
      }
    });
  }, [scene?.id, scene?.imageUrl]);

  // ── Device orientation (gyroscope) ─────────────────────────────────────
  const gyroCleanupRef = useRef<(() => void) | null>(null);

  const enableGyro = useCallback(async () => {
    const handler = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null || e.gamma === null) return;
      // Convert device angles → camera yaw/pitch
      // Portrait orientation: beta ~= tilt from vertical
      const alphaRad = THREE.MathUtils.degToRad(e.alpha ?? 0);
      const betaRad  = THREE.MathUtils.degToRad((e.beta  ?? 90) - 90);
      yawRef.current   = -alphaRad;
      pitchRef.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, betaRad));
    };

    try {
      // iOS 13+ requires explicit permission
      if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
          .requestPermission === 'function') {
        const perm = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> })
          .requestPermission();
        if (perm !== 'granted') return;
      }
      window.addEventListener('deviceorientation', handler);
      setGyroActive(true);
      gyroCleanupRef.current = () => {
        window.removeEventListener('deviceorientation', handler);
        setGyroActive(false);
      };
    } catch { /* permission denied or unsupported */ }
  }, []);

  const disableGyro = useCallback(() => {
    gyroCleanupRef.current?.();
    gyroCleanupRef.current = null;
  }, []);

  useEffect(() => () => { gyroCleanupRef.current?.(); }, []);

  // ── Enter WebXR VR session ──────────────────────────────────────────────
  const enterVR = useCallback(async () => {
    if (!rendererRef.current || !navigator.xr) return;
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor'],
      });
      rendererRef.current.xr.setSession(session);
    } catch (e) {
      console.warn('WebXR session failed:', e);
    }
  }, []);

  // Sync splash visibility with autoEnterVR prop changes
  useEffect(() => {
    if (autoEnterVR) setShowVRSplash(true);
  }, [autoEnterVR]);

  return (
    <div className="fixed inset-0 z-50 bg-black" style={{ touchAction: 'none' }}>

      {/* Three.js canvas fills the whole screen */}
      <div ref={containerRef} className="w-full h-full" />

      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-4 pb-8 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>

        <div className="pointer-events-auto flex items-center gap-2">
          {/* Back to tours list */}
          {onChangeTour && (
            <button
              onClick={onChangeTour}
              title="Back to tours"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs border border-white/20 hover:bg-white/10 transition-colors"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
              <ArrowLeft size={13} /> Tours
            </button>
          )}

          {/* Gyro toggle (mobile) */}
          {gyroAvail && (
            <button
              onClick={gyroActive ? disableGyro : enableGyro}
              title={gyroActive ? 'Disable gyroscope' : 'Enable gyroscope look-around'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs border transition-colors"
              style={{
                background: gyroActive ? 'rgba(224,123,63,0.25)' : 'rgba(0,0,0,0.6)',
                borderColor: gyroActive ? 'rgba(224,123,63,0.7)' : 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
              }}>
              <Smartphone size={13} />
              {gyroActive ? 'Gyro ON' : 'Gyro'}
            </button>
          )}
        </div>

        {/* Scene name */}
        <div className="pointer-events-none px-4 py-1.5 rounded-full text-white text-sm font-medium"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {scene?.name ?? ''}
        </div>

        {/* Exit */}
        <button
          onClick={onClose}
          className="pointer-events-auto w-9 h-9 flex items-center justify-center rounded-xl text-white border border-white/20 hover:bg-white/10 transition-colors"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <X size={16} />
        </button>
      </div>

      {/* ── Look-around hint (fades after first interaction) ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ opacity: 0.35 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="white" strokeWidth="1.5" strokeDasharray="4 3"/>
          <path d="M20 32 Q32 20 44 32 Q32 44 20 32Z" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1"/>
          <circle cx="32" cy="32" r="4" fill="white" fillOpacity="0.6"/>
          <path d="M15 32 L10 32 M49 32 L54 32 M32 15 L32 10 M32 49 L32 54" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* ── Bottom bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-6 pt-12 flex flex-col items-center gap-4"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>

        {/* Persistent Enter VR button (always visible) */}
        <button
          onClick={vrSupported ? enterVR : undefined}
          title={vrSupported ? 'Enter immersive VR' : 'WebXR not available — open this page in a VR headset browser (e.g. Meta Quest Browser) or connect a headset'}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold border transition-all"
          style={{
            background: vrSupported ? 'rgba(224,123,63,0.9)' : 'rgba(60,60,70,0.75)',
            borderColor: vrSupported ? 'rgba(224,123,63,1)' : 'rgba(255,255,255,0.12)',
            color: vrSupported ? 'white' : 'rgba(255,255,255,0.4)',
            backdropFilter: 'blur(10px)',
            cursor: vrSupported ? 'pointer' : 'default',
            boxShadow: vrSupported ? '0 0 24px rgba(224,123,63,0.4)' : 'none',
          }}>
          <Glasses size={18} />
          {vrSupported ? 'Enter VR' : 'VR not available in this browser'}
        </button>

        <div className="flex items-center gap-4">
          {/* Prev scene */}
          <button
            onClick={() => prevScene && onSceneChange(prevScene.id)}
            disabled={!prevScene}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white border border-white/15 disabled:opacity-25 hover:bg-white/10 transition-colors"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
            <ChevronLeft size={16} />
          </button>

          {/* Scene dots */}
          <div className="flex items-center gap-2">
            {scenes.map((s, i) => (
              <button
                key={s.id}
                onClick={() => onSceneChange(s.id)}
                title={s.name}
                className="rounded-full transition-all"
                style={{
                  width: i === sceneIdx ? 20 : 8,
                  height: 8,
                  background: i === sceneIdx ? '#e07b3f' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>

          {/* Next scene */}
          <button
            onClick={() => nextScene && onSceneChange(nextScene.id)}
            disabled={!nextScene}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white border border-white/15 disabled:opacity-25 hover:bg-white/10 transition-colors"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Full-screen "Tap to Enter VR" splash (shown when launched via View VR) ── */}
      {showVRSplash && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-8"
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
        >
          {/* Big VR icon */}
          <div style={{ fontSize: 72, lineHeight: 1 }}>🥽</div>

          <div className="flex flex-col items-center gap-2 text-center px-6">
            <h2 className="text-white text-2xl font-bold tracking-tight">
              {vrSupported ? 'Ready to Enter VR' : 'ArchScape 360° Viewer'}
            </h2>
            <p className="text-white/50 text-sm max-w-xs">
              {vrSupported
                ? 'Tap the button below to enter immersive 360° mode on your headset.'
                : 'WebXR is not available in this browser. Open this page in Meta Quest Browser (HTTPS) to use VR.'}
            </p>
          </div>

          {/* Primary action button — LARGE, centered, impossible to miss */}
          <button
            onClick={() => {
              setShowVRSplash(false);
              if (vrSupported) enterVR();
            }}
            className="flex items-center gap-3 rounded-2xl font-bold text-lg border-2 transition-all active:scale-95"
            style={{
              padding: '18px 48px',
              background: vrSupported ? '#e07b3f' : 'rgba(255,255,255,0.08)',
              borderColor: vrSupported ? '#e07b3f' : 'rgba(255,255,255,0.15)',
              color: 'white',
              boxShadow: vrSupported ? '0 0 40px rgba(224,123,63,0.5)' : 'none',
              cursor: 'pointer',
              minWidth: 240,
              justifyContent: 'center',
            }}
          >
            <Glasses size={24} />
            {vrSupported ? 'Enter VR' : 'View in 360°'}
          </button>

          {/* Dismiss without entering VR */}
          <button
            onClick={() => setShowVRSplash(false)}
            className="text-white/30 text-sm hover:text-white/60 transition-colors"
          >
            Continue in flat mode
          </button>
        </div>
      )}
    </div>
  );
}
