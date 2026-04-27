import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { X, Glasses, ChevronLeft, ChevronRight, Smartphone, ArrowLeft, Upload } from 'lucide-react';
import type { Scene, FloorPlan, PanoramaFormat, MediaType, FisheyeConfig } from '../types';
import { detectPanorama } from '../utils/panoramaDetector';
import { generateThumbnail } from '../utils/panoramaGenerator';
import { fisheyeToEquirectangular, fisheyeCache } from '../utils/fisheyeConverter';

interface Props {
  scene: Scene | null;
  scenes: Scene[];
  onSceneChange: (id: string) => void;
  onClose: () => void;
  onChangeTour?: () => void;
  autoEnterVR?: boolean;
  floorPlans?: FloorPlan[];
  onAddScene?: (imageUrl: string, name: string, format: PanoramaFormat, mediaType: MediaType, thumbnail?: string, aspectRatio?: number) => string;
}

// Canvas dimensions (must match the PlaneGeometry texture)
const CW = 512, CH = 384;
const TAB_H   = 52;   // tab bar height
const FOOT_Y  = CH - 44; // footer start y (Exit VR button)

// ── Scene dot positions for the map tab ──────────────────────────────────────
function getMapPositions(
  scenes: Scene[],
  floorPlans: FloorPlan[] | undefined,
): { x: number; y: number; hidden: boolean }[] {
  const MAP_TOP = TAB_H + 8;
  const MAP_H   = FOOT_Y - MAP_TOP;

  // Use floor plan markers when available
  const plan = floorPlans?.find(fp => fp.markers?.length > 0);
  if (plan) {
    return scenes.map(s => {
      const m = plan.markers.find(mk => mk.sceneId === s.id);
      if (!m) return { x: -1, y: -1, hidden: true };
      return {
        x: 24 + m.x * (CW - 48),
        y: MAP_TOP + m.y * MAP_H,
        hidden: false,
      };
    });
  }

  // Fallback: arrange in a circle
  const n  = scenes.length;
  const cx = CW / 2;
  const cy = MAP_TOP + MAP_H / 2;
  const r  = Math.min(CW * 0.34, MAP_H * 0.42);
  return scenes.map((_, i) => ({
    x: cx + Math.cos((i / n) * Math.PI * 2 - Math.PI / 2) * r,
    y: cy + Math.sin((i / n) * Math.PI * 2 - Math.PI / 2) * r,
    hidden: false,
  }));
}

