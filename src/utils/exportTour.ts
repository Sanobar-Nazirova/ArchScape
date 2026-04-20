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

  // ── A-Frame based export — works natively on Meta Quest Browser ─────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>${escapeHtml(projectName)}</title>
  <!-- A-Frame 1.5 — handles WebXR/VR automatically on Meta Quest and other headsets -->
  <script src="https://cdn.jsdelivr.net/npm/aframe@1.5.0/dist/aframe.min.js"><\/script>
  <style>
    html, body { margin: 0; padding: 0; background: #000; overflow: hidden;
      font-family: system-ui, sans-serif; color: #fff; }
    /* ── Scene label ── */
    #scene-label {
      position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 999px;
      padding: 6px 18px; font-size: 13px; font-weight: 600;
      pointer-events: none; white-space: nowrap; max-width: 80vw;
      overflow: hidden; text-overflow: ellipsis; z-index: 20;
    }
    /* ── Nav bar ── */
    #nav-bar {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
      background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
      padding: 24px 20px 16px; display: flex; align-items: center;
      justify-content: center; gap: 10px;
    }
    .scene-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: rgba(255,255,255,0.35); border: none; cursor: pointer;
      transition: background 0.2s, transform 0.2s;
    }
    .scene-dot.active { background: #fff; transform: scale(1.4); }
    .scene-dot:hover:not(.active) { background: rgba(255,255,255,0.65); }
    /* ── Password gate ── */
    #password-gate {
      position: fixed; inset: 0; background: #000;
      display: none; flex-direction: column; align-items: center;
      justify-content: center; gap: 20px; z-index: 200;
    }
    #password-gate h1 { font-size: 20px; font-weight: 700; }
    #password-gate p  { font-size: 13px; color: rgba(255,255,255,0.5); }
    #password-gate input {
      padding: 12px 16px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.08); color: #fff;
      font-size: 14px; outline: none; width: 260px;
    }
    #password-gate input:focus { border-color: rgba(255,255,255,0.5); }
    #password-gate button {
      padding: 12px 28px; border-radius: 10px; background: #e07b3f;
      color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; border: none;
    }
    #pw-error { color: #f87171; font-size: 13px; display: none; }
    /* ── Loading overlay ── */
    #loading {
      position: fixed; inset: 0; background: #000;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 12px; z-index: 100;
    }
    #loading-spinner {
      width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.15);
      border-top-color: #e07b3f; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    /* A-Frame's built-in VR button — restyle to match brand */
    .a-enter-vr {
      bottom: 60px !important; right: 20px !important;
    }
  </style>
</head>
<body>
<script>window.__TOUR_DATA__ = ${tourJson};<\/script>

<!-- Password gate -->
<div id="password-gate">
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
  <h1>This tour is password protected</h1>
  <p>Enter the password to view</p>
  <input type="password" id="pw-input" placeholder="Enter password…" />
  <div id="pw-error">Incorrect password — try again</div>
  <button id="pw-submit">Unlock Tour</button>
</div>

<!-- Loading overlay -->
<div id="loading">
  <div id="loading-spinner"></div>
  <p style="color:rgba(255,255,255,0.5);font-size:13px">Loading tour…</p>
</div>

<!-- A-Frame scene: Meta Quest Browser shows its own "Enter VR" button automatically -->
<a-scene id="main-scene"
  loading-screen="enabled: false"
  background="color: #111111"
  vr-mode-ui="enabled: true"
  style="display:none">
  <a-assets id="asset-container" timeout="120000"></a-assets>

  <!-- 360° sky — src is updated per scene -->
  <a-sky id="sky" color="#111111"></a-sky>

  <!-- Hotspot entities placed here dynamically -->
  <a-entity id="hotspot-root"></a-entity>

  <!-- Camera with mouse drag + gyroscope look-controls -->
  <a-camera
    id="cam"
    look-controls="reverseMouseDrag: false; touchEnabled: true"
    wasd-controls="enabled: false">
    <!-- Gaze cursor: lets users navigate hotspots without a controller in VR -->
    <a-cursor
      color="#e07b3f"
      opacity="0.85"
      raycaster="objects: .nav-hotspot; far: 200"
      animation__click="property: scale; startEvents: click; easing: easeInCubic; dur: 150; from: 0.1 0.1 0.1; to: 1 1 1">
    </a-cursor>
  </a-camera>
</a-scene>

<!-- Flat UI (visible in desktop/flat browser mode; hidden in VR by design) -->
<div id="scene-label"></div>
<div id="nav-bar"></div>

