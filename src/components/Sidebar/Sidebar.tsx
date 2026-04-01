import React, { useState, useRef, useEffect } from 'react';
import {
  Search, FolderPlus, X, Layers,
  ChevronDown, Pencil, Check,
  Plus, Image, Music, Map, Upload,
} from 'lucide-react';
import { triggerUpload } from '../../utils/uploadTrigger';
import { useTourStore } from '../../store/useTourStore';
import SceneList from './SceneList';

export default function Sidebar() {
  const {
    scenes, folders, projectName, setProjectName, addFolder,
    activeTool, setActiveTool, setFloorPlan,
  } = useTourStore();

  const [searchQuery, setSearchQuery]       = useState('');
  const [editingProject, setEditingProject] = useState(false);
  const [projectDraft, setProjectDraft]     = useState(projectName);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const floorPlanInputRef = useRef<HTMLInputElement>(null);

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
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--nm-base)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >

      {/* ── Tour header ── */}
      <div
        className="flex-shrink-0 px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Layers size={12} className="text-nm-accent flex-shrink-0" />
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
              className="flex-1 bg-transparent rounded-nm-sm px-2 py-0.5 text-xs text-nm-text outline-none font-semibold min-w-0"
              style={{ boxShadow: 'inset 2px 2px 5px var(--sh-d-in), inset -1px -1px 3px var(--sh-l-in)' }}
            />
          ) : (
            <button
              className="flex-1 text-left text-xs font-semibold text-nm-text truncate hover:text-nm-accent transition-colors group flex items-center gap-1 min-w-0 font-syne"
              onDoubleClick={() => { setEditingProject(true); setProjectDraft(projectName); }}
              title={`${projectName} — double-click to rename`}
            >
              <span className="truncate">{projectName}</span>
              <Pencil size={9} className="opacity-0 group-hover:opacity-40 flex-shrink-0 transition-opacity" />
            </button>
          )}
          {editingProject && (
            <button onClick={commitProjectRename} className="text-nm-accent p-0.5 flex-shrink-0">
              <Check size={11} />
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 text-[10px] text-nm-muted">
          <span>{sceneCount} scene{sceneCount !== 1 ? 's' : ''}</span>
          {folderCount > 0 && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span>{folderCount} folder{folderCount !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div
        className="flex-shrink-0 px-3 py-2.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="relative flex items-center">
          <Search size={11} className="absolute left-3 text-nm-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search scenes…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent rounded-nm-sm pl-8 pr-7 py-2 text-[11px] text-nm-text placeholder:text-nm-muted outline-none"
            style={{ boxShadow: 'inset 2px 2px 6px var(--sh-d-in), inset -2px -2px 4px var(--sh-l-in)' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-nm-muted hover:text-nm-text transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Section label + add folder ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-[10px] text-nm-muted uppercase tracking-widest font-medium">
          {searchQuery ? 'Results' : 'Scenes'}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowFolderMenu(v => !v)}
            className="flex items-center gap-0.5 text-nm-muted hover:text-nm-text transition-colors p-1 rounded"
            title="Add folder"
          >
            <FolderPlus size={13} />
            <ChevronDown size={9} />
          </button>

          {showFolderMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFolderMenu(false)} />
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-nm-sm w-48 py-1.5 overflow-hidden"
                style={{ background: 'var(--nm-base)', boxShadow: '8px 8px 20px var(--sh-d), -4px -4px 12px var(--sh-l)' }}
              >
                <div
                  className="px-3 py-1 text-[10px] text-nm-muted uppercase tracking-widest font-medium mb-1"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
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
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-nm-muted hover:text-nm-text transition-colors"
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

      {/* ── Edit Tools section ── */}
      <div
        className="flex-shrink-0 px-3 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="text-[10px] text-nm-muted uppercase tracking-widest font-medium mb-2">Edit Tools</div>
        <div className="grid grid-cols-2 gap-2">
          <EditToolBtn
            icon={<Plus size={13} />}
            label="Hotspot"
            active={activeTool === 'hotspot'}
            disabled={scenes.length < 2}
            onClick={() => setActiveTool(activeTool === 'hotspot' ? 'none' : 'hotspot')}
            title="Add navigation hotspot [H]"
          />
          <EditToolBtn
            icon={<Image size={13} />}
            label="Media"
            active={activeTool === 'media'}
            disabled={scenes.length === 0}
            onClick={() => setActiveTool(activeTool === 'media' ? 'none' : 'media')}
            title="Add media point [M]"
          />
          <EditToolBtn
            icon={<Music size={13} />}
            label="Audio"
            active={activeTool === 'audio'}
            disabled={scenes.length === 0}
            onClick={() => setActiveTool(activeTool === 'audio' ? 'none' : 'audio')}
            title="Scene audio"
          />
          <EditToolBtn
            icon={<Map size={13} />}
            label="Floor Plan"
            active={false}
            disabled={false}
            onClick={() => floorPlanInputRef.current?.click()}
            title="Upload floor plan"
          />
        </div>
      </div>

      {/* Hidden floor plan input */}
      <input
        ref={floorPlanInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => setFloorPlan(reader.result as string);
            reader.readAsDataURL(file);
          }
          e.target.value = '';
        }}
      />

      {/* ── Footer hint ── */}
      {(scenes.length > 0 || folders.length > 0) && (
        <div className="flex-shrink-0 px-3 pb-2">
          <p className="text-[9px] text-nm-muted leading-relaxed opacity-50">
            Double-click to rename · Right-click for options
          </p>
        </div>
      )}
    </aside>
  );
}

function EditToolBtn({
  icon, label, active, disabled, onClick, title,
}: {
  icon: React.ReactNode; label: string; active: boolean;
  disabled: boolean; onClick: () => void; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'flex items-center gap-1.5 px-2.5 py-2 rounded-nm-sm text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed',
        active ? 'text-nm-accent' : 'text-nm-muted hover:text-nm-text',
      ].join(' ')}
      style={active ? {
        boxShadow: 'inset 3px 3px 7px var(--sh-d-in), inset -2px -2px 5px var(--sh-l-in)',
        background: 'rgba(224,123,63,0.1)',
      } : {
        boxShadow: '3px 3px 7px var(--sh-d), -2px -2px 5px var(--sh-l)',
      }}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center gap-3">
      <div
        className="w-12 h-12 rounded-nm flex items-center justify-center"
        style={{ boxShadow: '4px 4px 10px var(--sh-d), -2px -2px 6px var(--sh-l)' }}
      >
        <Layers size={20} className="text-nm-muted opacity-50" />
      </div>
      <div>
        <p className="text-xs text-nm-text font-medium mb-1">No scenes yet</p>
        <p className="text-[11px] text-nm-muted leading-snug">
          Upload panoramas to get started.
        </p>
      </div>
      <button
        onClick={triggerUpload}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-nm-sm mt-1"
        style={{ background: 'var(--nm-accent)', boxShadow: '3px 3px 8px rgba(224,123,63,.4)' }}
      >
        <Upload size={12} />
        Upload
      </button>
    </div>
  );
}
