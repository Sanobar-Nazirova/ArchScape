import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Mic, Navigation, Info, Video, Image as ImageIcon,
  Pencil, Copy, Trash2, FolderInput,
} from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import type { Scene } from '../../types';

interface SceneItemProps {
  scene: Scene;
  isActive: boolean;
  depth?: number;
}

export default function SceneItem({ scene, isActive, depth = 0 }: SceneItemProps) {
  const {
    setActiveScene, renameScene, removeScene, setSelectedElement,
    duplicateScene, setSceneFolderId, folders,
  } = useTourStore();

  const [editing, setEditing]     = useState(false);
  const [draftName, setDraftName] = useState(scene.name);
  const [ctxMenu, setCtxMenu]     = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitRename = () => {
    const name = draftName.trim() || scene.name;
    renameScene(scene.id, name);
    setDraftName(name);
    setEditing(false);
  };

  const handleClick = () => {
    setActiveScene(scene.id);
    setSelectedElement('scene', scene.id);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const buildMenuItems = (): ContextMenuItem[] => {
    const moveItems: ContextMenuItem[] = [
      {
        label: 'No folder (root)',
        icon: <ImageIcon size={11} />,
        onClick: () => setSceneFolderId(scene.id, null),
        disabled: scene.folderId === null,
      },
      ...folders.map(f => ({
        label: f.name,
        icon: <FolderInput size={11} />,
        onClick: () => setSceneFolderId(scene.id, f.id),
        disabled: scene.folderId === f.id,
      })),
    ];

    return [
      {
        label: 'Open scene',
        icon: <ImageIcon size={11} />,
        onClick: handleClick,
      },
      {
        label: 'Rename',
        icon: <Pencil size={11} />,
        onClick: () => { setEditing(true); setDraftName(scene.name); },
      },
      {
        label: 'Duplicate',
        icon: <Copy size={11} />,
        onClick: () => duplicateScene(scene.id),
      },
      { separator: true, label: '', onClick: () => {} },
      ...moveItems.map(item => ({ ...item, label: `→ ${item.label}` })),
      { separator: true, label: '', onClick: () => {} },
      {
        label: 'Delete scene',
        icon: <Trash2 size={11} />,
        danger: true,
        onClick: () => removeScene(scene.id),
      },
    ];
  };

  // Scene type icon
  const TypeIcon = scene.mediaType === 'panorama-video' ? Video : ImageIcon;
  const typeColor = scene.mediaType === 'panorama-video' ? 'text-purple-400' : 'text-sphera-muted';

  return (
    <>
      <div
        ref={setNodeRef}
        style={{ ...style, paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={[
          'group flex items-center gap-1.5 py-1 pr-2 rounded-lg cursor-pointer transition-all select-none',
          'border',
          isActive
            ? 'bg-sphera-accent/15 border-sphera-accent/30 shadow-sm'
            : 'hover:bg-sphera-hover border-transparent hover:border-white/5',
        ].join(' ')}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="text-sphera-border/50 hover:text-sphera-muted cursor-grab active:cursor-grabbing flex-shrink-0 -ml-0.5"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical size={11} />
        </span>

        {/* Type icon */}
        <TypeIcon size={11} className={`flex-shrink-0 ${typeColor}`} />

        {/* Thumbnail */}
        <div className="w-9 h-6 rounded overflow-hidden flex-shrink-0 bg-sphera-surface border border-white/5">
          {scene.thumbnail ? (
            <img src={scene.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-sphera-surface" />
          )}
        </div>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setDraftName(scene.name); setEditing(false); }
                e.stopPropagation();
              }}
              onClick={e => e.stopPropagation()}
              className="w-full bg-sphera-surface border border-sphera-accent/50 rounded px-1.5 py-0.5 text-[11px] text-white outline-none"
            />
          ) : (
            <span
              className={[
                'text-[11px] truncate block leading-tight',
                isActive ? 'text-white font-medium' : 'text-sphera-text',
              ].join(' ')}
              onDoubleClick={e => { e.stopPropagation(); setEditing(true); setDraftName(scene.name); }}
              title={scene.name}
            >
              {scene.name}
            </span>
          )}

          {/* Indicator badges */}
          {!editing && (
            <div className="flex items-center gap-1 mt-0.5">
              {scene.hotspots.length > 0 && (
                <span className="flex items-center gap-0.5 text-[9px] text-sphera-accent/70 leading-none">
                  <Navigation size={8} />
                  {scene.hotspots.length}
                </span>
              )}
              {scene.mediaPoints.length > 0 && (
                <span className="flex items-center gap-0.5 text-[9px] text-yellow-400/70 leading-none">
                  <Info size={8} />
                  {scene.mediaPoints.length}
                </span>
              )}
              {scene.audioSources.length > 0 && (
                <span className="flex items-center gap-0.5 text-[9px] text-green-400/70 leading-none">
                  <Mic size={8} />
                </span>
              )}
              {(!scene.hotspots.length && !scene.mediaPoints.length && !scene.audioSources.length) && (
                <span className="text-[9px] text-sphera-border leading-none">empty</span>
              )}
            </div>
          )}
        </div>

        {/* Active indicator dot */}
        {isActive && (
          <div className="w-1.5 h-1.5 rounded-full bg-sphera-accent flex-shrink-0" />
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
