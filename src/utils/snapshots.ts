export interface Snapshot {
  id: string;
  name: string;
  createdAt: number;
  data: string; // JSON-serialized tour state
}

const STORAGE_KEY = 'archscape_snapshots';

export function saveSnapshot(name: string, state: object): Snapshot {
  const snap: Snapshot = {
    id: `snap_${Date.now()}`,
    name,
    createdAt: Date.now(),
    data: JSON.stringify(state),
  };
  const existing = listSnapshots();
  // Keep max 20 snapshots
  const updated = [snap, ...existing].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return snap;
}

export function listSnapshots(): Snapshot[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch { return []; }
}

export function deleteSnapshot(id: string): void {
  const updated = listSnapshots().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getSnapshotData(id: string): object | null {
  const snap = listSnapshots().find(s => s.id === id);
  if (!snap) return null;
  try { return JSON.parse(snap.data); } catch { return null; }
}
