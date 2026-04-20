// Module-level flag — survives React renders and Zustand updates.
// Set before navigating to EditorScreen; consumed once on EditorScreen mount.
let _pending = false;
export function setVRIntent()    { _pending = true; }
export function consumeVRIntent() { const v = _pending; _pending = false; return v; }
