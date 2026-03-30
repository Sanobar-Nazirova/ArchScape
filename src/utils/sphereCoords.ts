/**
 * Convert yaw/pitch (radians) to a unit 3D point on the sphere interior.
 * Convention: yaw=0, pitch=0 → looking at -Z (forward).
 */
export function yawPitchToWorld(yaw: number, pitch: number): { x: number; y: number; z: number } {
  return {
    x:  Math.cos(pitch) * Math.sin(yaw),
    y:  Math.sin(pitch),
    z: -Math.cos(pitch) * Math.cos(yaw),
  };
}

/**
 * Convert a world point (on the sphere interior) back to yaw/pitch.
 */
export function worldToYawPitch(x: number, y: number, z: number): { yaw: number; pitch: number } {
  return {
    yaw:   Math.atan2(x, -z),
    pitch: Math.asin(Math.max(-1, Math.min(1, y))),
  };
}

/**
 * Normalise yaw to [−π, π].
 */
export function normaliseYaw(yaw: number): number {
  while (yaw >  Math.PI) yaw -= 2 * Math.PI;
  while (yaw < -Math.PI) yaw += 2 * Math.PI;
  return yaw;
}
