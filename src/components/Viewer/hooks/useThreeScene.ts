import { useEffect, useRef } from 'react';
import type React from 'react';
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory }       from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { yawPitchToWorld }          from '../../../utils/sphereCoords';
import { makeSphereMat }            from '../materials/sphereMat';
import type { Scene, Hotspot, FloorPlan } from '../../../types';

export function useThreeScene(params: {
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  yawRef: React.MutableRefObject<number>;
  pitchRef: React.MutableRefObject<number>;
  fovRef: React.MutableRefObject<number>;
  videoElRef: React.MutableRefObject<HTMLVideoElement | null>;
  textureRef: React.MutableRefObject<THREE.Texture | null>;
  shaderMatRef: React.MutableRefObject<THREE.ShaderMaterial | null>;
  sceneRef: React.MutableRefObject<Scene | null>;
  scenesRef: React.MutableRefObject<Scene[]>;
  floorPlansRef: React.MutableRefObject<FloorPlan[]>;
  hotspotContainersRef: React.MutableRefObject<Map<string, HTMLDivElement>>;
  mediaContainersRef: React.MutableRefObject<Map<string, HTMLDivElement>>;
  hotspotLabelSpritesRef: React.MutableRefObject<Map<string, THREE.Sprite>>;
  draggingHotspotRef: React.MutableRefObject<{ id: string; yaw: number; pitch: number } | null>;
  onHotspotClickRef: React.MutableRefObject<(hotspot: Hotspot) => void>;
  setActiveSceneRef: React.MutableRefObject<(id: string) => void>;
  setActiveFloorPlanRef: React.MutableRefObject<(id: string | null) => void>;
  audioElemsRef: React.MutableRefObject<HTMLAudioElement[]>;
  audioGainsRef: React.MutableRefObject<GainNode[]>;
  setIsInVR: (v: boolean) => void;
  setMinimapYaw: (v: number) => void;
}): {
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  threeSceneRef: React.MutableRefObject<THREE.Scene | null>;
  sphereRef: React.MutableRefObject<THREE.Mesh | null>;
  enterVR: () => Promise<void>;
} {
  const {
    containerRef, yawRef, pitchRef, fovRef,
    videoElRef, textureRef, shaderMatRef,
    sceneRef, scenesRef, floorPlansRef,
    hotspotContainersRef, mediaContainersRef, hotspotLabelSpritesRef,
    draggingHotspotRef, onHotspotClickRef,
    setActiveSceneRef, setActiveFloorPlanRef,
    audioElemsRef, audioGainsRef,
    setIsInVR, setMinimapYaw,
  } = params;

  const rendererRef   = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef     = useRef<THREE.PerspectiveCamera | null>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const sphereRef     = useRef<THREE.Mesh | null>(null);

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

    const camera = new THREE.PerspectiveCamera(90, container.clientWidth / container.clientHeight, 0.01, 500);
    camera.rotation.order = 'YXZ';
    cameraRef.current = camera;

    const geo  = new THREE.SphereGeometry(100, 64, 32);
    const mat  = makeSphereMat();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    threeScene.add(mesh);
    sphereRef.current = mesh;

    // ── WebXR controllers ─────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const tmpMat    = new THREE.Matrix4();

    const makeRay = (color: number) => {
      const rayMat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false });
      const rayMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.001, 2, 6), rayMat);
      rayMesh.position.set(0, 0, -1);
      rayMesh.rotation.x = Math.PI / 2;
      rayMesh.renderOrder = 2;
      return rayMesh;
    };

    // ── Left controller panel (popup) ─────────────────────────────────
    const PW = 0.22, PH = 0.28;
    const PX = 512,  PY = Math.round(512 * PH / PW);
    const ROWS_VISIBLE = 5;

    let panelOpen      = false;
    let panelTab: 'scenes' | 'floorplan' = 'scenes';
    let panelScroll    = 0;
    let audioMuted     = false;
    let prevSqueeze    = false;
    let prevLeftPinch  = false;
    let prevRightPinch = false;
    let hoveredAction:    string | null = null;
    let pressedAction:    string | null = null;
    let fpDetailId:       string | null = null;
    let hoveredHotspotId: string | null = null;
    let clickAnim: { hotspotId: string; t0: number } | null = null;
    const fpImgCache = new Map<string, HTMLImageElement>();

    const panelCvs = document.createElement('canvas');
    panelCvs.width = PX; panelCvs.height = PY;
    const panelTex  = new THREE.CanvasTexture(panelCvs);
    const panelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(PW, PH),
      new THREE.MeshBasicMaterial({ map: panelTex, transparent: true, side: THREE.DoubleSide, depthTest: false }),
    );
    panelMesh.visible = false;
    panelMesh.renderOrder = 1;
    panelMesh.position.set(0.01, 0.18, -0.08);
    panelMesh.rotation.x = -0.4;
    panelMesh.userData.isPanel = true;

    type PanelBtn = { mesh: THREE.Mesh; action: string };
    let panelBtns: PanelBtn[] = [];
    const panelGroup = new THREE.Group();
    panelGroup.add(panelMesh);

    const pc = panelCvs.getContext('2d')!;
    const fillRR = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
      pc.fillStyle = fill; pc.beginPath(); pc.roundRect(x, y, w, h, r); pc.fill();
    };
    const strokeRR = (x: number, y: number, w: number, h: number, r: number, stroke: string, lw: number) => {
      pc.strokeStyle = stroke; pc.lineWidth = lw; pc.beginPath(); pc.roundRect(x, y, w, h, r); pc.stroke();
    };

    const makePanelHitPlane = (nx: number, ny: number, nw: number, nh: number, action: string): THREE.Mesh => {
      const hitMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(nw * PW, nh * PH),
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide, depthTest: false }),
      );
      hitMesh.position.set((nx + nw / 2 - 0.5) * PW, -(ny + nh / 2 - 0.5) * PH, 0.002);
      hitMesh.userData.action = action;
      panelMesh.add(hitMesh);
      return hitMesh;
    };

    const getFpImage = (fp: { id: string; imageUrl: string }): HTMLImageElement | null => {
      if (fpImgCache.has(fp.id)) return fpImgCache.get(fp.id)!;
      const img = new window.Image() as HTMLImageElement;
      img.src = fp.imageUrl;
      if (img.complete) { fpImgCache.set(fp.id, img); return img; }
      img.onload  = () => { fpImgCache.set(fp.id, img); setTimeout(redrawPanel, 0); };
      img.onerror = () => { fpImgCache.set(fp.id, img); };
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

      fillRR(0, 0, PX, PY, 24, 'rgba(14,14,22,0.96)');
      strokeRR(1, 1, PX - 2, PY - 2, 23, 'rgba(224,123,63,0.6)', 3);

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

      pc.strokeStyle = 'rgba(224,123,63,0.25)'; pc.lineWidth = 1;
      pc.beginPath(); pc.moveTo(PX * 0.03, tabBarH); pc.lineTo(PX * 0.97, tabBarH); pc.stroke();

      const contentTop = tabBarH + PY * 0.01;

      panelBtns.forEach(b => {
        panelMesh.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.MeshBasicMaterial).dispose();
      });
      panelBtns = [];
      tabs.forEach((t, i) => {
        const nx = 0.02 + i * ((0.47 + 0.02));
        panelBtns.push({ mesh: makePanelHitPlane(nx, 0.01, 0.47, tabBarH / PY * 0.82, `tab:${t.key}`), action: `tab:${t.key}` });
      });

      if (panelTab === 'scenes') {
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
          if (isPressed)      fillRR(PX * 0.03, y, PX * 0.94, rowH, 10, 'rgba(255,255,255,0.18)');
          else if (isActive)  fillRR(PX * 0.03, y, PX * 0.94, rowH, 10, 'rgba(224,123,63,0.22)');
          else if (isHovered) fillRR(PX * 0.03, y, PX * 0.94, rowH, 10, 'rgba(255,255,255,0.08)');
          strokeRR(PX * 0.03, y, PX * 0.94, rowH, 10,
            isPressed ? '#fff' : isActive ? '#e07b3f' : isHovered ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.08)',
            isPressed ? 2.5 : isActive ? 2.5 : isHovered ? 1.5 : 1);
          fillRR(PX * 0.055, y + rowH * 0.2, PX * 0.09, rowH * 0.6, 6,
            isPressed ? '#fff' : isActive ? '#e07b3f' : isHovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)');
          pc.fillStyle = (isActive || isHovered || isPressed) ? (isPressed ? '#222' : '#fff') : 'rgba(224,221,216,0.6)';
          pc.font = `bold ${PX * 0.042}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          pc.fillText(String(panelScroll + i + 1), PX * 0.1, y + rowH * 0.5);
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
          const fx   = PX * 0.03 + i * (fbW + PX * 0.02);
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

      if (panelTab === 'floorplan') {
        const allFp   = floorPlansRef.current;
        const detailFp = allFp.find(f => f.id === fpDetailId) ?? null;

        if (allFp.length === 0) {
          pc.fillStyle = 'rgba(224,221,216,0.4)';
          pc.font = `${PX * 0.044}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          pc.fillText('No floor plans added', PX / 2, contentTop + (PY - contentTop) / 2);

        } else if (!detailFp) {
          pc.fillStyle = 'rgba(224,221,216,0.5)';
          pc.font = `${PX * 0.036}px Inter,sans-serif`;
          pc.textAlign = 'left'; pc.textBaseline = 'middle';
          pc.fillText('Select a floor plan', PX * 0.05, contentTop + PY * 0.03);

          const rowH   = PY * 0.115;
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
            pc.fillStyle = '#3bbfb5';
            pc.font = `bold ${PX * 0.05}px Inter,sans-serif`;
            pc.textAlign = 'center'; pc.textBaseline = 'middle';
            pc.fillText('🗺', PX * 0.11, y + rowH * 0.5);
            pc.fillStyle = act || prs ? '#fff' : 'rgba(224,221,216,0.9)';
            pc.font = `${act || prs ? 'bold ' : ''}${PX * 0.044}px Inter,sans-serif`;
            pc.textAlign = 'left'; pc.textBaseline = 'middle';
            let nm = fp.name;
            while (pc.measureText(nm).width > PX * 0.55 && nm.length > 3) nm = nm.slice(0, -2) + '…';
            pc.fillText(nm, PX * 0.18, y + rowH * 0.38);
            pc.fillStyle = 'rgba(224,221,216,0.4)';
            pc.font = `${PX * 0.033}px Inter,sans-serif`;
            pc.fillText(`${fp.markers.length} location${fp.markers.length !== 1 ? 's' : ''}`, PX * 0.18, y + rowH * 0.68);
            if (hasMark) {
              fillRR(PX * 0.72, y + rowH * 0.22, PX * 0.195, rowH * 0.56, 6, 'rgba(224,123,63,0.25)');
              pc.fillStyle = '#e07b3f'; pc.font = `bold ${PX * 0.03}px Inter,sans-serif`;
              pc.textAlign = 'center'; pc.textBaseline = 'middle';
              pc.fillText('📍 Here', PX * 0.815, y + rowH * 0.5);
            }
            panelBtns.push({ mesh: makePanelHitPlane(0.04, y / PY, 0.92, rowH / PY, `fp-detail:${fp.id}`), action: `fp-detail:${fp.id}` });
          });

        } else {
          panelMesh.scale.set(1.25, 1.4, 1);

          const hdrH   = PY * 0.09;
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

          const pvHov = hoveredAction === 'fp-prev', pvPrs = pressedAction === 'fp-prev';
          fillRR(PX * 0.23, contentTop + PY * 0.005, PX * 0.1, hdrH * 0.78, 6,
            !hasPrev ? 'rgba(255,255,255,0.02)' : pvPrs ? 'rgba(59,191,181,0.45)' : pvHov ? 'rgba(59,191,181,0.2)' : 'rgba(255,255,255,0.06)');
          pc.fillStyle = !hasPrev ? 'rgba(255,255,255,0.15)' : pvPrs || pvHov ? '#3bbfb5' : 'rgba(224,221,216,0.7)';
          pc.font = `bold ${PX * 0.045}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          pc.fillText('◀', PX * 0.28, contentTop + hdrH * 0.44);
          if (hasPrev) panelBtns.push({ mesh: makePanelHitPlane(0.23, (contentTop + PY * 0.005) / PY, 0.1, hdrH * 0.78 / PY, 'fp-prev'), action: 'fp-prev' });

          pc.fillStyle = '#3bbfb5';
          pc.font = `bold ${PX * 0.038}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          let hdrName = detailFp.name;
          while (pc.measureText(hdrName).width > PX * 0.36 && hdrName.length > 3) hdrName = hdrName.slice(0, -2) + '…';
          pc.fillText(hdrName, PX * 0.5, contentTop + hdrH * 0.44);

          const nxHov = hoveredAction === 'fp-next', nxPrs = pressedAction === 'fp-next';
          fillRR(PX * 0.67, contentTop + PY * 0.005, PX * 0.1, hdrH * 0.78, 6,
            !hasNext ? 'rgba(255,255,255,0.02)' : nxPrs ? 'rgba(59,191,181,0.45)' : nxHov ? 'rgba(59,191,181,0.2)' : 'rgba(255,255,255,0.06)');
          pc.fillStyle = !hasNext ? 'rgba(255,255,255,0.15)' : nxPrs || nxHov ? '#3bbfb5' : 'rgba(224,221,216,0.7)';
          pc.font = `bold ${PX * 0.045}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          pc.fillText('▶', PX * 0.72, contentTop + hdrH * 0.44);
          if (hasNext) panelBtns.push({ mesh: makePanelHitPlane(0.67, (contentTop + PY * 0.005) / PY, 0.1, hdrH * 0.78 / PY, 'fp-next'), action: 'fp-next' });

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
              const hl = Math.min(mx - r - 4, tagX), hr = Math.max(mx + r + 4, tagX + tagW);
              if (!isAct) panelBtns.push({ mesh: makePanelHitPlane(hl / PX, (my - r - 4) / PY, (hr - hl) / PX, (tagY + tagH + 2 - (my - r - 4)) / PY, `scene:${sc.id}`), action: `scene:${sc.id}` });
            }
          } else {
            pc.fillStyle = 'rgba(224,221,216,0.3)'; pc.font = `${PX * 0.04}px Inter,sans-serif`;
            pc.textAlign = 'center'; pc.textBaseline = 'middle';
            pc.fillText('Loading…', imgAreaX + imgAreaW / 2, imgAreaY + imgAreaH / 2);
          }

          const footY   = PY - footerH;
          const exitHov = hoveredAction === 'exit', exitPrs = pressedAction === 'exit';
          fillRR(PX * 0.69, footY, PX * 0.28, footerH * 0.78, 8, exitPrs ? '#e05454cc' : exitHov ? '#e0545455' : '#e0545422');
          strokeRR(PX * 0.69, footY, PX * 0.28, footerH * 0.78, 8, '#e05454', exitPrs ? 2.5 : 1.5);
          pc.fillStyle = exitPrs ? '#fff' : '#e05454'; pc.font = `bold ${PX * 0.036}px Inter,sans-serif`;
          pc.textAlign = 'center'; pc.textBaseline = 'middle';
          pc.fillText('✕ Exit VR', PX * 0.69 + PX * 0.14, footY + footerH * 0.39);
          panelBtns.push({ mesh: makePanelHitPlane(0.69, footY / PY, 0.28, footerH * 0.78 / PY, 'exit'), action: 'exit' });
        }

        if (!detailFp) panelMesh.scale.set(1, 1, 1);
      }

      panelTex.needsUpdate = true;
    };

    const activatePanelAction = (action: string) => {
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
    const xrProfilesBase = window.location.href.replace(/\/[^/]*$/, '') + '/xr-profiles';
    const controllerModelFactory = new XRControllerModelFactory();
    controllerModelFactory.path  = xrProfilesBase;
    const handModelFactory = new XRHandModelFactory();

    const leftCtrl  = renderer.xr.getController(0);
    const rightCtrl = renderer.xr.getController(1);

    const leftRay = makeRay(0xe07b3f);
    leftCtrl.add(leftRay);
    leftCtrl.add(panelGroup);
    threeScene.add(leftCtrl);

    const rightRay = makeRay(0x3bbfb5);
    rightCtrl.add(rightRay);
    threeScene.add(rightCtrl);

    const leftGrip  = renderer.xr.getControllerGrip(0);
    const rightGrip = renderer.xr.getControllerGrip(1);
    leftGrip.add(controllerModelFactory.createControllerModel(leftGrip));
    rightGrip.add(controllerModelFactory.createControllerModel(rightGrip));
    threeScene.add(leftGrip);
    threeScene.add(rightGrip);

    const leftHand  = renderer.xr.getHand(0);
    const rightHand = renderer.xr.getHand(1);
    leftHand.add(handModelFactory.createHandModel(leftHand, 'spheres'));
    rightHand.add(handModelFactory.createHandModel(rightHand, 'spheres'));
    threeScene.add(leftHand);
    threeScene.add(rightHand);

    const makePinchDot = (color: number) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 10, 10),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, depthTest: false }),
      );
      m.renderOrder = 3;
      m.visible = false;
      threeScene.add(m);
      return m;
    };
    const leftPinchDot  = makePinchDot(0xe07b3f);
    const rightPinchDot = makePinchDot(0x3bbfb5);

    const togglePanel = () => {
      panelOpen = !panelOpen;
      panelMesh.visible = panelOpen;
      leftRay.visible   = !panelOpen;
      if (panelOpen) {
        panelScroll = Math.max(0, (scenesRef.current.findIndex(s => s.id === sceneRef.current?.id) ?? 0) - 1);
        redrawPanel();
      } else {
        fpDetailId = null;
        panelMesh.scale.set(1, 1, 1);
      }
    };

    const triggerSelect = () => {
      tmpMat.identity().extractRotation(rightCtrl.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(rightCtrl.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat).normalize();
      if (panelOpen && panelBtns.length > 0) {
        const hits = raycaster.intersectObjects(panelBtns.map(b => b.mesh));
        if (hits.length > 0) { activatePanelAction(hits[0].object.userData.action as string); return; }
      }
      const sc = sceneRef.current;
      if (!sc) return;
      const origin = raycaster.ray.origin.clone();
      const dir    = raycaster.ray.direction.clone();
      let best: { hs: Hotspot; proj: number } | null = null;
      for (const hs of sc.hotspots) {
        const wp  = yawPitchToWorld(hs.yaw, hs.pitch);
        const pos = new THREE.Vector3(wp.x, wp.y, wp.z).normalize().multiplyScalar(490);
        const toP = pos.clone().sub(origin);
        const proj = toP.dot(dir);
        const dist = toP.clone().sub(dir.clone().multiplyScalar(proj)).length();
        if (dist < 35 && (!best || proj > best.proj)) best = { hs, proj };
      }
      if (best) {
        clickAnim = { hotspotId: best.hs.id, t0: performance.now() };
        onHotspotClickRef.current(best.hs);
      }
    };

    rightCtrl.addEventListener('select', triggerSelect);

    const getPinchDist = (xrFrame: XRFrame, handedness: 'left' | 'right'): number | null => {
      const session  = renderer.xr.getSession();
      const refSpace = renderer.xr.getReferenceSpace();
      if (!session || !refSpace) return null;
      for (const src of session.inputSources) {
        if (src.handedness !== handedness) continue;
        const hand = (src as any).hand as Map<string, XRJointSpace> | undefined;
        if (!hand) return null;
        const thumbTip = hand.get('thumb-tip');
        const indexTip = hand.get('index-finger-tip');
        if (!thumbTip || !indexTip) return null;
        const tPose = (xrFrame as any).getJointPose(thumbTip, refSpace) as XRJointPose | null;
        const iPose = (xrFrame as any).getJointPose(indexTip, refSpace) as XRJointPose | null;
        if (!tPose || !iPose) return null;
        const tp = tPose.transform.position, ip = iPose.transform.position;
        const dx = tp.x - ip.x, dy = tp.y - ip.y, dz = tp.z - ip.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
      return null;
    };

    const updatePinchDot = (dot: THREE.Mesh, xrFrame: XRFrame, handedness: 'left' | 'right') => {
      const session  = renderer.xr.getSession();
      const refSpace = renderer.xr.getReferenceSpace();
      if (!session || !refSpace) { dot.visible = false; return; }
      for (const src of session.inputSources) {
        if (src.handedness !== handedness) continue;
        const hand = (src as any).hand as Map<string, XRJointSpace> | undefined;
        if (!hand) { dot.visible = false; return; }
        const thumbTip = hand.get('thumb-tip');
        const indexTip = hand.get('index-finger-tip');
        if (!thumbTip || !indexTip) { dot.visible = false; return; }
        const tPose = (xrFrame as any).getJointPose(thumbTip, refSpace) as XRJointPose | null;
        const iPose = (xrFrame as any).getJointPose(indexTip, refSpace) as XRJointPose | null;
        if (!tPose || !iPose) { dot.visible = false; return; }
        const tp = tPose.transform.position, ip = iPose.transform.position;
        const dx = tp.x - ip.x, dy = tp.y - ip.y, dz = tp.z - ip.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        dot.visible = dist < 0.06;
        dot.position.set((tp.x + ip.x) / 2, (tp.y + ip.y) / 2, (tp.z + ip.z) / 2);
        return;
      }
      dot.visible = false;
    };

    const updateBtnHover = (xrFrame: XRFrame | null) => {
      if (!renderer.xr.isPresenting) return;

      const session = renderer.xr.getSession();
      if (session) {
        for (const src of session.inputSources) {
          if (src.handedness === 'left' && src.gamepad) {
            const squeeze = src.gamepad.buttons[1]?.pressed ?? false;
            if (squeeze && !prevSqueeze) togglePanel();
            prevSqueeze = squeeze;
          }
        }
      }

      if (xrFrame) {
        const leftDist  = getPinchDist(xrFrame, 'left');
        const leftPinch = leftDist !== null && leftDist < 0.04;
        if (leftPinch && !prevLeftPinch) togglePanel();
        prevLeftPinch = leftPinch;
        updatePinchDot(leftPinchDot, xrFrame, 'left');

        const rightDist  = getPinchDist(xrFrame, 'right');
        const rightPinch = rightDist !== null && rightDist < 0.04;
        if (rightPinch && !prevRightPinch) triggerSelect();
        prevRightPinch = rightPinch;
        updatePinchDot(rightPinchDot, xrFrame, 'right');
      } else {
        leftPinchDot.visible  = false;
        rightPinchDot.visible = false;
      }

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
        if (hits.length > 0) {
          const d = Math.max(0.01, hits[0].distance);
          rightRay.scale.y    = d / 2;
          rightRay.position.z = -d / 2;
        } else {
          rightRay.scale.y    = 1;
          rightRay.position.z = -1;
        }
      } else {
        if (hoveredAction !== null) {
          hoveredAction = null;
          if (panelOpen) redrawPanel();
        }
        rightRay.scale.y    = 1;
        rightRay.position.z = -1;

        tmpMat.identity().extractRotation(rightCtrl.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(rightCtrl.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpMat).normalize();
        const sc2     = sceneRef.current;
        const origin2 = raycaster.ray.origin;
        const dir2    = raycaster.ray.direction;
        let newHov: string | null = null;
        if (sc2) {
          let bestDist = Infinity;
          for (const hs of sc2.hotspots) {
            const wp  = yawPitchToWorld(hs.yaw, hs.pitch);
            const pos = new THREE.Vector3(wp.x, wp.y, wp.z).normalize().multiplyScalar(470);
            const toP = pos.clone().sub(origin2);
            const proj = toP.dot(dir2);
            if (proj < 0) continue;
            const dist = toP.clone().sub(dir2.clone().multiplyScalar(proj)).length();
            if (dist < 30 && dist < bestDist) { bestDist = dist; newHov = hs.id; }
          }
        }
        if (newHov !== hoveredHotspotId) {
          if (hoveredHotspotId) {
            const oldLabel = hotspotLabelSpritesRef.current.get(hoveredHotspotId);
            if (oldLabel) oldLabel.visible = false;
            if (!clickAnim || clickAnim.hotspotId !== hoveredHotspotId) {
              threeScene.children
                .filter(c => c.userData.vrHotspot && c.userData.hotspotId === hoveredHotspotId)
                .forEach(s => (s as THREE.Sprite).scale.set(38, 38, 1));
            }
          }
          hoveredHotspotId = newHov;
          if (hoveredHotspotId) {
            const newLabel = hotspotLabelSpritesRef.current.get(hoveredHotspotId);
            if (newLabel) newLabel.visible = true;
            threeScene.children
              .filter(c => c.userData.vrHotspot && c.userData.hotspotId === hoveredHotspotId)
              .forEach(s => (s as THREE.Sprite).scale.set(50, 50, 1));
          }
        }
      }
    };

    let frameCount = 0;
    const animate = (_t: number, xrFrame?: XRFrame) => {
      frameCount++;

      const cam = cameraRef.current!;
      cam.rotation.y = -yawRef.current;
      cam.rotation.x = pitchRef.current;
      cam.fov = fovRef.current;
      cam.updateProjectionMatrix();

      if (videoElRef.current && textureRef.current) {
        (textureRef.current as THREE.VideoTexture).needsUpdate = true;
      }

      const w   = container.clientWidth;
      const h   = container.clientHeight;
      const sc  = sceneRef.current;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      if (sc) {
        for (const hs of (sc.hotspots ?? [])) {
          const el = hotspotContainersRef.current.get(hs.id);
          if (!el) continue;
          const pos = draggingHotspotRef.current?.id === hs.id ? draggingHotspotRef.current : hs;
          const wp  = yawPitchToWorld(pos.yaw, pos.pitch);
          const v   = new THREE.Vector3(wp.x, wp.y, wp.z);
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
          const v  = new THREE.Vector3(wp.x, wp.y, wp.z);
          const proj = v.clone().project(cam);
          const visible = forward.dot(v.normalize()) > 0.15;
          const x = (proj.x + 1) / 2 * w;
          const y = (1 - proj.y) / 2 * h;
          el.style.transform = `translate3d(${x}px,${y}px,0)`;
          el.style.opacity = visible ? '1' : '0';
          el.style.pointerEvents = visible ? 'auto' : 'none';
        }
        if (frameCount % 10 === 0) setMinimapYaw(yawRef.current);
      }

      if (renderer.xr.isPresenting && sphereRef.current) {
        sphereRef.current.position.copy(renderer.xr.getCamera().position);
      }

      if (frameCount % 3 === 0 && renderer.xr.isPresenting) updateBtnHover(xrFrame ?? null);

      if (clickAnim) {
        const elapsed  = performance.now() - clickAnim.t0;
        const duration = 500;
        const sprites  = threeScene.children.filter(
          c => c.userData.vrHotspot && c.userData.hotspotId === clickAnim!.hotspotId,
        );
        if (elapsed < duration) {
          const t     = elapsed / duration;
          const scale = 38 * (1 + Math.sin(t * Math.PI) * 0.7);
          sprites.forEach(s => (s as THREE.Sprite).scale.set(scale, scale, 1));
        } else {
          const endScale = hoveredHotspotId === clickAnim.hotspotId ? 50 : 38;
          sprites.forEach(s => (s as THREE.Sprite).scale.set(endScale, endScale, 1));
          clickAnim = null;
        }
      }

      renderer.render(threeScene, cam);
    };
    renderer.setAnimationLoop(animate);

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
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return { rendererRef, cameraRef, threeSceneRef, sphereRef, enterVR };
}
