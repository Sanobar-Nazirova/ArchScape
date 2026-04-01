import React, { useState, useCallback } from 'react';
import {
  ChevronRight, FolderOpen, Folder as FolderIcon,
  FolderPlus, Pencil, Trash2, FolderInput,
} from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import SceneItem from './SceneItem';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import type { Folder, Scene } from '../../types';

// Depth-based accent colors for visual hierarchy
const DEPTH_COLORS = [
  'text-nm-accent',   // depth 0 – blue
  'text-purple-400',      // depth 1 – purple
  'text-teal-400',        // depth 2 – teal
  'text-amber-400',       // depth 3 – amber
  'text-pink-400',        // depth 4+ – pink
];
const depthColor = (d: number) => DEPTH_COLORS[Math.min(d, DEPTH_COLORS.length - 1)];

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
    setSceneFolderId, moveFolderTo,
  } = useTourStore();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(folder.name);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const childFolders = allFolders.filter(f => f.parentId === folder.id);
  const folderScenes = allScenes.filter(s => s.folderId === folder.id);
  const totalItems   = childFolders.length + folderScenes.length;

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

  const indentPx = depth * 14;
  const iconColor = depthColor(depth);

  return (
    <>
      <div className="select-none">
        {/* Folder row */}
        <div
          className="group flex items-center gap-1.5 py-1 pr-2 rounded-lg cursor-pointer hover:bg-nm-surface transition-colors border border-transparent hover:border-white/5"
          style={{ paddingLeft: `${8 + indentPx}px` }}
          onClick={() => !editing && toggleFolder(folder.id)}
          onContextMenu={handleContextMenu}
        >
          {/* Expand arrow */}
          <ChevronRight
            size={12}
            className={[
              'flex-shrink-0 text-nm-muted/60 transition-transform duration-150',
              folder.isExpanded ? 'rotate-90' : '',
            ].join(' ')}
          />

          {/* Folder icon */}
          {folder.isExpanded
            ? <FolderOpen size={13} className={`flex-shrink-0 ${iconColor}`} />
            : <FolderIcon  size={13} className={`flex-shrink-0 ${iconColor} opacity-70`} />
          }

          {/* Name / edit input */}
          {editing ? (
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
              onClick={e => e.stopPropagation()}
              className="flex-1 bg-nm-surface border border-nm-accent/50 rounded px-1.5 py-0.5 text-[11px] text-white outline-none"
            />
          ) : (
            <span
              className="flex-1 text-[11px] text-nm-text font-medium truncate"
              onDoubleClick={e => { e.stopPropagation(); setEditing(true); setDraft(folder.name); }}
              title={folder.name}
            >
              {folder.name}
            </span>
          )}

          {/* Item count badge */}
          {totalItems > 0 && (
            <span className="text-[9px] text-nm-border bg-nm-surface/80 px-1.5 py-0.5 rounded-full flex-shrink-0">
              {totalItems}
            </span>
          )}

          {/* Quick actions (hover) */}
          {!editing && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
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

        {/* Expanded children */}
        {folder.isExpanded && (
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
