import { useEffect } from 'react';
import type React from 'react';
import * as THREE from 'three';
import { yawPitchToWorld } from '../../../utils/sphereCoords';
import { makeHotspotCanvasTexture, makeHotspotLabelTexture } from '../textures/hotspotTextures';
import type { Scene } from '../../../types';

export function useHotspotSprites(
  scene: Scene | null | undefined,
  scenesRef: React.MutableRefObject<Scene[]>,
  threeSceneRef: React.MutableRefObject<THREE.Scene | null>,
  hotspotLabelSpritesRef: React.MutableRefObject<Map<string, THREE.Sprite>>,
): void {
  // ── 3D hotspot sprites for WebXR — same icons as 2D overlay ──────────
  useEffect(() => {
    const threeScene = threeSceneRef.current;
    if (!threeScene || !scene) return;

    // Remove old markers and labels
    const old = threeScene.children.filter(c => c.userData.vrHotspot || c.userData.vrHotspotLabel);
    old.forEach(c => { (c as THREE.Sprite).material?.map?.dispose(); threeScene.remove(c); });
    hotspotLabelSpritesRef.current.clear();

    for (const hs of scene.hotspots) {
      const wp  = yawPitchToWorld(hs.yaw, hs.pitch);
      const pos = new THREE.Vector3(wp.x, wp.y, wp.z).normalize().multiplyScalar(470);

      // Icon sprite
      const tex    = makeHotspotCanvasTexture(hs.iconStyle);
      const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.scale.set(38, 38, 1);
      sprite.userData.vrHotspot  = true;
      sprite.userData.hotspotId  = hs.id;
      threeScene.add(sprite);

      // Label sprite (shown on hover) — always create so it's visible even when
      // targetSceneId is not set or the scene list hasn't loaded yet
      const targetScene = scenesRef.current.find(s => s.id === hs.targetSceneId);
      const labelText   = targetScene?.name || hs.label || '—';
      const labelTex = makeHotspotLabelTexture(labelText);
      const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false });
      const label    = new THREE.Sprite(labelMat);
      // Offset 45 world-units above the hotspot along world-Y so it floats
      label.position.copy(pos).addScaledVector(new THREE.Vector3(0, 1, 0), 45);
      // Scale to match hotspot icon height — canvas aspect 384×72 ≈ 5.33:1
      label.scale.set(200, 38, 1);
      label.visible = false;
      label.userData.vrHotspotLabel = true;
      label.userData.hotspotId      = hs.id;
      threeScene.add(label);
      hotspotLabelSpritesRef.current.set(hs.id, label);
    }

    return () => {
      const markers = threeScene.children.filter(c => c.userData.vrHotspot || c.userData.vrHotspotLabel);
      markers.forEach(c => { (c as THREE.Sprite).material?.map?.dispose(); threeScene.remove(c); });
      hotspotLabelSpritesRef.current.clear();
    };
  }, [scene?.id, scene?.hotspots]); // eslint-disable-line react-hooks/exhaustive-deps
}
