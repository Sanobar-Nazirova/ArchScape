import React, { useState } from 'react';
import { Map, ChevronDown, ChevronUp } from 'lucide-react';
import type { FloorPlan } from '../../types';
import { useTourStore } from '../../store/useTourStore';

interface FloorPlanMinimapProps {
  floorPlan: FloorPlan;
  currentSceneId: string | null;
  currentYaw: number; // radians
  onSceneChange: (id: string) => void;
}

export default function FloorPlanMinimap({
  floorPlan, currentSceneId, currentYaw, onSceneChange,
}: FloorPlanMinimapProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { scenes } = useTourStore();
  const W = 180;
  const H = 120;

  const currentMarker = floorPlan.markers.find(m => m.sceneId === currentSceneId);

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
          <span className="text-[10px] text-nm-muted font-medium">Floor Plan</span>
        </div>
        {collapsed ? <ChevronUp size={11} className="text-nm-border" /> : <ChevronDown size={11} className="text-nm-border" />}
      </div>

      {!collapsed && (
        <div className="relative" style={{ height: H }}>
          {/* Floor plan image */}
          <img
            src={floorPlan.imageUrl}
            alt="Floor Plan"
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Scene markers */}
          {floorPlan.markers.map(marker => {
            const scene = scenes.find(s => s.id === marker.sceneId);
            const isCurrent = marker.sceneId === currentSceneId;
            return (
              <div
                key={marker.sceneId}
                className="absolute cursor-pointer group"
                style={{
                  left: `${marker.x * 100}%`,
                  top: `${marker.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onClick={() => onSceneChange(marker.sceneId)}
                title={scene?.name}
              >
                {/* Outer ring for current */}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full border-2 border-nm-accent animate-ping opacity-50"
                    style={{ width: 20, height: 20, left: -4, top: -4 }} />
                )}

                <div
                  className={[
                    'rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-125',
                    isCurrent
                      ? 'bg-nm-accent border-white w-4 h-4'
                      : 'bg-nm-base border-nm-border w-3 h-3 hover:border-nm-accent',
                  ].join(' ')}
                >
                  {isCurrent && (
                    /* Direction arrow — rotated to match camera yaw */
                    <div
                      className="absolute w-3 h-3"
                      style={{ transform: `rotate(${(-currentYaw * 180 / Math.PI)}deg)` }}
                    >
                      <svg viewBox="0 0 12 12" fill="none" className="w-full h-full">
                        <polygon points="6,1 10,10 6,7 2,10" fill="white" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block pointer-events-none">
                  <span className="bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
                    {scene?.name ?? marker.sceneId}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