<script>
(function () {
  'use strict';
  var data   = window.__TOUR_DATA__;
  var scenes = data.scenes || [];

  /* ── Password gate ─────────────────────────────────────────────────── */
  var pw = data.password;
  if (pw) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('password-gate').style.display = 'flex';
    var pwInput  = document.getElementById('pw-input');
    var pwBtn    = document.getElementById('pw-submit');
    var pwErr    = document.getElementById('pw-error');
    var attempt  = function () {
      if (pwInput.value === pw) {
        document.getElementById('password-gate').style.display = 'none';
        startTour();
      } else {
        pwErr.style.display = 'block';
        pwInput.value = '';
        pwInput.focus();
      }
    };
    pwBtn.addEventListener('click', attempt);
    pwInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(); });
    pwInput.focus();
  } else {
    startTour();
  }

  function startTour() {
    if (!scenes.length) {
      document.getElementById('loading').innerHTML =
        '<p style="color:rgba(255,255,255,0.5)">No scenes in this tour.</p>';
      return;
    }

    /* ── Preload all scene images into A-Frame asset system ─────────── */
    var assetContainer = document.getElementById('asset-container');
    scenes.forEach(function (sc, i) {
      if (!sc.imageDataUrl) return;
      var img = document.createElement('img');
      img.id  = 'img-' + i;
      img.src = sc.imageDataUrl;
      img.crossOrigin = 'anonymous';
      assetContainer.appendChild(img);
    });

    /* ── Show the A-Frame scene ──────────────────────────────────────── */
    var aScene = document.getElementById('main-scene');
    aScene.style.display = '';

    /* ── Navigation bar ──────────────────────────────────────────────── */
    var navBar = document.getElementById('nav-bar');
    scenes.forEach(function (sc, i) {
      var dot = document.createElement('button');
      dot.className = 'scene-dot' + (i === 0 ? ' active' : '');
      dot.title = sc.name || ('Scene ' + (i + 1));
      dot.addEventListener('click', function () { loadScene(i); });
      navBar.appendChild(dot);
    });

    var currentIdx = 0;

    function updateNavBar() {
      navBar.querySelectorAll('.scene-dot').forEach(function (d, i) {
        d.classList.toggle('active', i === currentIdx);
      });
    }

    /* ── Load a scene ────────────────────────────────────────────────── */
    function loadScene(idx) {
      currentIdx = idx;
      var sc  = scenes[idx];
      var sky = document.getElementById('sky');

      /* Set panorama */
      if (sc.imageDataUrl) {
        sky.setAttribute('src', '#img-' + idx);
        sky.removeAttribute('color');
      } else {
        sky.removeAttribute('src');
        sky.setAttribute('color', '#222222');
      }

      /* Scene label */
      document.getElementById('scene-label').textContent = sc.name || '';
      updateNavBar();

      /* Hotspots */
      var root = document.getElementById('hotspot-root');
      while (root.firstChild) root.removeChild(root.firstChild);

      var navHotspots = (sc.hotspots || []).filter(function (h) {
        return (!h.type || h.type === 'navigation') && h.targetSceneId;
      });

      navHotspots.forEach(function (h) {
        /* Convert spherical (yaw, pitch) to Cartesian on a 10-unit sphere */
        var r   = 10;
        var x   = -(r * Math.cos(h.pitch) * Math.sin(h.yaw));
        var y   =   r * Math.sin(h.pitch);
        var z   = -(r * Math.cos(h.pitch) * Math.cos(h.yaw));

        var ent = document.createElement('a-entity');
        ent.classList.add('nav-hotspot');
        ent.setAttribute('position', x.toFixed(3) + ' ' + y.toFixed(3) + ' ' + z.toFixed(3));

        /* Ring + arrow label */
        ent.setAttribute('geometry', 'primitive: torus; radius: 0.35; radiusTubular: 0.04; segmentsRadial: 32');
        ent.setAttribute('material',  'color: #e07b3f; shader: flat; opacity: 0.9');
        ent.setAttribute('look-at',   '#cam');

        /* Label */
        var lbl = document.createElement('a-text');
        lbl.setAttribute('value',    h.label || 'Go to');
        lbl.setAttribute('align',    'center');
        lbl.setAttribute('color',    '#ffffff');
        lbl.setAttribute('width',    '2');
        lbl.setAttribute('position', '0 -0.55 0');
        ent.appendChild(lbl);

        /* Hover / click animations */
        ent.setAttribute('animation__enter', 'property: scale; to: 1.25 1.25 1.25; startEvents: mouseenter; dur: 120');
        ent.setAttribute('animation__leave', 'property: scale; to: 1 1 1; startEvents: mouseleave; dur: 120');

        ent.addEventListener('click', function () {
          var ti = scenes.findIndex(function (s) { return s.id === h.targetSceneId; });
          if (ti >= 0) loadScene(ti);
        });

        root.appendChild(ent);
      });

      document.getElementById('loading').style.display = 'none';
    }

    /* Wait for A-Frame to be ready before loading first scene */
    aScene.addEventListener('loaded', function () { loadScene(0); });
    /* Fallback if already loaded */
    if (aScene.hasLoaded) loadScene(0);
  }
})();
<\/script>
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
