import React, { useRef, useCallback } from 'react';
import { X, Trash2, MapPin } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';

export default function FloorPlanEditor() {
  const { scenes, floorPlan, setFloorPlanMarker, removeFloorPlanMarker, removeFloorPlan, activeSceneId } = useTourStore();
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current || !activeSceneId) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    setFloorPlanMarker(activeSceneId, x, y);
  }, [activeSceneId, setFloorPlanMarker]);

  if (!floorPlan) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-nm-muted uppercase tracking-wide font-medium">Floor Plan Editor</p>
        <button
          onClick={() => removeFloorPlan()}
          className="text-nm-muted hover:text-red-400 transition-colors"
          title="Remove floor plan"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {activeSceneId ? (
        <p className="text-[11px] text-nm-muted leading-snug">
          Click on the floor plan to place a marker for{' '}
          <span className="text-white">"{scenes.find(s => s.id === activeSceneId)?.name}"</span>.
        </p>
      ) : (
        <p className="text-[11px] text-nm-muted">Select a scene to place its marker.</p>
      )}

      {/* Floor plan image with markers overlay */}
      <div
        className="relative rounded-xl overflow-hidden border border-nm-border cursor-crosshair"
        onClick={handleImageClick}
      >
        <img
          ref={imgRef}
          src={floorPlan.imageUrl}
          alt="Floor Plan"
          className="w-full object-contain block"
          draggable={false}
        />

        {/* Markers */}
        {floorPlan.markers.map(m => {
          const sc = scenes.find(s => s.id === m.sceneId);
          const isActive = m.sceneId === activeSceneId;
          return (
            <div
              key={m.sceneId}
              className="absolute"
              style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, transform: 'translate(-50%, -100%)' }}
              title={sc?.name}
              onClick={e => e.stopPropagation()}
            >
              <MapPin
                size={18}
                className={isActive ? 'text-nm-accent drop-shadow' : 'text-nm-muted'}
                fill={isActive ? '#4f7cff' : 'transparent'}
              />
            </div>
          );
        })}
      </div>

      {/* Marker list */}
      {floorPlan.markers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-nm-muted uppercase tracking-wide font-medium">Placed Markers</p>
          {floorPlan.markers.map(m => {
            const sc = scenes.find(s => s.id === m.sceneId);
            return (
              <div key={m.sceneId} className="flex items-center gap-2 px-2 py-1.5 bg-nm-base rounded-lg border border-nm-border">
                <MapPin size={11} className="text-nm-accent flex-shrink-0" />
                <span className="flex-1 text-xs text-nm-text truncate">{sc?.name ?? m.sceneId}</span>
                <button
                  onClick={() => removeFloorPlanMarker(m.sceneId)}
                  className="text-nm-muted hover:text-red-400 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
