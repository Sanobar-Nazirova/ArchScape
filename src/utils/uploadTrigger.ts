/**
 * Upload trigger singleton.
 *
 * Instead of clicking a static hidden <input> (which some browsers, notably
 * Meta Quest Browser in WebXR mode, restrict to single-file selection),
 * we create a fresh <input type="file"> element on every trigger call.
 * Dynamic inputs are treated by the browser as if the user clicked them
 * directly and reliably support the `multiple` attribute.
 */
type FileHandler = (files: FileList) => void;

let _handler: FileHandler | null = null;

export function registerUploadHandler(fn: FileHandler) {
  _handler = fn;
}

export function triggerUpload() {
  if (!_handler) return;
  const handler = _handler;

  const input = document.createElement('input');
  input.type     = 'file';
  input.multiple = true;
  input.accept   = 'image/*,video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg';

  input.addEventListener('change', () => {
    if (input.files && input.files.length > 0) handler(input.files);
  }, { once: true });

  // Append briefly so the browser treats it as a real interactive element
  document.body.appendChild(input);
  input.click();
  // Remove after a tick — the change event fires independently
  setTimeout(() => { try { document.body.removeChild(input); } catch {} }, 500);
}

/** @deprecated — kept for backwards compatibility; same as triggerUpload() */
export function registerUploadTrigger(_fn: () => void) {
  // no-op: handler is now registered via registerUploadHandler
}
