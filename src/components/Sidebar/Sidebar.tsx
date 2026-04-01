import React, { useState } from 'react';
import { Plus, FolderPlus, ChevronDown, Layers, Image } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import SceneList from './SceneList';

export default function Sidebar() {
  const { scenes, addFolder } = useTourStore();
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <aside className="flex flex-col h-full bg-sphera-panel border-r border-sphera-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-sphera-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Layers size={13} className="text-sphera-muted" />
          <span className="text-xs font-semibold text-sphera-text uppercase tracking-wider">Scenes</span>
          <span className="text-[10px] text-sphera-border bg-sphera-surface px-1.5 py-0.5 rounded-full">
            {scenes.length}
          </span>
        </div>

        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => setShowAddMenu(v => !v)}
            className="flex items-center gap-0.5 text-sphera-muted hover:text-white transition-colors p-1 rounded hover:bg-sphera-hover"
            title="Add"
          >
            <Plus size={13} />
            <ChevronDown size={11} />
          </button>

          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-sphera-surface border border-sphera-border rounded-lg shadow-xl w-44 py-1 overflow-hidden">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-sphera-text hover:bg-sphera-hover"
                  onClick={() => { addFolder('New Group'); setShowAddMenu(false); }}
                >
                  <FolderPlus size={13} className="text-sphera-muted" />
                  Add Group / Folder
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scene list */}
      <div className="flex-1 overflow-y-auto pt-1.5">
        {scenes.length === 0 ? (
          <EmptyState />
        ) : (
          <SceneList />
        )}
      </div>

      {/* Footer hint */}
      {scenes.length > 0 && (
        <div className="px-3 py-2 border-t border-sphera-border flex-shrink-0">
          <p className="text-[10px] text-sphera-border leading-snug">
            Double-click a scene name to rename. Drag to reorder.
          </p>
        </div>
      )}
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-sphera-surface border border-sphera-border flex items-center justify-center mb-3">
        <Image size={20} className="text-sphera-muted" />
      </div>
      <p className="text-xs text-sphera-text font-medium mb-1">No scenes yet</p>
      <p className="text-[11px] text-sphera-muted leading-snug">
        Click <span className="text-white font-medium">Upload Panoramas</span> in the toolbar to add equirectangular images, 360° videos, or fisheye photos.
      </p>
    </div>
  );
}
