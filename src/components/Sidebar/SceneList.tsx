import React, { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronRight } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import SceneItem from './SceneItem';
import FolderNode from './FolderItem';

interface SceneListProps {
  searchQuery: string;
  zoneFilter?: string | null; // folder id or null = all
}

export default function SceneList({ searchQuery, zoneFilter }: SceneListProps) {
  const { scenes, folders, activeSceneId, reorderScenes } = useTourStore();
  const [unassignedExpanded, setUnassignedExpanded] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderScenes(active.id as string, over.id as string);
    }
  };

  // Filter by search query
  const q = searchQuery.toLowerCase().trim();
  const filteredScenes = q
    ? scenes.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.tags ?? []).some(t => t.toLowerCase().includes(q)),
      )
    : scenes;

  // When searching, show flat list of matched scenes
  if (q) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredScenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="px-2 space-y-0.5 pb-2">
            {filteredScenes.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-nm-muted">
                No scenes match &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredScenes.map(scene => (
                <SceneItem key={scene.id} scene={scene} isActive={scene.id === activeSceneId} depth={0} />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  // When zone filter active, show only scenes in that folder
  const visibleScenes = zoneFilter
    ? filteredScenes.filter(s => s.folderId === zoneFilter)
    : filteredScenes;

  // Root-level folders (no parent)
  const rootFolders = folders.filter(f => !f.parentId);

  // Filter folders when zone filter is active
  const visibleFolders = zoneFilter
    ? rootFolders.filter(f => f.id === zoneFilter)
    : rootFolders;

  // Root-level scenes (no folder)
  const rootScenes = visibleScenes.filter(s => !s.folderId);

  // Unassigned scenes (no folderId) only shown when no filter active
  const unassignedScenes = zoneFilter ? [] : scenes.filter(s => !s.folderId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={scenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="px-2 space-y-0.5 pb-2">
          {/* Folder tree */}
          {visibleFolders.map(folder => (
            <FolderNode
              key={folder.id}
              folder={folder}
              allFolders={folders}
              allScenes={filteredScenes}
              activeSceneId={activeSceneId}
              depth={0}
            />
          ))}

          {/* Unassigned scenes section */}
          {unassignedScenes.length > 0 && folders.length > 0 && (
            <div className="mt-1">
              {/* Unassigned header */}
              <button
                className="group w-full flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-nm-surface transition-colors border border-transparent hover:border-white/5 text-left"
                onClick={() => setUnassignedExpanded(v => !v)}
              >
                <ChevronRight
                  size={12}
                  className={[
                    'flex-shrink-0 text-nm-muted/60 transition-transform duration-150',
                    unassignedExpanded ? 'rotate-90' : '',
                  ].join(' ')}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.25)' }}
                />
                <span className="flex-1 text-[11px] font-semibold text-nm-muted truncate">
                  Unassigned
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--nm-border)' }}
                >
                  {unassignedScenes.length} scene{unassignedScenes.length !== 1 ? 's' : ''}
                </span>
              </button>

              {unassignedExpanded && (
                <div className="relative ml-3 pl-2" style={{ borderLeft: '2px solid rgba(255,255,255,0.07)' }}>
                  {rootScenes.map(scene => (
                    <SceneItem
                      key={scene.id}
                      scene={scene}
                      isActive={scene.id === activeSceneId}
                      depth={1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Root scenes when no folders exist */}
          {folders.length === 0 && rootScenes.map(scene => (
            <SceneItem
              key={scene.id}
              scene={scene}
              isActive={scene.id === activeSceneId}
              depth={0}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
