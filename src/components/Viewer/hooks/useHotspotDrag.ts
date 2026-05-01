import { useRef, useCallback } from 'react';
import type React from 'react';
import * as THREE from 'three';
import { worldToYawPitch } from '../../../utils/sphereCoords';
import type { Hotspot } from '../../../types';

export function useHotspotDrag(params: {
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  sphereRef: React.MutableRefObject<THREE.Mesh | null>;
  isPreviewModeRef: React.MutableRefObject<boolean>;
  onHotspotClickRef: React.MutableRefObject<(hotspot: Hotspot) => void>;
  onHotspotSelectRef: React.MutableRefObject<(id: string) => void>;
  onHotspotRepositionRef: React.MutableRefObject<(id: string, yaw: number, pitch: number) => void>;
}): {
  dragStateRef: React.MutableRefObject<{ hotspotId: string; startX: number; startY: number; moved: boolean } | null>;
  draggingHotspotRef: React.MutableRefObject<{ id: string; yaw: number; pitch: number } | null>;
  handleHotspotPointerDown: (e: React.PointerEvent, hotspotId: string) => void;
  handleHotspotPointerMove: (e: React.PointerEvent, hotspotId: string) => void;
  handleHotspotPointerUp: (e: React.PointerEvent, hotspot: Hotspot) => void;
} {
  const {
    containerRef, cameraRef, sphereRef, isPreviewModeRef,
    onHotspotClickRef, onHotspotSelectRef, onHotspotRepositionRef,
  } = params;

  const dragStateRef        = useRef<{ hotspotId: string; startX: number; startY: number; moved: boolean } | null>(null);
  const draggingHotspotRef  = useRef<{ id: string; yaw: number; pitch: number } | null>(null);

  // ── Hotspot drag handlers ─────────────────────────────────────────────
  const handleHotspotPointerDown = useCallback((e: React.PointerEvent, hotspotId: string) => {
    if (isPreviewModeRef.current) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = { hotspotId, startX: e.clientX, startY: e.clientY, moved: false };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    dragStateRef,
    draggingHotspotRef,
    handleHotspotPointerDown,
    handleHotspotPointerMove,
    handleHotspotPointerUp,
  };
}
