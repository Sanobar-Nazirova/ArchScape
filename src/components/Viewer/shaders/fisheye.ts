import * as THREE from 'three';
import type { PanoramaFormat, FisheyeConfig } from '../../../types';

export function fisheyeConfigFromFormat(format: PanoramaFormat): FisheyeConfig {
  switch (format) {
    case 'fisheye-dual-sbs':
      return { type: 'dual-sbs', fov: 200, centerX: 0.25, centerY: 0.5, radius: 0.46 };
    case 'fisheye-dual-tb':
      return { type: 'dual-tb', fov: 200, centerX: 0.5, centerY: 0.25, radius: 0.46 };
    default: // fisheye-single
      return { type: 'single', fov: 180, centerX: 0.5, centerY: 0.5, radius: 0.92 };
  }
}

/* ─── Fisheye video shader ────────────────────────────────────────────────
 * Converts a raw dual/single fisheye VideoTexture to equirectangular on the
 * GPU in real-time. Runs the same equidistant projection math as the CPU
 * fisheyeToEquirectangular() but as a GLSL fragment shader per sphere fragment.
 *
 * Sphere UV convention (Three.js SphereGeometry, BackSide):
 *   vUv.x ∈ [0,1]  → lon = x·2π   (0 = +z direction)
 *   vUv.y ∈ [0,1]  → lat = (y-0.5)·π  (0 = south pole, 1 = north pole)
 *
 * VideoTexture has flipY=false so shader v = image_y / H.
 * The front fisheye circle has its +y world content ABOVE the center in
 * image space (smaller image_y), so source_v = center.y − r_v·sin(phi).
 * ─────────────────────────────────────────────────────────────────────── */
export const FISHEYE_VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const FISHEYE_FRAG = /* glsl */`
#define PI 3.14159265358979323846

uniform sampler2D map;
uniform int   fisheyeType;   // 0=single, 1=dual-sbs, 2=dual-tb
uniform float halfFov;       // fovRad / 2
uniform float yawOffset;     // radians — rotates scene horizontally
// Per-eye circle params in normalised image UV space
uniform vec2  frontCenter;   // (cx/W, cy/H) of front circle
uniform vec2  backCenter;    // (cx/W, cy/H) of back circle
uniform float radiusU;       // circle radius as fraction of image WIDTH
uniform float radiusV;       // circle radius as fraction of image HEIGHT

varying vec2 vUv;

// Returns valid=1.0, source UV in xy; or valid=0.0 when theta>halfFov
vec3 projectFisheye(float sx, float sy, float sz, vec2 center) {
  float theta = acos(clamp(sz, -1.0, 1.0));
  if (theta >= halfFov) return vec3(0.0, 0.0, 0.0);
  float phi   = atan(sy, sx);
  float scale = theta / halfFov;
  return vec3(
    center.x + scale * radiusU * cos(phi),
    center.y - scale * radiusV * sin(phi),  // − because image y-axis is inverted vs world
    1.0
  );
}

void main() {
  float lat    = (vUv.y - 0.5) * PI;
  float lon    = vUv.x * 2.0 * PI + yawOffset;
  float coLat  = cos(lat);
  float sx = coLat * sin(lon);
  float sy = sin(lat);
  float sz = coLat * cos(lon);

  vec4 color = vec4(0.0, 0.0, 0.0, 1.0);

  if (fisheyeType == 0) {
    // ── Single fisheye ──────────────────────────────────────────────
    vec3 f = projectFisheye(sx, sy, sz, frontCenter);
    if (f.z > 0.5 && f.x >= 0.0 && f.x <= 1.0 && f.y >= 0.0 && f.y <= 1.0)
      color = texture2D(map, f.xy);

  } else {
    // ── Dual fisheye (SBS or TB) ────────────────────────────────────
    // Adaptive blend window matches actual overlap zone where both eyes
    // are valid: overlapSz = |cos(halfFov)| (positive when fov > 180°)
    float overlapSz = max(0.05, -cos(halfFov));
    float t = clamp((sz + overlapSz) / (2.0 * overlapSz), 0.0, 1.0);

    vec3 front = projectFisheye( sx,  sy,  sz, frontCenter);
    vec3 back  = projectFisheye(-sx,  sy, -sz, backCenter);

    bool frontOk = front.z > 0.5 && front.x >= 0.0 && front.x <= 1.0
                                  && front.y >= 0.0 && front.y <= 1.0;
    bool backOk  = back.z  > 0.5 && back.x  >= 0.0 && back.x  <= 1.0
                                  && back.y  >= 0.0 && back.y  <= 1.0;

    if (frontOk && backOk) {
      vec4 fp = texture2D(map, front.xy);
      vec4 bp = texture2D(map, back.xy);
      color = mix(bp, fp, t);
    } else if (frontOk) {
      color = texture2D(map, front.xy);
    } else if (backOk) {
      color = texture2D(map, back.xy);
    }
  }

  gl_FragColor = color;
}`;

/** Compute normalised circle radii and center positions for the shader uniforms. */
export function fisheyeShaderUniforms(cfg: FisheyeConfig, vW: number, vH: number) {
  const { type, fov, centerX, centerY, radius, yawOffset = 0 } = cfg;
  const fovRad  = (fov  * Math.PI) / 180;
  const yawRad  = (yawOffset * Math.PI) / 180;

  let rPx: number, frontCX: number, frontCY: number, backCX: number, backCY: number;

  if (type === 'dual-sbs') {
    rPx    = radius * vW / 2;
    frontCX = centerX;  frontCY = centerY;
    backCX  = 1 - centerX; backCY = centerY;
  } else if (type === 'dual-tb') {
    rPx    = radius * vH / 2;
    frontCX = centerX;  frontCY = centerY;
    backCX  = centerX;  backCY  = 1 - centerY;
  } else { // single
    rPx    = radius * Math.min(vW, vH) / 2;
    frontCX = centerX; frontCY = centerY;
    backCX  = centerX; backCY  = centerY;
  }

  const typeCode = type === 'single' ? 0 : type === 'dual-sbs' ? 1 : 2;

  return {
    map:         { value: null as THREE.Texture | null },
    fisheyeType: { value: typeCode },
    halfFov:     { value: fovRad / 2 },
    yawOffset:   { value: yawRad },
    frontCenter: { value: new THREE.Vector2(frontCX, frontCY) },
    backCenter:  { value: new THREE.Vector2(backCX,  backCY) },
    radiusU:     { value: rPx / vW },
    radiusV:     { value: rPx / vH },
  };
}

export function makeFisheyeShaderMaterial(cfg: FisheyeConfig, vW: number, vH: number): THREE.ShaderMaterial {
  const uniforms = fisheyeShaderUniforms(cfg, vW, vH);
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader:   FISHEYE_VERT,
    fragmentShader: FISHEYE_FRAG,
    side: THREE.BackSide,
  });
}
