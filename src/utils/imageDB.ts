/**
 * IndexedDB wrapper for storing large panorama images.
 * localStorage has a ~5 MB quota; panoramas can be 20–100 MB each.
 * We store raw blobs here and keep only metadata in localStorage.
 */
const DB_NAME  = 'archscape_images_v1';
const DB_VER   = 1;
const STORE    = 'blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/** Save a data-URL or blob-URL string as a Blob keyed by `key`. */
export async function saveImage(key: string, dataUrl: string): Promise<void> {
  try {
    const res   = await fetch(dataUrl);
    const blob  = await res.blob();
    const db    = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[imageDB] saveImage failed', key, e);
  }
}

/** Load a stored image as a fresh object URL (must be revoked when done). */
export async function loadImage(key: string): Promise<string | null> {
  try {
    const db   = await openDB();
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
    if (!blob) return null;
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('[imageDB] loadImage failed', key, e);
    return null;
  }
}

/** Delete a stored image. */
export async function deleteImage(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[imageDB] deleteImage failed', key, e);
  }
}
