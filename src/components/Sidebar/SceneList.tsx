import React from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTourStore } from '../../store/useTourStore';
import SceneItem from './SceneItem';
import FolderNode from './FolderItem';

interface SceneListProps {
  searchQuery: string;
}

export default function SceneList({ searchQuery }: SceneListProps) {
  const { scenes, folders, activeSceneId, reorderScenes } = useTourStore();

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
                No scenes match "{searchQuery}"
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

  // Root-level folders (no parent)
  const rootFolders = folders.filter(f => !f.parentId);
  // Root-level scenes (no folder)
  const rootScenes = filteredScenes.filter(s => !s.folderId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={scenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="px-2 space-y-0.5 pb-2">
          {/* Folder tree */}
          {rootFolders.map(folder => (
            <FolderNode
              key={folder.id}
              folder={folder}
              allFolders={folders}
              allScenes={filteredScenes}
              activeSceneId={activeSceneId}
              depth={0}
            />
          ))}

          {/* Root scenes (not in any folder) */}
          {rootScenes.map(scene => (
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
