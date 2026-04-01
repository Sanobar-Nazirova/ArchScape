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
import FolderItem from './FolderItem';

export default function SceneList() {
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

  // Scenes not in any folder
  const rootScenes = scenes.filter(s => !s.folderId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={scenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5 pb-2">
          {/* Folder groups */}
          {folders.map(folder => (
            <FolderItem
              key={folder.id}
              folder={folder}
              scenes={scenes.filter(s => s.folderId === folder.id)}
              activeSceneId={activeSceneId}
            />
          ))}

          {/* Root scenes (no folder) */}
          {rootScenes.map(scene => (
            <SceneItem key={scene.id} scene={scene} isActive={scene.id === activeSceneId} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
