// Module-level flag — survives React renders, Zustand updates, and StrictMode's
// dev-only unmount/remount cycle. Uses a timestamp grace window so the flag
// is not permanently cleared by the first of a double-mount pair.
let _pendingAt = 0;
const GRACE_MS = 2000;

export function setVRIntent() {
  _pendingAt = Date.now();
}

export function consumeVRIntent() {
  if (_pendingAt === 0) return false;
  const fresh = Date.now() - _pendingAt < GRACE_MS;
  if (!fresh) _pendingAt = 0;
  return fresh;
}

export function clearVRIntent() {
  _pendingAt = 0;
}
