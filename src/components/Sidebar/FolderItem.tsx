import React, { useState, useCallback } from 'react';
import {
  ChevronRight, FolderOpen, Folder as FolderIcon,
  FolderPlus, Pencil, Trash2, FolderInput, Check,
} from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import SceneItem from './SceneItem';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import type { Folder, Scene } from '../../types';

export const ZONE_PRESET_COLORS = [
  '#e07b3f', '#3b82f6', '#10b981', '#8b5cf6',
  '#f59e0b', '#ef4444', '#06b6d4', '#ec4899',
];

// Depth-based fallback accent colors (used when no color set)
const DEPTH_COLORS = [
  'text-nm-accent',
  'text-purple-400',
  'text-teal-400',
  'text-amber-400',
  'text-pink-400',
];
const depthColor = (d: number) => DEPTH_COLORS[Math.min(d, DEPTH_COLORS.length - 1)];

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {ZONE_PRESET_COLORS.map(color => (
        <button
          key={color}
          onClick={e => { e.stopPropagation(); onChange(color); }}
          title={color}
          className="w-4 h-4 rounded-full flex-shrink-0 transition-transform hover:scale-110"
          style={{
            background: color,
            outline: value === color ? `2px solid ${color}` : '2px solid transparent',
            outlineOffset: '1px',
          }}
        />
      ))}
    </div>
  );
}

interface FolderNodeProps {
  folder: Folder;
  allFolders: Folder[];
  allScenes: Scene[];
  activeSceneId: string | null;
  depth?: number;
}