// ── Wrist menu canvas renderer ───────────────────────────────────────────────
function drawWristMenu(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  tab: number,
  scenes: Scene[],
  currentSceneId: string | null | undefined,
  floorPlans?: FloorPlan[],
) {
  const W = CW, H = CH;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = 'rgba(10, 10, 20, 0.97)';
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 28);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#e07b3f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(2, 2, W - 4, H - 4, 26);
  ctx.stroke();

  // ── Tab bar ──────────────────────────────────────────────────────────────
  const TABS = ['📋  Scenes', '🗺  Map'];
  const tabW = W / TABS.length;
  TABS.forEach((label, i) => {
    const active = i === tab;
    if (active) {
      ctx.fillStyle = 'rgba(224,123,63,0.18)';
      ctx.fillRect(i * tabW, 0, tabW, TAB_H);
    }
    ctx.fillStyle = active ? '#e07b3f' : 'rgba(255,255,255,0.45)';
    ctx.font = `${active ? 'bold ' : ''}19px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, (i + 0.5) * tabW, TAB_H / 2);
    if (active) {
      ctx.strokeStyle = '#e07b3f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(i * tabW + 10, TAB_H - 1);
      ctx.lineTo((i + 1) * tabW - 10, TAB_H - 1);
      ctx.stroke();
    }
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Tab divider
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, TAB_H);
  ctx.lineTo(W, TAB_H);
  ctx.stroke();

  // ── SCENES tab ────────────────────────────────────────────────────────────
  if (tab === 0) {
    const LIST_TOP = TAB_H + 14;
    const ROW_H    = 44;
    const maxRows  = Math.floor((FOOT_Y - LIST_TOP) / ROW_H);

    scenes.slice(0, maxRows).forEach((s, i) => {
      const isCurrent = s.id === currentSceneId;
      const y = LIST_TOP + i * ROW_H;
      if (isCurrent) {
        ctx.fillStyle = 'rgba(224,123,63,0.18)';
        ctx.beginPath();
        ctx.roundRect(10, y - 2, W - 20, ROW_H - 4, 8);
        ctx.fill();
      }
      ctx.fillStyle = isCurrent ? '#e07b3f' : 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(26, y + ROW_H / 2 - 2, isCurrent ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isCurrent ? '#e07b3f' : 'rgba(255,255,255,0.8)';
      ctx.font = `${isCurrent ? 'bold ' : ''}21px system-ui, sans-serif`;
      const lbl = s.name.length > 20 ? s.name.slice(0, 19) + '…' : s.name;
      ctx.fillText(lbl, 44, y + ROW_H / 2 + 7);
    });
    if (scenes.length > maxRows) {
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(`+ ${scenes.length - maxRows} more`, 20, FOOT_Y - 6);
    }
  }

  // ── MAP tab ───────────────────────────────────────────────────────────────
  if (tab === 1) {
    const positions = getMapPositions(scenes, floorPlans);

    // Connection lines
    scenes.forEach((s, i) => {
      const from = positions[i];
      if (from.hidden) return;
      s.hotspots?.forEach(hs => {
        if (!hs.targetSceneId) return;
        const ti = scenes.findIndex(sc => sc.id === hs.targetSceneId);
        if (ti < 0 || positions[ti].hidden) return;
        ctx.strokeStyle = 'rgba(255,255,255,0.13)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(positions[ti].x, positions[ti].y);
        ctx.stroke();
      });
    });

    // Scene nodes
    scenes.forEach((s, i) => {
      const pos = positions[i];
      if (pos.hidden) return;
      const isCurrent = s.id === currentSceneId;
      const r = isCurrent ? 18 : 13;
      if (isCurrent) { ctx.shadowColor = '#e07b3f'; ctx.shadowBlur = 14; }
      ctx.fillStyle   = isCurrent ? '#e07b3f' : 'rgba(70,80,110,0.95)';
      ctx.strokeStyle = isCurrent ? '#e07b3f' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'white';
      ctx.font = `bold ${isCurrent ? 13 : 11}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), pos.x, pos.y);
      const name = s.name.length > 9 ? s.name.slice(0, 8) + '…' : s.name;
      ctx.fillStyle = isCurrent ? '#e07b3f' : 'rgba(255,255,255,0.5)';
      ctx.font = `${isCurrent ? 'bold ' : ''}11px system-ui, sans-serif`;
      ctx.fillText(name, pos.x, pos.y + r + 12);
    });

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    // Hint if no floor plan markers
    const hasPlan = floorPlans?.some(fp => fp.markers?.length > 0);
    if (!hasPlan) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Add floor plan markers in the editor', CW / 2, FOOT_Y - 8);
      ctx.textAlign = 'left';
    }
  }

  // ── Shared footer: Exit VR ────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, FOOT_Y); ctx.lineTo(W - 16, FOOT_Y);
  ctx.stroke();

  const btnW = 190, btnH = 30;
  const btnX = (W - btnW) / 2, btnY = FOOT_Y + 6;
  ctx.fillStyle = 'rgba(224,123,63,0.15)';
  ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(224,123,63,0.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 7); ctx.stroke();
  ctx.fillStyle = '#e07b3f';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('⏏  Exit VR  (B button)', W / 2, btnY + btnH / 2);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fisheyeConfigFromFormat(format: PanoramaFormat): FisheyeConfig {
  switch (format) {
    case 'fisheye-dual-sbs':
      return { type: 'dual-sbs', fov: 200, centerX: 0.25, centerY: 0.5, radius: 0.46 };
    case 'fisheye-dual-tb':
      return { type: 'dual-tb', fov: 200, centerX: 0.5, centerY: 0.25, radius: 0.46 };
    default:
      return { type: 'single', fov: 180, centerX: 0.5, centerY: 0.5, radius: 0.92 };
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ImmersiveViewer({
  scene, scenes, onSceneChange, onClose, onChangeTour, autoEnterVR, floorPlans, onAddScene,
}: Props) {
  const overlayRef        = useRef<HTMLDivElement>(null);
  const containerRef      = useRef<HTMLDivElement>(null);
  const rendererRef       = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef         = useRef<THREE.PerspectiveCamera | null>(null);
  const sphereRef         = useRef<THREE.Mesh | null>(null);
  const threeSceneRef     = useRef<THREE.Scene | null>(null);
  const hotspotsGroupRef  = useRef<THREE.Group | null>(null);
  const yawRef            = useRef(scene?.initialYaw ?? 0);
  const pitchRef          = useRef(scene?.initialPitch ?? 0);

  // Keep latest props accessible from animation loop without re-creating it
  const scenesRef        = useRef(scenes);
  const sceneRef         = useRef(scene);
  const onSceneChangeRef = useRef(onSceneChange);
  useEffect(() => { scenesRef.current = scenes; }, [scenes]);
  useEffect(() => { sceneRef.current  = scene;  }, [scene]);
  useEffect(() => { onSceneChangeRef.current = onSceneChange; }, [onSceneChange]);
  useEffect(() => { floorPlansRef.current = floorPlans; }, [floorPlans]);

  // Controller / wrist-menu refs (Three.js objects live here)
  const wristMenuRef = useRef<{
    mesh: THREE.Mesh;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  } | null>(null);
  const wristOpenRef     = useRef(false);  // mirror of React state for animation loop
  const prevBtnsRef      = useRef<{ l: boolean[]; r: boolean[] }>({ l: [], r: [] });
  const leftNavLockRef   = useRef(false);  // debounce left-stick X scene navigation
  const leftYLockRef     = useRef(false);  // debounce left-stick Y tab switching
  const wristTabRef      = useRef(0);      // 0=Scenes, 1=Map
  const floorPlansRef    = useRef(floorPlans);

  const uploadInputRef    = useRef<HTMLInputElement>(null);
  const [uploadPanelOpen, setUploadPanelOpen] = useState(false);
  const [uploadQueue,     setUploadQueue]     = useState<Array<{ name: string; status: 'processing' | 'done' | 'error' }>>([]);

  const [vrSupported,   setVrSupported]  = useState(false);
  const [gyroActive,    setGyroActive]   = useState(false);
  const [gyroAvail,     setGyroAvail]    = useState(false);
  const [wristMenuOpen, setWristMenuOpen] = useState(false);
  const [showVRSplash,  setShowVRSplash] = useState(!!autoEnterVR);

  const sceneIdx = scenes.findIndex(s => s.id === scene?.id);
  const prevScene = sceneIdx > 0 ? scenes[sceneIdx - 1] : null;
  const nextScene = sceneIdx < scenes.length - 1 ? scenes[sceneIdx + 1] : null;

  // ── Three.js + WebXR init ──────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Renderer
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

    // Panorama sphere
    const geo = new THREE.SphereGeometry(500, 64, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x111119, side: THREE.BackSide });
    const sphere = new THREE.Mesh(geo, mat);
    threeScene.add(sphere);
    sphereRef.current = sphere;

    // Hotspot sprite group (rebuilt whenever scene changes)
    const hotspotsGroup = new THREE.Group();
    threeScene.add(hotspotsGroup);
    hotspotsGroupRef.current = hotspotsGroup;

    // ── Controller models + rays ───────────────────────────────────────────
    // Simple geometry (no CDN fetch — works on Quest regardless of network)
    const buildControllerVisual = (tint: number) => {
      const g = new THREE.Group();
      const bodyMat = new THREE.MeshBasicMaterial({ color: tint });
      // Handle
      const handleGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.12, 10);
      handleGeo.rotateX(Math.PI / 2);
      g.add(new THREE.Mesh(handleGeo, bodyMat));
      // Ring guard
      const ringGeo = new THREE.TorusGeometry(0.03, 0.006, 6, 20);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x888899 }));
      ring.position.z = 0.018;
      g.add(ring);
      // Tip dot (direction indicator)
      const tipGeo = new THREE.SphereGeometry(0.008, 6, 6);
      const tip = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      tip.position.z = -0.065;
      g.add(tip);
      return g;
    };

    const buildRay = (color: number) => {
      const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }),
      );
      line.scale.z = 5;
      return line;
    };

    // Right (index 0) — white ray
    const ctrl0     = renderer.xr.getController(0);
    const ctrlGrip0 = renderer.xr.getControllerGrip(0);
    ctrl0.add(buildRay(0xffffff));
    ctrlGrip0.add(buildControllerVisual(0x444455));
    threeScene.add(ctrl0, ctrlGrip0);

    // Left (index 1) — blue-tinted
    const ctrl1     = renderer.xr.getController(1);
    const ctrlGrip1 = renderer.xr.getControllerGrip(1);
    ctrl1.add(buildRay(0x88aaff));
    ctrlGrip1.add(buildControllerVisual(0x334455));
    threeScene.add(ctrl1, ctrlGrip1);

    // ── selectstart events (reliable fallback alongside gamepad polling) ───
    const doSelect = () => {
      const origin = new THREE.Vector3();
      const dir    = new THREE.Vector3();
      ctrl0.getWorldPosition(origin);
      ctrl0.getWorldDirection(dir);
      const rc = new THREE.Raycaster(origin, dir);

      if (wristOpenRef.current && wristMenuRef.current) {
        const hits = rc.intersectObject(wristMenuRef.current.mesh);
        if (hits.length > 0 && hits[0].uv) {
          const uv  = hits[0].uv;
          const hitX = uv.x * CW;
          const hitY = (1 - uv.y) * CH;
          if (hitY < TAB_H) {
            const newTab = hitX < CW / 2 ? 0 : 1;
            wristTabRef.current = newTab;
            const menu = wristMenuRef.current;
            drawWristMenu(menu.ctx, menu.canvas, newTab, scenesRef.current, sceneRef.current?.id, floorPlansRef.current);
            menu.texture.needsUpdate = true;
          } else if (hitY >= FOOT_Y + 6) {
            renderer.xr.getSession()?.end().catch(() => {});
          } else if (wristTabRef.current === 0) {
            const idx = Math.floor((hitY - (TAB_H + 14)) / 44);
            const target = scenesRef.current[idx];
            if (idx >= 0 && target) {
              onSceneChangeRef.current(target.id);
              wristOpenRef.current = false;
              wristMenuRef.current.mesh.visible = false;
              setWristMenuOpen(false);
            }
          } else {
            const positions = getMapPositions(scenesRef.current, floorPlansRef.current);
            let closest = -1, minDist = 32;
            positions.forEach((pos, i) => {
              if (pos.hidden) return;
              const d = Math.hypot(hitX - pos.x, hitY - pos.y);
              if (d < minDist) { minDist = d; closest = i; }
            });
            if (closest >= 0) {
              onSceneChangeRef.current(scenesRef.current[closest].id);
              wristOpenRef.current = false;
              wristMenuRef.current.mesh.visible = false;
              setWristMenuOpen(false);
            }
          }
          return;
        }
      }

      if (hotspotsGroupRef.current?.children.length) {
        const hits = rc.intersectObjects(hotspotsGroupRef.current.children, true);
        if (hits.length > 0) {
          const hs = hits[0].object.userData.hotspot ?? hits[0].object.userData.nav;
          if (hs?.targetSceneId) { onSceneChangeRef.current(hs.targetSceneId); return; }
        }
      }
    };

    const doMenuToggle = () => {
      wristOpenRef.current = !wristOpenRef.current;
      const menu = wristMenuRef.current;
      if (menu) {
        menu.mesh.visible = wristOpenRef.current;
        if (wristOpenRef.current) {
          drawWristMenu(menu.ctx, menu.canvas, wristTabRef.current, scenesRef.current, sceneRef.current?.id, floorPlansRef.current);
          menu.texture.needsUpdate = true;
        }
      }
      setWristMenuOpen(wristOpenRef.current);
    };

    ctrl0.addEventListener('selectstart', doSelect);
    ctrl1.addEventListener('selectstart', doMenuToggle);

    // ── Wrist menu (attached to left grip) ────────────────────────────────
    const menuCanvas  = document.createElement('canvas');
    menuCanvas.width  = 512;
    menuCanvas.height = 384;
    const menuCtx     = menuCanvas.getContext('2d')!;
    const menuTex     = new THREE.CanvasTexture(menuCanvas);
    const menuMesh    = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.165),
      new THREE.MeshBasicMaterial({
        map: menuTex, transparent: true,
        side: THREE.DoubleSide, depthTest: false,
      }),
    );
    // Float above the wrist, angled so it faces the user when palm is up
    menuMesh.position.set(0, 0.07, -0.04);
    menuMesh.rotation.set(-0.65, Math.PI, 0);
    menuMesh.visible = false;
    ctrlGrip1.add(menuMesh);
    wristMenuRef.current = { mesh: menuMesh, canvas: menuCanvas, ctx: menuCtx, texture: menuTex };

    // ── Mouse / touch drag (non-VR) ────────────────────────────────────────
    let pointerDown = false, lastX = 0, lastY = 0;
    const onDown  = (e: PointerEvent) => { pointerDown = true; lastX = e.clientX; lastY = e.clientY; };
    const onMove  = (e: PointerEvent) => {
      if (!pointerDown) return;
      const s = (camera.fov / 75) * 0.003;
      yawRef.current   += (e.clientX - lastX) * s;
      pitchRef.current  = Math.max(-Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05, pitchRef.current - (e.clientY - lastY) * s));
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

    // WebXR support check
    navigator.xr?.isSessionSupported('immersive-vr').then(setVrSupported).catch(() => {});

    renderer.xr.addEventListener('sessionstart', () => camera.rotation.set(0, 0, 0));
    renderer.xr.addEventListener('sessionend',   () => {
      camera.rotation.y = -yawRef.current;
      camera.rotation.x =  pitchRef.current;
    });

    // ── Animation + gamepad loop ───────────────────────────────────────────
    const animate = (_t: number, xrFrame?: XRFrame) => {
      if (xrFrame) {
        const session = renderer.xr.getSession();
        if (session) {
          for (const src of session.inputSources) {
            const gp = src.gamepad;
            if (!gp) continue;

            const isR = src.handedness === 'right';
            const isL = src.handedness === 'left';
            const prev = isR ? prevBtnsRef.current.r : prevBtnsRef.current.l;
            const justPressed = (i: number) => !!gp.buttons[i]?.pressed && !prev[i];

            // ── RIGHT controller ──────────────────────────────────────────
            if (isR) {
              // Thumbstick X → yaw rotation
              const sx = gp.axes[2] ?? 0;
              if (Math.abs(sx) > 0.15) yawRef.current += sx * 0.025;

              // Thumbstick Y → zoom (FOV)
              const sy = gp.axes[3] ?? 0;
              if (Math.abs(sy) > 0.15) {
                camera.fov = Math.max(30, Math.min(110, camera.fov + sy * 0.4));
                camera.updateProjectionMatrix();
              }

              // Trigger (button 0) → menu tap → hotspot ray → gaze fallback
              if (justPressed(0)) {
                const origin = new THREE.Vector3();
                const dir    = new THREE.Vector3();
                ctrl0.getWorldPosition(origin);
                ctrl0.getWorldDirection(dir);
                const rc = new THREE.Raycaster(origin, dir);
                let handled = false;

                // 1. Check wrist menu (highest priority)
                if (wristOpenRef.current && wristMenuRef.current) {
                  const menuHits = rc.intersectObject(wristMenuRef.current.mesh);
                  if (menuHits.length > 0 && menuHits[0].uv) {
                    const uv = menuHits[0].uv;
                    const hitX = uv.x * CW;
                    const hitY = (1 - uv.y) * CH;

                    if (hitY < TAB_H) {
                      // Tab bar click
                      const newTab = hitX < CW / 2 ? 0 : 1;
                      if (newTab !== wristTabRef.current) {
                        wristTabRef.current = newTab;
                        const menu = wristMenuRef.current;
                        drawWristMenu(menu.ctx, menu.canvas, newTab, scenesRef.current, sceneRef.current?.id, floorPlansRef.current);
                        menu.texture.needsUpdate = true;
                      }
                    } else if (hitY >= FOOT_Y + 6) {
                      // Exit VR button
                      renderer.xr.getSession()?.end().catch(() => {});
                    } else if (wristTabRef.current === 0) {
                      // Scenes tab list
                      const LIST_TOP = TAB_H + 14;
                      const ROW_H    = 44;
                      const idx = Math.floor((hitY - LIST_TOP) / ROW_H);
                      const target = scenesRef.current[idx];
                      if (idx >= 0 && target) {
                        onSceneChangeRef.current(target.id);
                        wristOpenRef.current = false;
                        wristMenuRef.current.mesh.visible = false;
                        setWristMenuOpen(false);
                      }
                    } else if (wristTabRef.current === 1) {
                      // Map tab — tap nearest scene node
                      const positions = getMapPositions(scenesRef.current, floorPlansRef.current);
                      let closest = -1, minDist = 32;
                      positions.forEach((pos, i) => {
                        if (pos.hidden) return;
                        const d = Math.hypot(hitX - pos.x, hitY - pos.y);
                        if (d < minDist) { minDist = d; closest = i; }
                      });
                      if (closest >= 0) {
                        onSceneChangeRef.current(scenesRef.current[closest].id);
                        wristOpenRef.current = false;
                        wristMenuRef.current.mesh.visible = false;
                        setWristMenuOpen(false);
                      }
                    }
                    handled = true;
                  }
                }

                // 2. Hotspot sprites
                if (!handled && hotspotsGroupRef.current?.children.length) {
                  const hits = rc.intersectObjects(hotspotsGroupRef.current.children, true);
                  if (hits.length > 0) {
                    const hs = hits[0].object.userData.hotspot;
                    if (hs?.targetSceneId) { onSceneChangeRef.current(hs.targetSceneId); handled = true; }
                  }
                }

                // 3. Gaze fallback
                if (!handled) {
                  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
                  const cur = sceneRef.current;
                  if (cur?.hotspots?.length) {
                    let best: (typeof cur.hotspots)[0] | null = null;
                    let bestAngle = Math.PI / 7;
                    for (const hs of cur.hotspots) {
                      if (!hs.targetSceneId) continue;
                      const d = new THREE.Vector3(
                        -Math.cos(hs.pitch) * Math.sin(hs.yaw),
                         Math.sin(hs.pitch),
                        -Math.cos(hs.pitch) * Math.cos(hs.yaw),
                      ).normalize();
                      const a = fwd.angleTo(d);
                      if (a < bestAngle) { bestAngle = a; best = hs; }
                    }
                    if (best?.targetSceneId) onSceneChangeRef.current(best.targetSceneId);
                  }
                }
              }

              // A button (4) → next scene
              if (justPressed(4)) {
                const all = scenesRef.current;
                const idx = all.findIndex(s => s.id === sceneRef.current?.id);
                if (idx < all.length - 1) onSceneChangeRef.current(all[idx + 1].id);
              }

              // B button (5) → exit VR session
              if (justPressed(5)) {
                renderer.xr.getSession()?.end().catch(() => {});
              }
            }

            // ── LEFT controller ───────────────────────────────────────────
            if (isL) {
              // Thumbstick X → prev / next scene (with stick-release debounce)
              const sx = gp.axes[2] ?? 0;
              if (sx > 0.7 && !leftNavLockRef.current) {
                leftNavLockRef.current = true;
                const all = scenesRef.current;
                const idx = all.findIndex(s => s.id === sceneRef.current?.id);
                if (idx < all.length - 1) onSceneChangeRef.current(all[idx + 1].id);
              } else if (sx < -0.7 && !leftNavLockRef.current) {
                leftNavLockRef.current = true;
                const all = scenesRef.current;
                const idx = all.findIndex(s => s.id === sceneRef.current?.id);
                if (idx > 0) onSceneChangeRef.current(all[idx - 1].id);
              } else if (Math.abs(sx) < 0.3) {
                leftNavLockRef.current = false;
              }

              // Thumbstick Y → switch wrist menu tab (when menu is open)
              const sy = gp.axes[3] ?? 0;
              if (wristOpenRef.current && Math.abs(sy) > 0.7 && !leftYLockRef.current) {
                leftYLockRef.current = true;
                const newTab = sy > 0 ? 1 : 0;
                if (newTab !== wristTabRef.current) {
                  wristTabRef.current = newTab;
                  const menu = wristMenuRef.current;
                  if (menu) {
                    drawWristMenu(menu.ctx, menu.canvas, newTab, scenesRef.current, sceneRef.current?.id, floorPlansRef.current);
                    menu.texture.needsUpdate = true;
                  }
                }
              } else if (Math.abs(sy) < 0.3) {
                leftYLockRef.current = false;
              }

              // Y button (buttons[5]) → toggle wrist menu
              if (justPressed(5)) {
                wristOpenRef.current = !wristOpenRef.current;
                const menu = wristMenuRef.current;
                if (menu) {
                  menu.mesh.visible = wristOpenRef.current;
                  if (wristOpenRef.current) {
                    drawWristMenu(menu.ctx, menu.canvas, wristTabRef.current, scenesRef.current, sceneRef.current?.id, floorPlansRef.current);
                    menu.texture.needsUpdate = true;
                  }
                }
                setWristMenuOpen(wristOpenRef.current);
              }
            }

            // Store previous button states
            const snap = Array.from(gp.buttons).map(b => b.pressed);
            if (isR) prevBtnsRef.current.r = snap;
            if (isL) prevBtnsRef.current.l = snap;
          }

          // Highlight right-controller ray orange when pointing at the wrist menu
          if (wristOpenRef.current && wristMenuRef.current) {
            const origin = new THREE.Vector3();
            const dir    = new THREE.Vector3();
            // Find right controller from inputSources
            for (const src of session.inputSources) {
              if (src.handedness !== 'right') continue;
              ctrl0.getWorldPosition(origin);
              ctrl0.getWorldDirection(dir);
              const rc = new THREE.Raycaster(origin, dir);
              const hits = rc.intersectObject(wristMenuRef.current.mesh);
              const ray = ctrl0.children.find(c => c instanceof THREE.Line) as THREE.Line | undefined;
              if (ray) {
                (ray.material as THREE.LineBasicMaterial).color.set(
                  hits.length > 0 ? 0xe07b3f : 0xffffff,
                );
              }
            }
          }
        }
      } else {
        // Non-VR: apply yaw/pitch from mouse/gyro
        camera.rotation.y = -yawRef.current;
        camera.rotation.x =  pitchRef.current;
        camera.updateProjectionMatrix();
      }
      renderer.render(threeScene, camera);
    };
    renderer.setAnimationLoop(animate);

    // Resize
    const ro = new ResizeObserver(() => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    });
    ro.observe(container);

    if (typeof DeviceOrientationEvent !== 'undefined') setGyroAvail(true);

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

  // ── Rebuild 3D hotspot sprites whenever scene changes ─────────────────────
  useEffect(() => {
    const group = hotspotsGroupRef.current;
    if (!group) return;

    // Clear previous sprites
    while (group.children.length) {
      const child = group.children[0] as THREE.Sprite;
      (child.material as THREE.SpriteMaterial).map?.dispose();
      (child.material as THREE.SpriteMaterial).dispose();
      group.remove(child);
    }

    // If no hotspots, show prev/next navigation arrows so VR navigation is always possible
    if (!scene?.hotspots?.length) {
      const idx = scenes.findIndex(s => s.id === scene?.id);
      const navItems = [
        idx > 0              ? { scene: scenes[idx - 1], yaw: Math.PI,  label: '◀ Prev' } : null,
        idx < scenes.length - 1 ? { scene: scenes[idx + 1], yaw: 0,     label: 'Next ▶' } : null,
      ].filter(Boolean) as { scene: Scene; yaw: number; label: string }[];

      for (const nav of navItems) {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 128;
        const ctx2 = c.getContext('2d')!;
        ctx2.fillStyle = 'rgba(224,123,63,0.85)';
        ctx2.beginPath(); ctx2.roundRect(8, 8, 240, 112, 24); ctx2.fill();
        ctx2.fillStyle = 'white';
        ctx2.font = 'bold 28px system-ui';
        ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
        ctx2.fillText(nav.label, 128, 44);
        ctx2.font = '20px system-ui';
        ctx2.fillStyle = 'rgba(255,255,255,0.7)';
        const lbl = nav.scene.name.length > 16 ? nav.scene.name.slice(0,15)+'…' : nav.scene.name;
        ctx2.fillText(lbl, 128, 84);

        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }),
        );
        sprite.position.set(-8 * Math.sin(nav.yaw), 0, -8 * Math.cos(nav.yaw));
        sprite.scale.set(2.4, 1.2, 1);
        sprite.userData = { nav: { targetSceneId: nav.scene.id } };
        group.add(sprite);
      }
      return;
    }

    const targetSceneMap = new Map(scenes.map(s => [s.id, s.name]));

    for (const hs of scene.hotspots) {
      if (!hs.targetSceneId) continue;
      const targetName = targetSceneMap.get(hs.targetSceneId) ?? 'Go';

      // Draw sprite canvas
      const c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      const ctx = c.getContext('2d')!;

      // Glow
      ctx.shadowColor = '#e07b3f';
      ctx.shadowBlur = 28;
      ctx.fillStyle = 'rgba(224,123,63,0.92)';
      ctx.beginPath();
      ctx.arc(128, 128, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Arrow icon
      ctx.fillStyle = 'white';
      ctx.font = 'bold 80px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('→', 128, 106);

      // Target name
      const label = targetName.length > 11 ? targetName.slice(0, 10) + '…' : targetName;
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillText(label, 128, 182);

      const tex = new THREE.CanvasTexture(c);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
      );

      // Position on inner sphere surface (radius 8, close to camera)
      const r = 8;
      sprite.position.set(
        -r * Math.cos(hs.pitch) * Math.sin(hs.yaw),
         r * Math.sin(hs.pitch),
        -r * Math.cos(hs.pitch) * Math.cos(hs.yaw),
      );
      sprite.scale.set(0.9, 0.9, 1);
      sprite.userData = { hotspot: hs };
      group.add(sprite);
    }
  }, [scene?.id, scene?.hotspots, scenes]);

  // Refresh wrist menu canvas when scene changes while menu is open
  useEffect(() => {
    const menu = wristMenuRef.current;
    if (!menu || !wristOpenRef.current) return;
    drawWristMenu(menu.ctx, menu.canvas, wristTabRef.current, scenes, scene?.id, floorPlansRef.current);
    menu.texture.needsUpdate = true;
  }, [scene?.id, scenes]);

  // ── Load panorama texture ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sphereRef.current || !scene) return;
    const mesh = sphereRef.current;
    const m = mesh.material as THREE.MeshBasicMaterial;

    // Dispose previous texture before loading new one (critical on Quest — VRAM is limited)
    if (m.map) { m.map.dispose(); m.map = null; }
    m.color.set(0x111119); m.needsUpdate = true;

    yawRef.current   = scene.initialYaw   ?? 0;
    pitchRef.current = scene.initialPitch ?? 0;

    if (!scene.imageUrl) return;

    // ── Swap geometry based on format ───────────────────────────────────────
    const ar = scene.aspectRatio ?? 2;
    const oldGeo = mesh.geometry;
    let newGeo: THREE.BufferGeometry;
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
        newGeo = new THREE.SphereGeometry(500, 48, 24, -hFov / 2, hFov, Math.PI / 2 - vFov / 2, vFov);
        break;
      }
      case 'vertical': {
        const vFov2 = Math.PI * 1.2;
        const hFov2 = Math.min(Math.PI * 0.5, vFov2 * (ar ?? 0.4));
        newGeo = new THREE.SphereGeometry(500, 32, 48, -hFov2 / 2, hFov2, Math.PI / 2 - vFov2 / 2, vFov2);
        break;
      }
      default:
        newGeo = new THREE.SphereGeometry(500, 64, 32);
    }
    if (oldGeo !== newGeo) { oldGeo.dispose(); mesh.geometry = newGeo; }

    const applyTexture = (tex: THREE.Texture) => {
      if (!sphereRef.current) { tex.dispose(); return; }
      const mat = sphereRef.current.material as THREE.MeshBasicMaterial;
      if (mat.map) mat.map.dispose();

      tex.colorSpace = THREE.SRGBColorSpace;
      const isRightEye = scene.stereoEye === 'right';
      switch (scene.format) {
        case 'equirectangular-sbs':
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.repeat.set(0.5, 1);
          tex.offset.set(isRightEye ? 0.5 : 0, 0);
          break;
        case 'equirectangular-tb':
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.repeat.set(1, 0.5);
          tex.offset.set(0, isRightEye ? 0 : 0.5);
          break;
        default:
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.repeat.set(1, 1);
          tex.offset.set(0, 0);
      }
      tex.updateMatrix();
      tex.needsUpdate = true;

      mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true;
    };

    let cancelled = false;

    if (scene.format?.startsWith('fisheye')) {
      // ── Fisheye image: CPU-convert to equirectangular (with cache) ─────────
      const cached = fisheyeCache.get(scene.id);
      if (cached) {
        if (!cancelled) applyTexture(new THREE.Texture(cached));
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        if (cancelled) return;
        const MAX = 4096;
        const scale = Math.min(1, MAX / img.naturalWidth, MAX / img.naturalHeight);
        const raw = document.createElement('canvas');
        raw.width  = Math.floor(img.naturalWidth  * scale);
        raw.height = Math.floor(img.naturalHeight * scale);
        raw.getContext('2d')!.drawImage(img, 0, 0, raw.width, raw.height);
        const cfg = scene.fisheyeConfig
          ? { ...scene.fisheyeConfig }
          : fisheyeConfigFromFormat(scene.format as PanoramaFormat);
        const converted = fisheyeToEquirectangular(raw, cfg);
        fisheyeCache.set(scene.id, converted);
        if (!cancelled) applyTexture(new THREE.Texture(converted));
      };
      img.src = scene.imageUrl;
    } else {
      new THREE.TextureLoader().load(scene.imageUrl, (tex) => {
        if (cancelled) { tex.dispose(); return; }
        applyTexture(tex);
      });
    }

    return () => { cancelled = true; };
  }, [scene?.id, scene?.imageUrl, scene?.format]);

  // ── Gyroscope ─────────────────────────────────────────────────────────────
  const gyroCleanupRef = useRef<(() => void) | null>(null);

  const enableGyro = useCallback(async () => {
    const handler = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null) return;
      yawRef.current   = -THREE.MathUtils.degToRad(e.alpha ?? 0);
      pitchRef.current = Math.max(-Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05, THREE.MathUtils.degToRad((e.beta ?? 90) - 90)));
    };
    try {
      const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof DOE.requestPermission === 'function') {
        if (await DOE.requestPermission() !== 'granted') return;
      }
      window.addEventListener('deviceorientation', handler);
      setGyroActive(true);
      gyroCleanupRef.current = () => {
        window.removeEventListener('deviceorientation', handler);
        setGyroActive(false);
      };
    } catch { /* denied */ }
  }, []);

  const disableGyro = useCallback(() => {
    gyroCleanupRef.current?.();
    gyroCleanupRef.current = null;
  }, []);

  useEffect(() => () => { gyroCleanupRef.current?.(); }, []);

  // ── Batch upload ───────────────────────────────────────────────────────────
  const handleUploadFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length || !onAddScene) return;

    for (const file of files) {
      const name = file.name.replace(/\.[^.]+$/, '');
      setUploadQueue(q => [...q, { name, status: 'processing' }]);
      try {
        const detection = await detectPanorama(file);
        const imageUrl  = await fileToDataUrl(file);
        const thumbnail = await generateThumbnail(imageUrl);
        const id = onAddScene(imageUrl, name, detection.format, detection.mediaType, thumbnail, detection.aspectRatio);
        setUploadQueue(q => q.map(item => item.name === name ? { ...item, status: 'done' } : item));
        onSceneChange(id);
      } catch (err) {
        console.warn('Upload failed for', file.name, err);
        setUploadQueue(q => q.map(item => item.name === name ? { ...item, status: 'error' } : item));
      }
    }
  }, [onAddScene, onSceneChange]);

  // ── Enter WebXR ────────────────────────────────────────────────────────────
  const enterVR = useCallback(async () => {
    if (!rendererRef.current || !navigator.xr) return;
    try {
      const overlayRoot = overlayRef.current ?? undefined;
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: [
          'local-floor', 'bounded-floor', 'hand-tracking',
          ...(overlayRoot ? ['dom-overlay'] : []),
        ],
        ...(overlayRoot ? { domOverlay: { root: overlayRoot } } : {}),
      } as XRSessionInit);
      rendererRef.current.xr.setSession(session);
    } catch (e) { console.warn('WebXR failed:', e); }
  }, []);

  useEffect(() => {
    if (autoEnterVR) setShowVRSplash(true);
  }, [autoEnterVR]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 bg-black" style={{ touchAction: 'none' }}>

      <div ref={containerRef} className="w-full h-full" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-4 pb-8 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,0.6),transparent)' }}>

        <div className="pointer-events-auto flex items-center gap-2">
          {onChangeTour && (
            <button onClick={onChangeTour} title="Back to tours"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs border border-white/20 hover:bg-white/10 transition-colors"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
              <ArrowLeft size={13} /> Tours
            </button>
          )}
          {gyroAvail && (
            <button onClick={gyroActive ? disableGyro : enableGyro}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs border transition-colors"
              style={{
                background:   gyroActive ? 'rgba(224,123,63,0.25)' : 'rgba(0,0,0,0.6)',
                borderColor:  gyroActive ? 'rgba(224,123,63,0.7)'  : 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
              }}>
              <Smartphone size={13} />
              {gyroActive ? 'Gyro ON' : 'Gyro'}
            </button>
          )}
        </div>

        <div className="pointer-events-none px-4 py-1.5 rounded-full text-white text-sm font-medium"
          style={{ background:'rgba(0,0,0,0.5)', backdropFilter:'blur(6px)', border:'1px solid rgba(255,255,255,0.1)' }}>
          {scene?.name ?? ''}
        </div>

        <button onClick={onClose}
          className="pointer-events-auto w-9 h-9 flex items-center justify-center rounded-xl text-white border border-white/20 hover:bg-white/10 transition-colors"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <X size={16} />
        </button>
      </div>

      {/* Look-around hint */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ opacity: 0.3 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="white" strokeWidth="1.5" strokeDasharray="4 3"/>
          <path d="M20 32 Q32 20 44 32 Q32 44 20 32Z" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1"/>
          <circle cx="32" cy="32" r="4" fill="white" fillOpacity="0.6"/>
          <path d="M15 32 L10 32 M49 32 L54 32 M32 15 L32 10 M32 49 L32 54" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Controller hint (shown in VR) */}
      {wristMenuOpen && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 pointer-events-none px-4 py-2 rounded-full text-white/60 text-xs"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
          Wrist menu open — Y to close
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-6 pt-12 flex flex-col items-center gap-4"
        style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.65),transparent)' }}>

        {/* Hidden file input — single pick per tap, works on all browsers */}
        {onAddScene && (
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadFiles}
          />
        )}

        {/* Upload panel */}
        {uploadPanelOpen && onAddScene && (
          <div className="w-full max-w-sm rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Add Panorama Scenes</span>
              <button onClick={() => { setUploadPanelOpen(false); setUploadQueue([]); }}
                className="text-white/40 hover:text-white text-lg leading-none">✕</button>
            </div>

            {/* Queue list */}
            {uploadQueue.length > 0 && (
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                {uploadQueue.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    {item.status === 'processing' && (
                      <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0" />
                    )}
                    {item.status === 'done'       && <span className="text-green-400 flex-shrink-0">✓</span>}
                    {item.status === 'error'      && <span className="text-red-400 flex-shrink-0">✗</span>}
                    <span className="text-white/70 truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Browse button */}
            <button onClick={() => uploadInputRef.current?.click()}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(224,123,63,0.9)', color: 'white', border: 'none' }}>
              <Upload size={14} className="inline mr-2" />
              {uploadQueue.length === 0 ? 'Browse & pick a panorama' : 'Pick another panorama'}
            </button>
            <p className="text-white/25 text-xs text-center">Tap once per image — tap again to add more</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={vrSupported ? enterVR : undefined}
            title={vrSupported ? 'Enter immersive VR' : 'Open in Meta Quest Browser (HTTPS) for VR'}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold border transition-all"
            style={{
              background:   vrSupported ? 'rgba(224,123,63,0.9)' : 'rgba(60,60,70,0.75)',
              borderColor:  vrSupported ? 'rgba(224,123,63,1)'   : 'rgba(255,255,255,0.12)',
              color:        vrSupported ? 'white'                : 'rgba(255,255,255,0.4)',
              backdropFilter: 'blur(10px)',
              cursor:       vrSupported ? 'pointer' : 'default',
              boxShadow:    vrSupported ? '0 0 24px rgba(224,123,63,0.4)' : 'none',
            }}>
            <Glasses size={18} />
            {vrSupported ? 'Enter VR' : 'VR not available in this browser'}
          </button>

          {onAddScene && (
            <button onClick={() => setUploadPanelOpen(p => !p)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium border transition-all hover:bg-white/10"
              style={{
                background:  uploadPanelOpen ? 'rgba(224,123,63,0.2)' : 'rgba(0,0,0,0.55)',
                borderColor: uploadPanelOpen ? 'rgba(224,123,63,0.7)' : 'rgba(255,255,255,0.18)',
                color: uploadPanelOpen ? '#e07b3f' : 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(8px)',
              }}>
              <Upload size={14} />
              Add Scenes{uploadQueue.filter(q => q.status === 'done').length > 0
                ? ` (${uploadQueue.filter(q => q.status === 'done').length} added)`
                : ''}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => prevScene && onSceneChange(prevScene.id)} disabled={!prevScene}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white border border-white/15 disabled:opacity-25 hover:bg-white/10 transition-colors"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-2">
            {scenes.map((s, i) => (
              <button key={s.id} onClick={() => onSceneChange(s.id)} title={s.name}
                className="rounded-full transition-all"
                style={{
                  width:      i === sceneIdx ? 20 : 8,
                  height:     8,
                  background: i === sceneIdx ? '#e07b3f' : 'rgba(255,255,255,0.35)',
                }} />
            ))}
          </div>

          <button onClick={() => nextScene && onSceneChange(nextScene.id)} disabled={!nextScene}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white border border-white/15 disabled:opacity-25 hover:bg-white/10 transition-colors"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Controller cheat-sheet (visible in flat / 2D mode) */}
        <div className="flex items-center gap-3 text-white/25 text-xs">
          <span>🎮 Right stick: look/zoom</span>
          <span>·</span>
          <span>Left stick ←→: scenes</span>
          <span>·</span>
          <span>Trigger: hotspot</span>
          <span>·</span>
          <span>Y: wrist menu</span>
        </div>
      </div>

      {/* VR splash */}
      {showVRSplash && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-8"
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}>
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
          <button
            onClick={() => { setShowVRSplash(false); if (vrSupported) enterVR(); }}
            className="flex items-center gap-3 rounded-2xl font-bold text-lg border-2 transition-all active:scale-95"
            style={{
              padding: '18px 48px', minWidth: 240, justifyContent: 'center',
              background:   vrSupported ? '#e07b3f' : 'rgba(255,255,255,0.08)',
              borderColor:  vrSupported ? '#e07b3f' : 'rgba(255,255,255,0.15)',
              color: 'white',
              boxShadow:    vrSupported ? '0 0 40px rgba(224,123,63,0.5)' : 'none',
              cursor: 'pointer',
            }}>
            <Glasses size={24} />
            {vrSupported ? 'Enter VR' : 'View in 360°'}
          </button>
          <button onClick={() => setShowVRSplash(false)}
            className="text-white/30 text-sm hover:text-white/60 transition-colors">
            Continue in flat mode
          </button>
        </div>
      )}
    </div>
  );
}
