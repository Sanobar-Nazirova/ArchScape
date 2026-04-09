import React, { useState } from 'react';
import { History, X, RotateCcw, Trash2 } from 'lucide-react';
import { listSnapshots, deleteSnapshot, type Snapshot } from '../../utils/snapshots';
import { useTourStore } from '../../store/useTourStore';

interface Props {
  onClose: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function SnapshotsModal({ onClose }: Props) {
  const { createSnapshot, restoreSnapshot } = useTourStore();
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => listSnapshots());
  const [name, setName] = useState('');

  const refresh = () => setSnapshots(listSnapshots());

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createSnapshot(trimmed);
    setName('');
    refresh();
  };

  const handleRestore = (snap: Snapshot) => {
    if (window.confirm('Restore this snapshot? Current state will be replaced.')) {
      restoreSnapshot(snap.id);
      onClose();
    }
  };

  const handleDelete = (id: string) => {
    deleteSnapshot(id);
    refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div
        className="bg-nm-base border border-nm-border rounded-2xl shadow-2xl flex flex-col"
        style={{ width: 480, maxWidth: '95vw', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-nm-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <History size={17} className="text-nm-accent" />
            <h3 className="text-nm-text font-semibold text-sm">Version Snapshots</h3>
          </div>
          <button
            onClick={onClose}
            className="text-nm-muted hover:text-nm-text transition-colors p-1"
          >
            <X size={15} />
          </button>
        </div>

        {/* Save section */}
        <div className="px-5 py-4 border-b border-nm-border flex-shrink-0">
          <p className="text-[11px] text-nm-muted uppercase tracking-wide mb-2">Save current version</p>
          <div className="flex gap-2">
            <input
              type="text"
              className="input-base flex-1 text-sm"
              placeholder='e.g. "After client review"'
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
              style={{ background: 'var(--nm-accent)' }}
            >
              Save Snapshot
            </button>
          </div>
        </div>

        {/* Snapshot list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          {snapshots.length === 0 ? (
            <div className="text-center py-10">
              <History size={32} className="text-nm-muted mx-auto mb-3 opacity-40" />
              <p className="text-nm-muted text-sm leading-relaxed">
                No snapshots yet. Save a snapshot to preserve the current state.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {snapshots.map(snap => (
                <li
                  key={snap.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-nm-border bg-nm-surface group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-nm-text text-sm font-medium truncate">{snap.name}</p>
                    <p className="text-nm-muted text-[11px] mt-0.5">{timeAgo(snap.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleRestore(snap)}
                    title="Restore this snapshot"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-nm-muted hover:text-nm-accent border border-nm-border hover:border-nm-accent rounded-lg transition-colors flex-shrink-0"
                  >
                    <RotateCcw size={11} />
                    Restore
                  </button>
                  <button
                    onClick={() => handleDelete(snap.id)}
                    title="Delete this snapshot"
                    className="p-1.5 text-nm-muted hover:text-red-400 transition-colors rounded-lg flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer note */}
        <div className="px-5 py-3 border-t border-nm-border flex-shrink-0">
          <p className="text-[11px] text-nm-muted text-center">
            Max 20 snapshots stored — oldest are removed automatically
          </p>
        </div>
      </div>
    </div>
  );
}