export default function FolderNode({
  folder, allFolders, allScenes, activeSceneId, depth = 0,
}: FolderNodeProps) {
  const {
    toggleFolder, renameFolder, removeFolder, addFolder,
    setSceneFolderId, moveFolderTo, updateFolderColor,
  } = useTourStore();

  const [editing, setEditing]         = useState(false);
  const [draft, setDraft]             = useState(folder.name);
  const [ctxMenu, setCtxMenu]         = useState<{ x: number; y: number } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const childFolders = allFolders.filter(f => f.parentId === folder.id);
  const folderScenes = allScenes.filter(s => s.folderId === folder.id);
  const sceneCount   = folderScenes.length;
  const totalItems   = childFolders.length + sceneCount;

  const commitRename = () => {
    renameFolder(folder.id, draft.trim() || folder.name);
    setEditing(false);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const buildMenuItems = (): ContextMenuItem[] => {
    const parentFolderOptions: ContextMenuItem[] = [
      {
        label: 'Move to root',
        icon: <FolderIcon size={11} />,
        onClick: () => moveFolderTo(folder.id, null),
        disabled: !folder.parentId,
      },
      ...allFolders
        .filter(f => f.id !== folder.id && f.parentId !== folder.id)
        .map(f => ({
          label: `→ ${f.name}`,
          icon: <FolderInput size={11} />,
          onClick: () => moveFolderTo(folder.id, f.id),
          disabled: folder.parentId === f.id,
        })),
    ];

    return [
      {
        label: 'Add subfolder',
        icon: <FolderPlus size={11} />,
        onClick: () => addFolder('New Folder', folder.id),
      },
      {
        label: 'Rename',
        icon: <Pencil size={11} />,
        onClick: () => { setEditing(true); setDraft(folder.name); },
      },
      { separator: true, label: '', onClick: () => {} },
      ...parentFolderOptions,
      { separator: true, label: '', onClick: () => {} },
      {
        label: 'Delete folder',
        icon: <Trash2 size={11} />,
        danger: true,
        onClick: () => removeFolder(folder.id),
      },
    ];
  };

  const indentPx  = depth * 14;
  const iconColor = depthColor(depth);
  const zoneColor = folder.color;

  return (
    <>
      <div className="select-none">
        {/* Folder header row */}
        <div
          className="group flex items-center gap-1.5 py-1 pr-2 rounded-lg cursor-pointer hover:bg-nm-surface transition-colors border border-transparent hover:border-white/5"
          style={{ paddingLeft: `${8 + indentPx}px` }}
          onClick={() => !editing && !showColorPicker && toggleFolder(folder.id)}
          onContextMenu={handleContextMenu}
        >
          {/* Expand chevron */}
          <ChevronRight
            size={12}
            className={[
              'flex-shrink-0 text-nm-muted/60 transition-transform duration-150',
              folder.isExpanded ? 'rotate-90' : '',
            ].join(' ')}
          />

          {/* Zone color dot or folder icon */}
          {zoneColor ? (
            <span
              className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
              style={{ background: zoneColor }}
            />
          ) : (
            folder.isExpanded
              ? <FolderOpen size={13} className={`flex-shrink-0 ${iconColor}`} />
              : <FolderIcon  size={13} className={`flex-shrink-0 ${iconColor} opacity-70`} />
          )}

          {/* Name / edit input */}
          {editing ? (
            <div className="flex-1 flex items-center gap-1 min-w-0" onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditing(false);
                  e.stopPropagation();
                }}
                className="flex-1 bg-nm-surface border border-nm-accent/50 rounded px-1.5 py-0.5 text-[11px] text-white outline-none min-w-0"
              />
              <button
                onClick={e => { e.stopPropagation(); commitRename(); }}
                className="text-nm-accent flex-shrink-0"
              >
                <Check size={10} />
              </button>
            </div>
          ) : (
            <span
              className="flex-1 text-[11px] text-nm-text font-semibold truncate"
              onDoubleClick={e => { e.stopPropagation(); setEditing(true); setDraft(folder.name); }}
              title={folder.name}
              style={zoneColor ? { color: zoneColor } : undefined}
            >
              {folder.name}
            </span>
          )}

          {/* Scene count badge */}
          {sceneCount > 0 && !editing && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
              style={zoneColor
                ? { background: `${zoneColor}22`, color: zoneColor }
                : { background: 'rgba(255,255,255,0.07)', color: 'var(--nm-border)' }
              }
            >
              {sceneCount} scene{sceneCount !== 1 ? 's' : ''}
            </span>
          )}

          {/* Quick actions (hover) */}
          {!editing && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
              {/* Color picker toggle */}
              <button
                onClick={e => { e.stopPropagation(); setShowColorPicker(v => !v); }}
                className="p-0.5 rounded text-nm-muted hover:text-white transition-colors"
                title="Set zone color"
              >
                <span
                  className="block w-2.5 h-2.5 rounded-full border border-white/20"
                  style={{ background: zoneColor ?? 'rgba(255,255,255,0.2)' }}
                />
              </button>
              <button
                onClick={e => { e.stopPropagation(); addFolder('New Folder', folder.id); }}
                className="p-0.5 rounded text-nm-muted hover:text-white transition-colors"
                title="Add subfolder"
              >
                <FolderPlus size={11} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setEditing(true); setDraft(folder.name); }}
                className="p-0.5 rounded text-nm-muted hover:text-white transition-colors"
                title="Rename"
              >
                <Pencil size={10} />
              </button>
            </div>
          )}
        </div>

        {/* Inline color picker */}
        {showColorPicker && (
          <div
            className="mx-2 mb-1 px-2 py-1.5 rounded-lg"
            style={{ background: 'var(--nm-surface)', border: '1px solid rgba(255,255,255,0.07)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-[9px] text-nm-muted mb-1.5 uppercase tracking-widest">Zone color</div>
            <ColorPicker
              value={zoneColor}
              onChange={color => {
                updateFolderColor(folder.id, color);
                setShowColorPicker(false);
              }}
            />
          </div>
        )}

        {/* Left border accent on expanded state */}
        {folder.isExpanded && zoneColor && (
          <div
            className="ml-3 pl-2 relative"
            style={{ borderLeft: `2px solid ${zoneColor}33` }}
          >
            {/* Child folders */}
            {childFolders.map(child => (
              <FolderNode
                key={child.id}
                folder={child}
                allFolders={allFolders}
                allScenes={allScenes}
                activeSceneId={activeSceneId}
                depth={depth + 1}
              />
            ))}

            {/* Scenes in this folder */}
            {folderScenes.map(scene => (
              <SceneItem
                key={scene.id}
                scene={scene}
                isActive={scene.id === activeSceneId}
                depth={depth + 1}
              />
            ))}

            {/* Empty folder hint */}
            {totalItems === 0 && (
              <div
                className="py-1.5 text-[10px] text-nm-border italic"
                style={{ paddingLeft: `${10 + indentPx}px` }}
              >
                Empty zone
              </div>
            )}
          </div>
        )}

        {/* Expanded children — no color accent */}
        {folder.isExpanded && !zoneColor && (
          <div className="relative">
            {/* Vertical guide line */}
            <div
              className="absolute top-0 bottom-0 w-px bg-white/5"
              style={{ left: `${12 + indentPx + 7}px` }}
            />

            {/* Child folders first */}
            {childFolders.map(child => (
              <FolderNode
                key={child.id}
                folder={child}
                allFolders={allFolders}
                allScenes={allScenes}
                activeSceneId={activeSceneId}
                depth={depth + 1}
              />
            ))}

            {/* Scenes in this folder */}
            {folderScenes.map(scene => (
              <SceneItem
                key={scene.id}
                scene={scene}
                isActive={scene.id === activeSceneId}
                depth={depth + 1}
              />
            ))}

            {/* Empty folder hint */}
            {totalItems === 0 && (
              <div
                className="py-1.5 text-[10px] text-nm-border italic"
                style={{ paddingLeft: `${24 + indentPx}px` }}
              >
                Empty folder
              </div>
            )}
          </div>
        )}
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildMenuItems()}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );
}
