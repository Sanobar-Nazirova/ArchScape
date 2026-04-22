import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
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

// ── Wrist menu canvas renderer ───────────────────────────────────────────────
function drawWristMenu(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  scenes: Scene[],
  currentSceneId: string | null | undefined,
) {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = 'rgba(10, 10, 20, 0.96)';
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 28);
  ctx.fill();

  // Orange border
  ctx.strokeStyle = '#e07b3f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(2, 2, W - 4, H - 4, 26);
  ctx.stroke();

  // Header
  ctx.fillStyle = '#e07b3f';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('🏛  ArchScape', 22, 50);

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 66);
  ctx.lineTo(W - 20, 66);
  ctx.stroke();

  // Section label
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('SCENES', 22, 92);

  // Scene list (clip to available height)
  const listTop = 108;
  const rowH = 46;
  const maxRows = Math.floor((H - listTop - 36) / rowH);

  scenes.slice(0, maxRows).forEach((s, i) => {
    const isCurrent = s.id === currentSceneId;
    const y = listTop + i * rowH;

    if (isCurrent) {
      ctx.fillStyle = 'rgba(224,123,63,0.18)';
      ctx.beginPath();
      ctx.roundRect(12, y - 26, W - 24, 36, 8);
      ctx.fill();
    }

    ctx.fillStyle = isCurrent ? '#e07b3f' : 'rgba(255,255,255,0.78)';
    ctx.font = isCurrent ? 'bold 22px system-ui, sans-serif' : '22px system-ui, sans-serif';
    const num = String(i + 1).padStart(2, ' ');
    ctx.fillText(`${num}.  ${s.name}`, 24, y);
  });

  if (scenes.length > maxRows) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(`+ ${scenes.length - maxRows} more…`, 24, listTop + maxRows * rowH);
  }

  // Exit VR button
  const btnW = 180, btnH = 32;
  const btnX = (W - btnW) / 2, btnY = H - 42;
  ctx.fillStyle = 'rgba(224,123,63,0.18)';
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,123,63,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#e07b3f';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⏏  Exit VR  (B button)', W / 2, btnY + btnH / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ImmersiveViewer({
  scene, scenes, onSceneChange, onClose, onChangeTour, autoEnterVR,
}: Props) {
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

  // Controller / wrist-menu refs (Three.js objects live here)
  const wristMenuRef = useRef<{
    mesh: THREE.Mesh;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  } | null>(null);
  const wristOpenRef     = useRef(false);  // mirror of React state for animation loop
  const prevBtnsRef      = useRef<{ l: boolean[]; r: boolean[] }>({ l: [], r: [] });
  const leftNavLockRef   = useRef(false);  // debounce left-stick scene navigation

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
    const ctrlFactory = new XRControllerModelFactory();

    const buildRay = (color: number) => {
      const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }),
      );
      line.scale.z = 4;
      return line;
    };

    // Right (index 0) — white ray
    const ctrl0     = renderer.xr.getController(0);
    const ctrlGrip0 = renderer.xr.getControllerGrip(0);
    ctrl0.add(buildRay(0xffffff));
    ctrlGrip0.add(ctrlFactory.createControllerModel(ctrlGrip0));
    threeScene.add(ctrl0, ctrlGrip0);

    // Left (index 1) — pale-blue ray
    const ctrl1     = renderer.xr.getController(1);
    const ctrlGrip1 = renderer.xr.getControllerGrip(1);
    ctrl1.add(buildRay(0x88aaff));
    ctrlGrip1.add(ctrlFactory.createControllerModel(ctrlGrip1));
    threeScene.add(ctrl1, ctrlGrip1);

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
                    // Canvas is 512×384; UV y is flipped relative to canvas y
                    const cy = (1 - uv.y) * 384;
                    const LIST_TOP = 108, ROW_H = 46;
                    const EXIT_BTN_Y = 342; // H - 42

                    if (cy >= EXIT_BTN_Y) {
                      // Exit VR button
                      renderer.xr.getSession()?.end().catch(() => {});
                    } else if (cy >= LIST_TOP) {
                      const idx = Math.floor((cy - LIST_TOP) / ROW_H);
                      const target = scenesRef.current[idx];
                      if (target) {
                        onSceneChangeRef.current(target.id);
                        // Close menu after selection
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

              // Y button (buttons[5]) → toggle wrist menu
              if (justPressed(5)) {
                wristOpenRef.current = !wristOpenRef.current;
                const menu = wristMenuRef.current;
                if (menu) {
                  menu.mesh.visible = wristOpenRef.current;
                  if (wristOpenRef.current) {
                    drawWristMenu(menu.ctx, menu.canvas, scenesRef.current, sceneRef.current?.id);
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

    if (!scene?.hotspots?.length) return;

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
    drawWristMenu(menu.ctx, menu.canvas, scenes, scene?.id);
    menu.texture.needsUpdate = true;
  }, [scene?.id, scenes]);

  // ── Load panorama texture ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sphereRef.current || !scene) return;
    const m = sphereRef.current.material as THREE.MeshBasicMaterial;
    yawRef.current   = scene.initialYaw   ?? 0;
    pitchRef.current = scene.initialPitch ?? 0;
    m.map = null; m.color.set(0x111119); m.needsUpdate = true;
    if (!scene.imageUrl) return;
    new THREE.TextureLoader().load(scene.imageUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      if (sphereRef.current) {
        const mat = sphereRef.current.material as THREE.MeshBasicMaterial;
        mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true;
      }
    });
  }, [scene?.id, scene?.imageUrl]);

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

  // ── Enter WebXR ────────────────────────────────────────────────────────────
  const enterVR = useCallback(async () => {
    if (!rendererRef.current || !navigator.xr) return;
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      });
      rendererRef.current.xr.setSession(session);
    } catch (e) { console.warn('WebXR failed:', e); }
  }, []);

  useEffect(() => {
    if (autoEnterVR) setShowVRSplash(true);
  }, [autoEnterVR]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black" style={{ touchAction: 'none' }}>

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
