import { useEffect, useRef, useCallback } from 'react';
import type React from 'react';
import * as THREE from 'three';
import { worldToYawPitch } from '../../../utils/sphereCoords';
import type { Scene, ToolMode } from '../../../types';

export function useCameraControls(params: {
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  yawRef: React.MutableRefObject<number>;
  pitchRef: React.MutableRefObject<number>;
  fovRef: React.MutableRefObject<number>;
  draggingRef: React.MutableRefObject<boolean>;
  lastMouseRef: React.MutableRefObject<{ x: number; y: number }>;
  lastPinchRef: React.MutableRefObject<number>;
  activeToolRef: React.MutableRefObject<ToolMode>;
  sphereRef: React.MutableRefObject<THREE.Mesh | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  scenes: Scene[];
  scene: Scene | null | undefined;
  setActiveScene: (id: string) => void;
  onHotspotPlace: (yaw: number, pitch: number) => void;
  onMediaPlace: (yaw: number, pitch: number) => void;
}): {
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  handleWheel: (e: React.WheelEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleClick: (e: React.MouseEvent) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  prevScene: Scene | undefined;
  nextScene: Scene | undefined;
  goToPrev: () => void;
  goToNext: () => void;
} {
  const {
    containerRef, yawRef, pitchRef, fovRef, draggingRef, lastMouseRef,
    lastPinchRef, activeToolRef, sphereRef, cameraRef,
    scenes, scene, setActiveScene, onHotspotPlace, onMediaPlace,
  } = params;

  // Touch support — local refs since they don't need to be stable across renders
  const lastTouchRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeToolRef.current !== 'none') return;
    draggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = (fovRef.current / 90) * 0.25 * (Math.PI / 180);
    yawRef.current   += dx * sensitivity;
    pitchRef.current -= dy * sensitivity;
    pitchRef.current  = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitchRef.current));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseUp   = useCallback(() => { draggingRef.current = false; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const handleMouseLeave = useCallback(() => { draggingRef.current = false; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWheel = useCallback((e: React.WheelEvent) => {
    fovRef.current = Math.max(30, Math.min(120, fovRef.current + e.deltaY * 0.04));
    e.preventDefault();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [onHotspotPlace, onMediaPlace]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomIn  = useCallback(() => { fovRef.current = Math.max(30, fovRef.current - 10); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const zoomOut = useCallback(() => { fovRef.current = Math.min(120, fovRef.current + 10); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scene navigation (keyboard + arrows) ─────────────────────────────
  const sceneIdx  = scenes.findIndex(s => s.id === scene?.id);
  const prevScene = sceneIdx > 0 ? scenes[sceneIdx - 1] : undefined;
  const nextScene = sceneIdx < scenes.length - 1 ? scenes[sceneIdx + 1] : undefined;

  const goToPrev = useCallback(() => {
    if (prevScene) setActiveScene(prevScene.id);
  }, [prevScene, setActiveScene]);

  const goToNext = useCallback(() => {
    if (nextScene) setActiveScene(nextScene.id);
  }, [nextScene, setActiveScene]);

  // Keyboard navigation — left/right arrows navigate scenes; +/- to zoom
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

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleClick,
    zoomIn,
    zoomOut,
    prevScene,
    nextScene,
    goToPrev,
    goToNext,
  };
}
