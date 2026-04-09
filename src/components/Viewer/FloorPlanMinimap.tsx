import React, { useEffect, useRef, useState } from 'react';
import { Map, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import type { FloorPlan } from '../../types';
import { useTourStore } from '../../store/useTourStore';

interface FloorPlanMinimapProps {
  floorPlans: FloorPlan[];
  activeFloorPlanId: string | null;
  onFloorPlanChange: (id: string | null) => void;
  currentSceneId: string | null;
  currentYaw: number; // radians
  onSceneChange: (id: string) => void;
  isEditMode?: boolean;
}

export default function FloorPlanMinimap({
  floorPlans, activeFloorPlanId, onFloorPlanChange,
  currentSceneId, currentYaw, onSceneChange, isEditMode = false,
}: FloorPlanMinimapProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [tagging, setTagging]     = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const { scenes, setFloorPlanMarker, removeFloorPlanMarker } = useTourStore();
  const W = 220;
  const H = 150;

  const floorPlan = floorPlans.find(f => f.id === activeFloorPlanId) ?? floorPlans[0] ?? null;

  // Auto-expand + reset tagging when scene changes
  useEffect(() => { setCollapsed(false); setTagging(false); }, [currentSceneId]);
  // Cancel tagging when switching floors
  useEffect(() => { setTagging(false); }, [activeFloorPlanId]);

  const currentMarker = floorPlan?.markers.find(m => m.sceneId === currentSceneId);
  const currentScene  = scenes.find(s => s.id === currentSceneId);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode || !tagging || !currentSceneId || !floorPlan || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left)  / rect.width;
    const y = (e.clientY - rect.top)   / rect.height;
    setFloorPlanMarker(floorPlan.id, currentSceneId, Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)));
    setTagging(false);
  };

  if (!floorPlan) return null;

  // Sort floors by level for tabs
  const sorted = [...floorPlans].sort((a, b) => a.level - b.level);

  return (
    <div
      className="absolute bottom-4 left-4 z-10 bg-nm-base/90 backdrop-blur-sm border border-nm-border rounded-xl overflow-hidden shadow-xl"
      style={{ width: W }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-nm-surface transition-colors"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-1.5">
          <Map size={11} className="text-nm-accent" />
          <span className="text-[10px] text-nm-muted font-medium truncate max-w-[120px]">{floorPlan.name}</span>
        </div>
        {collapsed ? <ChevronUp size={11} className="text-nm-border" /> : <ChevronDown size={11} className="text-nm-border" />}
      </div>

      {!collapsed && (
        <>
          {/* Floor tabs (only when there are multiple) */}
          {sorted.length > 1 && (
            <div className="flex border-b border-nm-border overflow-x-auto">
              {sorted.map(fp => (
                <button
                  key={fp.id}
                  onClick={() => onFloorPlanChange(fp.id)}
                  className={[
                    'flex-shrink-0 px-2 py-1 text-[9px] font-medium transition-colors whitespace-nowrap',
                    fp.id === floorPlan.id
                      ? 'text-nm-accent border-b-2 border-nm-accent -mb-px'
                      : 'text-nm-muted hover:text-nm-text',
                  ].join(' ')}
                >
                  {fp.name}
                </button>
              ))}
            </div>
          )}

          {/* Map area */}
          <div
            ref={imgRef}
            className="relative"
            style={{ height: H, cursor: tagging ? 'crosshair' : 'default' }}
            onClick={handleMapClick}
          >
            <img
              src={floorPlan.imageUrl}
              alt="Floor Plan"
              className="w-full h-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 bg-black/30" />

            {/* Tagging hint overlay */}
            {tagging && (
              <div className="absolute inset-0 bg-nm-accent/10 border-2 border-nm-accent/60 flex items-center justify-center pointer-events-none">
                <span className="bg-black/70 text-white text-[9px] px-2 py-1 rounded font-medium">
                  Click to place marker
                </span>
              </div>
            )}

            {/* Scene markers */}
            {floorPlan.markers.map(marker => {
              const scene = scenes.find(s => s.id === marker.sceneId);
              const isCurrent = marker.sceneId === currentSceneId;
              return (
                <div
                  key={marker.sceneId}
                  className="absolute group"
                  style={{
                    left: `${marker.x * 100}%`,
                    top:  `${marker.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: isCurrent ? 'default' : 'pointer',
                    zIndex: isCurrent ? 2 : 1,
                  }}
                  onClick={e => { e.stopPropagation(); if (!isCurrent) onSceneChange(marker.sceneId); }}
                  title={scene?.name}
                >
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full border-2 border-nm-accent animate-ping opacity-50"
                      style={{ width: 20, height: 20, left: -4, top: -4 }} />
                  )}
                  <div className={[
                    'rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-125',
                    isCurrent
                      ? 'bg-nm-accent border-white w-4 h-4'
                      : 'bg-nm-base border-nm-border w-3 h-3 hover:border-nm-accent',
                  ].join(' ')}>
                    {isCurrent && (
                      <div className="absolute w-3 h-3"
                        style={{ transform: `rotate(${(-currentYaw * 180 / Math.PI)}deg)` }}>
                        <svg viewBox="0 0 12 12" fill="none" className="w-full h-full">
                          <polygon points="6,1 10,10 6,7 2,10" fill="white" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block pointer-events-none">
                    <span className="bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
                      {scene?.name ?? marker.sceneId}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit-mode tag controls */}
          {isEditMode && currentSceneId && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-nm-border">
              {currentMarker ? (
                <>
                  <MapPin size={10} className="text-nm-accent flex-shrink-0" />
                  <span className="flex-1 text-[9px] text-nm-muted truncate">{currentScene?.name}</span>
                  <button
                    onClick={() => setTagging(v => !v)}
                    className={['text-[9px] px-1.5 py-0.5 rounded transition-colors',
                      tagging ? 'bg-nm-accent text-white' : 'text-nm-accent hover:bg-nm-accent/10',
                    ].join(' ')}
                  >Move</button>
                  <button
                    onClick={() => { removeFloorPlanMarker(floorPlan.id, currentSceneId); setTagging(false); }}
                    className="text-[9px] text-nm-muted hover:text-red-400 px-1 transition-colors"
                  >Remove</button>
                </>
              ) : (
                <>
                  <MapPin size={10} className="text-nm-muted flex-shrink-0" />
                  <span className="flex-1 text-[9px] text-nm-muted truncate">Not tagged</span>
                  <button
                    onClick={() => setTagging(v => !v)}
                    className={['text-[9px] px-1.5 py-0.5 rounded transition-colors font-medium',
                      tagging ? 'bg-nm-accent text-white' : 'bg-nm-accent/20 text-nm-accent hover:bg-nm-accent/30',
                    ].join(' ')}
                  >{tagging ? 'Cancel' : 'Tag location'}</button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
