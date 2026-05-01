import { useEffect } from 'react';
import type React from 'react';
import * as THREE from 'three';
import { fisheyeToEquirectangular, autoDetectFisheyeCircles, fisheyeCache } from '../../../utils/fisheyeConverter';
import { makeSphereMat } from '../materials/sphereMat';
import { makeFisheyeShaderMaterial, fisheyeConfigFromFormat } from '../shaders/fisheye';
import { useTourStore } from '../../../store/useTourStore';
import type { Scene, PanoramaFormat } from '../../../types';

export function usePanoramaTexture(params: {
  scene: Scene | null | undefined;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  sphereRef: React.MutableRefObject<THREE.Mesh | null>;
  threeSceneRef: React.MutableRefObject<THREE.Scene | null>;
  yawRef: React.MutableRefObject<number>;
  pitchRef: React.MutableRefObject<number>;
  pendingStartView: { yaw: number; pitch: number } | null;
  clearPendingStartView: () => void;
  textureRef: React.MutableRefObject<THREE.Texture | null>;
  videoElRef: React.MutableRefObject<HTMLVideoElement | null>;
  shaderMatRef: React.MutableRefObject<THREE.ShaderMaterial | null>;
  setActiveMedia: (v: null) => void;
}): void {
  const {
    scene, rendererRef, sphereRef, yawRef, pitchRef,
    textureRef, videoElRef, shaderMatRef, setActiveMedia,
  } = params;

  // ── Load texture when scene changes ───────────────────────────────────
  useEffect(() => {
    if (!sphereRef.current || !scene) return;

    // If previous scene used a fisheye shader material, restore plain material
    if (shaderMatRef.current) {
      shaderMatRef.current.dispose();
      shaderMatRef.current = null;
      sphereRef.current.material = makeSphereMat();
    }

    const mat = sphereRef.current.material as THREE.MeshBasicMaterial;

    // Cleanup previous
    if (textureRef.current) { textureRef.current.dispose(); textureRef.current = null; }
    if (videoElRef.current) { videoElRef.current.pause(); videoElRef.current.src = ''; videoElRef.current = null; }
    mat.map = null;
    mat.color.set(0x111119);
    mat.needsUpdate = true;

    // Use pending start view if switching via variant, otherwise use scene default
    const pv = useTourStore.getState().pendingStartView;
    if (pv) {
      yawRef.current   = pv.yaw;
      pitchRef.current = pv.pitch;
      useTourStore.getState().setPendingStartView(null);
    } else {
      yawRef.current   = scene.initialYaw;
      pitchRef.current = scene.initialPitch;
    }
    setActiveMedia(null);

    // Cap image to WebGL max texture size to avoid silent GPU failures on large SBS/TB panoramas
    const capImageSize = (img: HTMLImageElement): HTMLImageElement | HTMLCanvasElement => {
      const maxTex = rendererRef.current?.capabilities.maxTextureSize ?? 4096;
      if (img.naturalWidth <= maxTex && img.naturalHeight <= maxTex) return img;
      const scale = Math.min(maxTex / img.naturalWidth, maxTex / img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.floor(img.naturalWidth  * scale);
      canvas.height = Math.floor(img.naturalHeight * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas;
    };

    const applyTexture = (texture: THREE.Texture) => {
      // ── Swap geometry based on panorama format ────────────────────────
      const mesh = sphereRef.current!;
      const oldGeo = mesh.geometry;
      let newGeo: THREE.BufferGeometry;
      const ar = scene.aspectRatio ?? 2;

      switch (scene.format) {
        case 'cylindrical': {
          const height = Math.min(160, 100 / Math.max(ar, 0.5));
          newGeo = new THREE.CylinderGeometry(100, 100, height, 64, 1, true);
          break;
        }
        case 'partial':
        case 'rectilinear': {
          const hFov = ar > 1.5 ? Math.PI * 1.2 : Math.PI * 0.8;
          const vFov = hFov / Math.max(ar, 0.1);
          newGeo = new THREE.SphereGeometry(100, 48, 24,
            -hFov / 2, hFov, Math.PI / 2 - vFov / 2, vFov);
          break;
        }
        case 'vertical': {
          const vFov2 = Math.PI * 1.2;
          const hFov2 = Math.min(Math.PI * 0.5, vFov2 * (scene.aspectRatio ?? 0.4));
          newGeo = new THREE.SphereGeometry(100, 32, 48,
            -hFov2 / 2, hFov2, Math.PI / 2 - vFov2 / 2, vFov2);
          break;
        }
        default:
          newGeo = new THREE.SphereGeometry(100, 64, 32);
      }

      if (oldGeo !== newGeo) { oldGeo.dispose(); mesh.geometry = newGeo; }

      // ── Set ALL texture properties before the single needsUpdate = true ──
      texture.colorSpace = THREE.SRGBColorSpace;

      // wrapS must be RepeatWrapping for all equirectangular formats to avoid the black
      // vertical seam (ClampToEdge interpolates backwards across the full texture at u=0/u=1).
      //
      // Stereo eye selection:
      //   SBS — left eye = u[0→0.5], right eye = u[0.5→1.0]
      //   TB (image, flipY=true) — image top = left eye → UV v[0.5→1.0] after flip
      //                            image bottom = right eye → UV v[0→0.5] after flip
      //   TB (video, flipY=false) — no flip, so top = v[1→0.5], bottom = v[0.5→0]
      //                             left eye (top) → UV v[0.5→1.0]; right eye → v[0→0.5]
      //   Both image and video TB land the same way: left eye = v[0.5→1.0]
      const isRightEye = scene.stereoEye === 'right';
      switch (scene.format) {
        case 'equirectangular-sbs':
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.repeat.set(0.5, 1);
          texture.offset.set(isRightEye ? 0.5 : 0, 0);
          break;
        case 'equirectangular-tb':
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.repeat.set(1, 0.5);
          // image flipY=true: left eye → v[0.5,1.0]; right eye → v[0,0.5]
          // video flipY=false: same result because video flips y independently
          texture.offset.set(0, isRightEye ? 0 : 0.5);
          break;
        default:
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.repeat.set(1, 1);
          texture.offset.set(0, 0);
      }

      texture.updateMatrix();  // apply repeat/offset to the UV transform matrix
      texture.needsUpdate = true; // single upload with all correct settings

      textureRef.current = texture;
      mat.map = texture;
      mat.color.set(0xffffff);
      mat.side = THREE.BackSide;
      mat.needsUpdate = true;

      // ── Per-eye UV switching for stereo formats in VR ──────────────────
      // onBeforeRender fires once per eye per frame in WebXR, letting us set
      // the correct texture half before each draw call.
      //
      // Eye mapping (WebXR spec + Three.js convention):
      //   cameras[0] = left eye,  cameras[1] = right eye
      //
      // SBS offset mapping (repeat.x = 0.5):
      //   left eye  → offset.x = 0   → samples u[0 .. 0.5]  = LEFT  half ✓
      //   right eye → offset.x = 0.5 → samples u[0.5 .. 1]  = RIGHT half ✓
      //
      // TB offset mapping (repeat.y = 0.5):
      //   Images (flipY=true):  top of image → UV v = 1, so top half → v[0.5..1]
      //   VideoTexture (flipY=false): browsers deliver video in WebGL y-up order,
      //   so top of frame also lands at v = 1 — same offsets apply as for images.
      //   left eye  → offset.y = 0.5 → samples v[0.5 .. 1]  = TOP    half ✓
      //   right eye → offset.y = 0   → samples v[0   .. 0.5] = BOTTOM half ✓
      // onBeforeRender fires once per eye per VR frame.
      // We use it for two things:
      //   1. Centre the sphere exactly on this eye's position so there is zero
      //      geometry-based parallax (avoids double-vision when radius is small).
      //   2. For stereo formats, flip the texture UV to the correct half.
      // onBeforeRender fires once per eye per VR frame — use it only for
      // stereo UV switching. Sphere position is handled by the animation loop.
      //
      // Eye detection via layer mask (set by WebXRManager per the WebXR spec):
      //   cameras[0] left eye  → layers.enable(0) → mask = 0b01 = 1
      //   cameras[1] right eye → layers.enable(1) → mask = 0b11 = 3
      //   isRight  ⟺  bit 1 is set  ⟺  (mask & 2) !== 0
      const isStereoFmt = scene.format === 'equirectangular-sbs' || scene.format === 'equirectangular-tb';
      if (isStereoFmt) {
        mesh.onBeforeRender = (_r, _s, camera) => {
          const rdr = rendererRef.current;
          if (!rdr?.xr.isPresenting) return;
          const isRight = (camera.layers.mask & 2) !== 0;
          const tex = (mesh.material as THREE.MeshBasicMaterial).map;
          if (!tex) return;
          if (scene.format === 'equirectangular-sbs') {
            tex.offset.x = isRight ? 0.5 : 0;
          } else {
            tex.offset.y = isRight ? 0 : 0.5;
          }
        };
      } else {
        mesh.onBeforeRender = () => {};
      }
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

        if (scene.format.startsWith('fisheye')) {
          // ── Fisheye video: GPU shader converts in real-time ─────────────
          const cfg = scene.fisheyeConfig
            ? { ...scene.fisheyeConfig }
            : fisheyeConfigFromFormat(scene.format as PanoramaFormat);
          const mesh = sphereRef.current!;
          const shaderMat = makeFisheyeShaderMaterial(cfg, video.videoWidth, video.videoHeight);
          shaderMat.uniforms.map.value = vt;
          // Ensure standard full-sphere geometry
          const oldGeo = mesh.geometry;
          const newGeo = new THREE.SphereGeometry(100, 64, 32);
          if (oldGeo !== newGeo) { oldGeo.dispose(); mesh.geometry = newGeo; }
          mesh.material = shaderMat;
          mesh.onBeforeRender = () => {};
          shaderMatRef.current = shaderMat;
          textureRef.current   = vt;
        } else {
          applyTexture(vt);
        }

        video.play().catch(console.warn);
      }, { once: true });
      video.load();
    } else if (scene.imageUrl) {
      const img = new window.Image() as HTMLImageElement;
      img.onload = () => {
        // ── Raw fisheye: auto-detect circles + convert to equirectangular ──
        if (scene.format.startsWith('fisheye')) {
          // Check cache to avoid re-converting on every scene switch
          const cached = fisheyeCache.get(scene.id);
          if (cached) {
            applyTexture(new THREE.Texture(cached));
            return;
          }
          // Draw into canvas; cap per-dimension at 4096 so conversion stays fast
          // while preserving enough resolution for a good 360° output (≥11 px/°).
          const MAX = 4096;
          const scale = Math.min(1, MAX / img.naturalWidth, MAX / img.naturalHeight);
          const raw = document.createElement('canvas');
          raw.width  = Math.floor(img.naturalWidth  * scale);
          raw.height = Math.floor(img.naturalHeight * scale);
          raw.getContext('2d')!.drawImage(img, 0, 0, raw.width, raw.height);
          // Use saved user config if available; otherwise auto-detect from pixels
          const cfg = scene.fisheyeConfig
            ? { ...scene.fisheyeConfig }
            : fisheyeConfigFromFormat(scene.format as PanoramaFormat);
          if (!scene.fisheyeConfig) {
            try {
              const detected = autoDetectFisheyeCircles(raw, cfg.type);
              Object.assign(cfg, detected);
            } catch { /* keep defaults on any error */ }
          }
          // Convert fisheye → equirectangular and cache
          const converted = fisheyeToEquirectangular(raw, cfg);
          fisheyeCache.set(scene.id, converted);
          applyTexture(new THREE.Texture(converted));
          return;
        }

        // ── Normal equirectangular / other formats ──────────────────────
        const source = capImageSize(img);
        const texture = new THREE.Texture(source as HTMLImageElement);
        applyTexture(texture);
      };
      img.onerror = (_err: unknown) => console.error('Image load error');
      img.src = scene.imageUrl;
    }
  }, [  // eslint-disable-line react-hooks/exhaustive-deps
    scene?.id, scene?.imageUrl, scene?.format, scene?.mediaType, scene?.stereoEye,
    scene?.fisheyeConfig?.fov, scene?.fisheyeConfig?.yawOffset, scene?.fisheyeConfig?.radius,
  ]);

  // Reset initial view when scene's initialYaw/Pitch changes
  useEffect(() => {
    if (!scene) return;
    yawRef.current   = scene.initialYaw;
    pitchRef.current = scene.initialPitch;
  }, [scene?.initialYaw, scene?.initialPitch]); // eslint-disable-line react-hooks/exhaustive-deps
}
