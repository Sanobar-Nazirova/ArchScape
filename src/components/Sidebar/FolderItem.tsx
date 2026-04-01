import React, { useState } from 'react';
import { ChevronRight, FolderOpen, Folder as FolderIcon, Trash2, Pencil } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import SceneItem from './SceneItem';
import type { Folder, Scene } from '../../types';

interface FolderItemProps {
  folder: Folder;
  scenes: Scene[];
  activeSceneId: string | null;
}

export default function FolderItem({ folder, scenes, activeSceneId }: FolderItemProps) {
  const { toggleFolder, renameFolder, removeFolder } = useTourStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folder.name);

  const commitRename = () => {
    renameFolder(folder.id, draft.trim() || folder.name);
    setEditing(false);
  };

  return (
    <div className="mb-1">
      <div
        className="group flex items-center gap-1.5 px-2 py-1.5 mx-2 rounded-lg cursor-pointer hover:bg-sphera-hover transition-all"
        onClick={() => toggleFolder(folder.id)}
      >
        <ChevronRight
          size={13}
          className={['text-sphera-muted transition-transform', folder.isExpanded ? 'rotate-90' : ''].join(' ')}
        />
        {folder.isExpanded
          ? <FolderOpen size={13} className="text-sphera-accent flex-shrink-0" />
          : <FolderIcon  size={13} className="text-sphera-muted flex-shrink-0" />
        }

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
            className="flex-1 bg-sphera-surface border border-sphera-accent/50 rounded px-1.5 py-0.5 text-xs text-white outline-none"
          />
        ) : (
          <span className="flex-1 text-xs text-sphera-text truncate" title={folder.name}>
            {folder.name}
          </span>
        )}

        <span className="text-[10px] text-sphera-border">{scenes.length}</span>

        <button
          onClick={e => { e.stopPropagation(); setEditing(true); setDraft(folder.name); }}
          className="opacity-0 group-hover:opacity-100 text-sphera-muted hover:text-white ml-auto transition-all"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); removeFolder(folder.id); }}
          className="opacity-0 group-hover:opacity-100 text-sphera-muted hover:text-red-400 transition-all"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {folder.isExpanded && (
        <div className="pl-4">
          {scenes.map(scene => (
            <SceneItem key={scene.id} scene={scene} isActive={scene.id === activeSceneId} />
          ))}
        </div>
      )}
    </div>
  );
}
