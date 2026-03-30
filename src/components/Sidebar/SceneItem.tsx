import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Eye } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import type { Scene } from '../../types';

interface SceneItemProps {
  scene: Scene;
  isActive: boolean;
}

export default function SceneItem({ scene, isActive }: SceneItemProps) {
  const { setActiveScene, renameScene, removeScene, setSelectedElement } = useTourStore();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(scene.name);
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={[
        'group flex items-center gap-2 px-2 py-1.5 mx-2 rounded-lg cursor-pointer transition-all',
        isActive
          ? 'bg-sphera-accent/15 border border-sphera-accent/30'
          : 'hover:bg-sphera-hover border border-transparent',
      ].join(' ')}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="text-sphera-border hover:text-sphera-muted cursor-grab active:cursor-grabbing flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={13} />
      </span>

      {/* Thumbnail */}
      <div className="w-10 h-6 rounded overflow-hidden flex-shrink-0 bg-sphera-surface">
        {scene.thumbnail ? (
          <img src={scene.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-sphera-surface flex items-center justify-center">
            <Eye size={10} className="text-sphera-border" />
          </div>
        )}
      </div>

      {/* Name */}
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
            className="w-full bg-sphera-surface border border-sphera-accent/50 rounded px-1.5 py-0.5 text-xs text-white outline-none"
          />
        ) : (
          <span
            className={[
              'text-xs truncate block leading-snug',
              isActive ? 'text-white' : 'text-sphera-text',
            ].join(' ')}
            onDoubleClick={e => { e.stopPropagation(); setEditing(true); setDraftName(scene.name); }}
            title={scene.name}
          >
            {scene.name}
          </span>
        )}
        <span className="text-[10px] text-sphera-muted leading-none">
          {scene.hotspots.length} hs · {scene.mediaPoints.length} media
        </span>
      </div>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); removeScene(scene.id); }}
        className="opacity-0 group-hover:opacity-100 text-sphera-muted hover:text-red-400 transition-all flex-shrink-0"
        title="Remove scene"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
