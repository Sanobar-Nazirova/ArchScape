import type { Scene, Hotspot, FloorPlan } from '../types';

export interface ExportStore {
  projectName: string;
  scenes: Scene[];
  floorPlans: FloorPlan[];
  password?: string;
}

const SIZE_WARNING_BYTES = 50 * 1024 * 1024; // 50 MB

async function toDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return ''; }
}

function estimateSceneSize(scene: Scene): number {
  // Use thumbnail length as a rough proxy; actual will be larger
  const thumbBytes = scene.thumbnail ? scene.thumbnail.length * 0.75 : 0;
  const imgBytes = scene.imageUrl ? scene.imageUrl.length * 0.75 : 0;
  return imgBytes || thumbBytes;
}

export interface ExportProgress {
  current: number;
  total: number;
  sceneName: string;
}

export async function exportTourAsHTML(
  store: ExportStore,
  includeImages: boolean,
  onProgress?: (p: ExportProgress) => void,
): Promise<void> {
  const { projectName, scenes, floorPlans } = store;

  // Build scenes payload — include thumbnail data URLs but resolve imageUrl to base64
  const exportScenes: Array<Omit<Scene, 'imageUrl'> & { imageDataUrl: string }> = [];

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    onProgress?.({ current: i + 1, total: scenes.length, sceneName: sc.name });

    let imageDataUrl = '';
    if (includeImages && sc.imageUrl) {
      imageDataUrl = sc.imageUrl.startsWith('data:')
        ? sc.imageUrl
        : await toDataUrl(sc.imageUrl);
    }

    const { imageUrl: _imageUrl, ...rest } = sc;
    exportScenes.push({ ...rest, imageDataUrl });
  }

  const tourData = {
    projectName,
    scenes: exportScenes,
    floorPlans: floorPlans.map(fp => ({ ...fp, imageUrl: '' })),
    exportedAt: new Date().toISOString(),
  };

  const tourJson = JSON.stringify(tourData);

  // Build hotspot navigation dots helper for the viewer
  const navHotspotsScript = `
    function buildHotspotDots(scene, navigateFn) {
      const navHotspots = (scene.hotspots || []).filter(
        h => (!h.type || h.type === 'navigation') && h.targetSceneId
      );
      const container = document.getElementById('hotspot-container');
      if (!container) return;
      container.innerHTML = '';
      navHotspots.forEach(h => {
        const dot = document.createElement('button');
        dot.className = 'hotspot-dot';
        dot.title = h.label || 'Go to scene';
        dot.dataset.yaw = String(h.yaw);
        dot.dataset.pitch = String(h.pitch);
        dot.dataset.target = h.targetSceneId;
        dot.addEventListener('click', () => navigateFn(h.targetSceneId));
        container.appendChild(dot);
      });
    }

    function updateHotspotPositions(camera, renderer) {
      const container = document.getElementById('hotspot-container');
      if (!container) return;
      const dots = container.querySelectorAll('.hotspot-dot');
      const W = renderer.domElement.clientWidth;
      const H = renderer.domElement.clientHeight;
      dots.forEach(dot => {
        const yaw = parseFloat(dot.dataset.yaw);
        const pitch = parseFloat(dot.dataset.pitch);
        // Convert spherical to Cartesian (Three.js convention)
        const x = -Math.cos(pitch) * Math.sin(yaw);
        const y = Math.sin(pitch);
        const z = -Math.cos(pitch) * Math.cos(yaw);
        const vec = new THREE.Vector4(x, y, z, 1);
        vec.applyMatrix4(camera.matrixWorldInverse);
        vec.applyMatrix4(camera.projectionMatrix);
        if (vec.w <= 0 || vec.z / vec.w > 1) {
          dot.style.display = 'none';
          return;
        }
        const ndcX = vec.x / vec.w;
        const ndcY = vec.y / vec.w;
        const px = (ndcX * 0.5 + 0.5) * W;
        const py = (1 - (ndcY * 0.5 + 0.5)) * H;
        dot.style.display = 'block';
        dot.style.left = px + 'px';
        dot.style.top = py + 'px';
      });
    }
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(projectName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #000; overflow: hidden; font-family: system-ui, sans-serif; color: #fff; }
    #app { width: 100vw; height: 100vh; position: relative; }
    canvas { display: block; width: 100% !important; height: 100% !important; }
    #scene-name {
      position: absolute; top: 18px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 999px;
      padding: 6px 18px; font-size: 13px; font-weight: 600;
      pointer-events: none; white-space: nowrap; max-width: 80vw;
      overflow: hidden; text-overflow: ellipsis;
    }
    #nav-bar {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
      padding: 18px 20px 14px; display: flex; align-items: center;
      justify-content: center; gap: 10px;
    }
    .scene-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: rgba(255,255,255,0.35); border: none; cursor: pointer;
      transition: background 0.2s, transform 0.2s;
    }
    .scene-dot.active { background: #fff; transform: scale(1.4); }
    .scene-dot:hover:not(.active) { background: rgba(255,255,255,0.65); }
    #hotspot-container {
      position: absolute; inset: 0; pointer-events: none; overflow: hidden;
    }
    .hotspot-dot {
      position: absolute; transform: translate(-50%, -50%);
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,165,0,0.7); border: 2px solid rgba(255,165,0,0.9);
      cursor: pointer; pointer-events: all; transition: transform 0.15s;
      display: flex; align-items: center; justify-content: center;
    }
    .hotspot-dot::after {
      content: '→'; font-size: 14px; color: #fff;
    }
    .hotspot-dot:hover { transform: translate(-50%, -50%) scale(1.2); }
    #password-gate {
      position: fixed; inset: 0; background: #000;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 20px; z-index: 100;
    }
    #password-gate h1 { font-size: 20px; font-weight: 700; }
    #password-gate p { font-size: 13px; color: rgba(255,255,255,0.5); }
    #password-gate input {
      padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.08); color: #fff; font-size: 14px;
      outline: none; width: 260px;
    }
    #password-gate input:focus { border-color: rgba(255,255,255,0.5); }
    #password-gate button {
      padding: 12px 28px; border-radius: 10px; background: #e07b3f;
      color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; border: none;
    }
    #password-gate button:hover { opacity: 0.9; }
    #pw-error { color: #f87171; font-size: 13px; display: none; }
    #loading {
      position: fixed; inset: 0; background: #000;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 12px; z-index: 50;
    }
    #loading-spinner {
      width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.15);
      border-top-color: #e07b3f; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
<script>window.__TOUR_DATA__ = ${tourJson};</script>
<div id="app">
  <div id="loading">
    <div id="loading-spinner"></div>
    <p style="color:rgba(255,255,255,0.5);font-size:13px">Loading tour…</p>
  </div>
  <div id="password-gate" style="display:none">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    <h1>This tour is password protected</h1>
    <input type="password" id="pw-input" placeholder="Enter password…" />
    <div id="pw-error">Incorrect password</div>
    <button id="pw-submit">Unlock Tour</button>
  </div>
  <div id="scene-name"></div>
  <div id="hotspot-container"></div>
  <div id="nav-bar"></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.min.js"></script>
<script>
(function() {
  'use strict';
  const data = window.__TOUR_DATA__;
  const scenes = data.scenes || [];

  // ── Password gate ────────────────────────────────────────────────────
  const storedPassword = data.password;
  let passwordUnlocked = !storedPassword;

  function showPasswordGate() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('password-gate').style.display = 'flex';
    const input = document.getElementById('pw-input');
    const btn = document.getElementById('pw-submit');
    const err = document.getElementById('pw-error');
    const attempt = () => {
      if (input.value === storedPassword) {
        document.getElementById('password-gate').style.display = 'none';
        initViewer();
      } else {
        err.style.display = 'block';
        input.value = '';
        input.focus();
      }
    };
    btn.addEventListener('click', attempt);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
    input.focus();
  }

  if (!passwordUnlocked) {
    showPasswordGate();
    return;
  }

  initViewer();

  function initViewer() {
    if (!scenes.length) {
      document.getElementById('loading').innerHTML = '<p style="color:rgba(255,255,255,0.5)">No scenes in this tour.</p>';
      return;
    }

    let currentSceneIdx = 0;
    const app = document.getElementById('app');

    // ── Three.js setup ──────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    app.insertBefore(renderer.domElement, app.firstChild);

    const scene3d = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

    // Sphere geometry (inverted — normals face inward)
    const geo = new THREE.SphereGeometry(50, 64, 32);
    geo.scale(-1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const sphere = new THREE.Mesh(geo, mat);
    scene3d.add(sphere);

    // ── Camera yaw / pitch ──────────────────────────────────────────────
    let yaw = 0, pitch = 0;
    const MAX_PITCH = Math.PI / 2 - 0.05;

    function applyCameraRotation() {
      camera.rotation.order = 'YXZ';
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
    }
    applyCameraRotation();

    // ── Pointer drag ────────────────────────────────────────────────────
    let pointerDown = false, lastX = 0, lastY = 0;
    renderer.domElement.addEventListener('pointerdown', e => {
      pointerDown = true; lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener('pointermove', e => {
      if (!pointerDown) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      yaw -= dx * 0.003;
      pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch + dy * 0.003));
      applyCameraRotation();
    });
    window.addEventListener('pointerup', () => { pointerDown = false; });

    // ── Scroll to zoom ───────────────────────────────────────────────────
    renderer.domElement.addEventListener('wheel', e => {
      camera.fov = Math.max(20, Math.min(120, camera.fov + e.deltaY * 0.05));
      camera.updateProjectionMatrix();
    }, { passive: true });

    // ── Resize handler ───────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    ${navHotspotsScript}

    // ── Navigation bar ───────────────────────────────────────────────────
    const navBar = document.getElementById('nav-bar');
    scenes.forEach((sc, i) => {
      const dot = document.createElement('button');
      dot.className = 'scene-dot' + (i === 0 ? ' active' : '');
      dot.title = sc.name || ('Scene ' + (i + 1));
      dot.addEventListener('click', () => loadScene(i));
      navBar.appendChild(dot);
    });

    function updateNavBar() {
      const dots = navBar.querySelectorAll('.scene-dot');
      dots.forEach((d, i) => d.classList.toggle('active', i === currentSceneIdx));
    }

    // ── Scene name overlay ───────────────────────────────────────────────
    const nameEl = document.getElementById('scene-name');
    function updateSceneName() {
      nameEl.textContent = scenes[currentSceneIdx]?.name || '';
    }

    // ── Load scene ───────────────────────────────────────────────────────
    const textureLoader = new THREE.TextureLoader();
    const textureCache = {};

    function loadScene(idx) {
      currentSceneIdx = idx;
      const sc = scenes[idx];
      const imgSrc = sc.imageDataUrl || '';
      updateSceneName();
      updateNavBar();

      // Set initial yaw/pitch
      yaw = sc.initialYaw || 0;
      pitch = sc.initialPitch || 0;
      applyCameraRotation();

      if (!imgSrc) {
        mat.color.set(0x222222);
        mat.map = null;
        mat.needsUpdate = true;
        buildHotspotDots(sc, (targetId) => {
          const ti = scenes.findIndex(s => s.id === targetId);
          if (ti >= 0) loadScene(ti);
        });
        return;
      }

      if (textureCache[sc.id]) {
        mat.map = textureCache[sc.id];
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
        buildHotspotDots(sc, (targetId) => {
          const ti = scenes.findIndex(s => s.id === targetId);
          if (ti >= 0) loadScene(ti);
        });
        return;
      }

      textureLoader.load(
        imgSrc,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          textureCache[sc.id] = tex;
          mat.map = tex;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
          document.getElementById('loading').style.display = 'none';
          buildHotspotDots(sc, (targetId) => {
            const ti = scenes.findIndex(s => s.id === targetId);
            if (ti >= 0) loadScene(ti);
          });
        },
        undefined,
        () => {
          // On error, show blank scene
          mat.map = null;
          mat.color.set(0x222222);
          mat.needsUpdate = true;
          document.getElementById('loading').style.display = 'none';
        }
      );
    }

    // ── Render loop ──────────────────────────────────────────────────────
    function animate() {
      requestAnimationFrame(animate);
      updateHotspotPositions(camera, renderer);
      renderer.render(scene3d, camera);
    }
    animate();

    // ── Bootstrap ────────────────────────────────────────────────────────
    loadScene(0);
  }
})();
</script>
</body>
</html>`;

  const htmlBytes = new TextEncoder().encode(html).length;
  if (htmlBytes > SIZE_WARNING_BYTES) {
    const sizeMB = (htmlBytes / 1024 / 1024).toFixed(1);
    const ok = window.confirm(
      `The exported file is ${sizeMB} MB. Large files may be slow to open in a browser. Continue?`,
    );
    if (!ok) return;
  }

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-tour.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Returns estimated file size in bytes for a scene (based on image data). */
export function estimateSceneSizeBytes(scene: Scene): number {
  const src = scene.imageUrl || '';
  if (src.startsWith('data:')) {
    // Base64 overhead: actual binary ~= length * 0.75
    return Math.round(src.length * 0.75);
  }
  // Blob URLs: we can't know size ahead of time, use thumbnail as proxy
  if (scene.thumbnail) return Math.round(scene.thumbnail.length * 0.75);
  return 0;
}
