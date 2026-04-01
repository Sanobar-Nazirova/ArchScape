import React, { useState, useRef, useEffect } from 'react';
import {
  Search, FolderPlus, X, Layers,
  ChevronDown, Pencil, Check,
} from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import SceneList from './SceneList';

export default function Sidebar() {
  const { scenes, folders, projectName, setProjectName, addFolder } = useTourStore();

  const [searchQuery, setSearchQuery]       = useState('');
  const [editingProject, setEditingProject] = useState(false);
  const [projectDraft, setProjectDraft]     = useState(projectName);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const projectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProject && projectInputRef.current) {
      projectInputRef.current.focus();
      projectInputRef.current.select();
    }
  }, [editingProject]);

  const commitProjectRename = () => {
    setProjectName(projectDraft.trim() || projectName);
    setEditingProject(false);
  };

  const sceneCount  = scenes.length;
  const folderCount = folders.length;

  return (
    <aside className="flex flex-col h-full bg-sphera-panel border-r border-sphera-border overflow-hidden">

      {/* ── Project header ── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-sphera-border">
        <div className="flex items-center gap-1.5 mb-1">
          <Layers size={12} className="text-sphera-accent flex-shrink-0" />
          {editingProject ? (
            <input
              ref={projectInputRef}
              value={projectDraft}
              onChange={e => setProjectDraft(e.target.value)}
              onBlur={commitProjectRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitProjectRename();
                if (e.key === 'Escape') { setProjectDraft(projectName); setEditingProject(false); }
              }}
              className="flex-1 bg-sphera-surface border border-sphera-accent/50 rounded px-1.5 py-0.5 text-xs text-white outline-none font-semibold min-w-0"
            />
          ) : (
            <button
              className="flex-1 text-left text-xs font-semibold text-white truncate hover:text-sphera-accent transition-colors group flex items-center gap-1 min-w-0"
              onDoubleClick={() => { setEditingProject(true); setProjectDraft(projectName); }}
              title={`${projectName} — double-click to rename`}
            >
              <span className="truncate">{projectName}</span>
              <Pencil size={9} className="opacity-0 group-hover:opacity-40 flex-shrink-0 transition-opacity" />
            </button>
          )}
          {editingProject && (
            <button onClick={commitProjectRename} className="text-sphera-accent p-0.5 flex-shrink-0">
              <Check size={11} />
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 text-[10px] text-sphera-muted">
          <span>{sceneCount} scene{sceneCount !== 1 ? 's' : ''}</span>
          {folderCount > 0 && (
            <>
              <span className="text-sphera-border">·</span>
              <span>{folderCount} folder{folderCount !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="flex-shrink-0 px-2.5 py-2 border-b border-sphera-border">
        <div className="relative flex items-center">
          <Search size={11} className="absolute left-2.5 text-sphera-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search scenes…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-sphera-surface border border-sphera-border rounded-lg pl-7 pr-7 py-1.5 text-[11px] text-sphera-text placeholder-sphera-border outline-none focus:border-sphera-accent/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-sphera-muted hover:text-white transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-2.5 py-1.5 border-b border-sphera-border">
        <span className="text-[10px] text-sphera-muted uppercase tracking-wider font-medium">
          {searchQuery ? 'Search results' : 'Project navigator'}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowFolderMenu(v => !v)}
            className="flex items-center gap-0.5 text-sphera-muted hover:text-white transition-colors p-1 rounded hover:bg-sphera-hover"
            title="Add folder"
          >
            <FolderPlus size={13} />
            <ChevronDown size={9} />
          </button>

          {showFolderMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFolderMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-sphera-surface border border-sphera-border rounded-xl shadow-2xl w-48 py-1.5 overflow-hidden">
                <div className="px-3 py-1 text-[10px] text-sphera-muted uppercase tracking-wider font-medium border-b border-sphera-border mb-1">
                  Add folder
                </div>
                {[
                  { label: 'New Group',    emoji: '📁' },
                  { label: 'New Building', emoji: '🏢' },
                  { label: 'New Floor',    emoji: '🪜' },
                  { label: 'New Zone',     emoji: '🗺' },
                  { label: 'New Room',     emoji: '🚪' },
                ].map(({ label, emoji }) => (
                  <button
                    key={label}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-sphera-text hover:bg-sphera-hover hover:text-white transition-colors"
                    onClick={() => { addFolder(label); setShowFolderMenu(false); }}
                  >
                    <span>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Scene tree ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 py-1">
        {scenes.length === 0 && !folders.length ? (
          <EmptyState />
        ) : (
          <SceneList searchQuery={searchQuery} />
        )}
      </div>

      {/* ── Footer hint ── */}
      {(scenes.length > 0 || folders.length > 0) && (
        <div className="flex-shrink-0 px-3 py-2 border-t border-sphera-border">
          <p className="text-[9px] text-sphera-border leading-relaxed">
            Double-click to rename · Right-click for options · Drag to reorder
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
        <Layers size={20} className="text-sphera-muted" />
      </div>
      <p className="text-xs text-sphera-text font-medium mb-1">No scenes yet</p>
      <p className="text-[11px] text-sphera-muted leading-snug">
        Click <span className="text-white font-medium">Upload Panoramas</span> in the toolbar to import images, videos, or fisheye photos.
      </p>
    </div>
  );
}
