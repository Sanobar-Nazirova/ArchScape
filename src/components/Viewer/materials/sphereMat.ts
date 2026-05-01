import * as THREE from 'three';

/** Skybox sphere material: strips the translation column from modelViewMatrix so
 * the sphere renders as if centred on the rendering camera each frame.
 * In VR this eliminates IPD-based geometric parallax — stereo depth comes
 * entirely from left/right image content, not from geometry. */
export function makeSphereMat(): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color: 0x111119, side: THREE.BackSide });
  m.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      /* glsl */`
      vec4 mvPosition = vec4( transformed, 1.0 );
      mat4 mvRot = modelViewMatrix;
      mvRot[3] = vec4(0.0, 0.0, 0.0, 1.0);
      mvPosition = mvRot * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
      `,
    );
  };
  return m;
}
