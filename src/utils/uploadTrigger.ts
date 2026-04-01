/**
 * Singleton upload trigger so any component (EmptyViewer, Sidebar empty state)
 * can fire the Toolbar's file input without prop-drilling.
 */
let _trigger: (() => void) | null = null;

export function registerUploadTrigger(fn: () => void) {
  _trigger = fn;
}

export function triggerUpload() {
  _trigger?.();
}
