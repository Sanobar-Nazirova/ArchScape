import React from 'react';
import { Settings, Navigation, Info, Music, Map, Layers } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import SceneProperties from './SceneProperties';
import HotspotProperties from './HotspotProperties';
import MediaProperties from './MediaProperties';
import AudioProperties from './AudioProperties';
import FloorPlanEditor from './FloorPlanEditor';

/* ─── Tab bar ───────────────────────────────────────────────────────────── */
function PanelTabs() {
  const { floorPlan, isFloorPlanEditing, setFloorPlanEditing } = useTourStore();
  if (!floorPlan) return null;
  return (
    <div className="flex border-b border-sphera-border flex-shrink-0">
      <TabBtn label="Scene"      icon={<Layers size={11} />} active={!isFloorPlanEditing} onClick={() => setFloorPlanEditing(false)} />
      <TabBtn label="Floor Plan" icon={<Map    size={11} />} active={isFloorPlanEditing}  onClick={() => setFloorPlanEditing(true)}  />
    </div>
  );
}

function TabBtn({ label, icon, active, onClick }: {
  label: string; icon: React.ReactNode; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors',
        active ? 'border-sphera-accent text-sphera-accent' : 'border-transparent text-sphera-muted hover:text-white',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── PropertiesPanel ───────────────────────────────────────────────────── */
export default function PropertiesPanel() {
  const {
    scenes, activeSceneId,
    selectedElementId, selectedElementType,
    floorPlan, activeTool, isFloorPlanEditing,
  } = useTourStore();

  const activeScene = scenes.find(s => s.id === activeSceneId) ?? null;

  // ── Determine what to show ─────────────────────────────────────────────
  const isEditingElement =
    selectedElementType === 'hotspot' ||
    selectedElementType === 'media'   ||
    selectedElementType === 'audio'   ||
    activeTool === 'audio';

  let panelTitle = 'Properties';
  let panelIcon: React.ReactNode = <Settings size={13} />;
  let content: React.ReactNode = null;
  let showTabs = false;

  if (selectedElementType === 'hotspot' && selectedElementId && activeScene) {
    const hotspot = activeScene.hotspots.find(h => h.id === selectedElementId);
    if (hotspot) {
      panelTitle = 'Hotspot';
      panelIcon  = <Navigation size={13} />;
      content    = <HotspotProperties sceneId={activeScene.id} hotspot={hotspot} />;
    }
  } else if (selectedElementType === 'media' && selectedElementId && activeScene) {
    const mp = activeScene.mediaPoints.find(m => m.id === selectedElementId);
    if (mp) {
      panelTitle = 'Media Point';
      panelIcon  = <Info size={13} />;
      content    = <MediaProperties sceneId={activeScene.id} media={mp} />;
    }
  } else if (selectedElementType === 'audio' || activeTool === 'audio') {
    panelTitle = 'Audio';
    panelIcon  = <Music size={13} />;
    content    = activeScene ? <AudioProperties sceneId={activeScene.id} /> : null;
  } else if (!isEditingElement && isFloorPlanEditing && floorPlan) {
    panelTitle = 'Floor Plan';
    panelIcon  = <Map size={13} />;
    content    = <FloorPlanEditor />;
    showTabs   = true;
  } else if (activeScene) {
    panelTitle = 'Scene';
    panelIcon  = <Layers size={13} />;
    content    = <SceneProperties scene={activeScene} />;
    showTabs   = !!floorPlan;
  }

  return (
    <aside className="flex flex-col h-full bg-sphera-panel border-l border-sphera-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-sphera-border flex-shrink-0">
        <span className="text-sphera-muted">{panelIcon}</span>
        <span className="text-xs font-semibold text-sphera-text uppercase tracking-wider">{panelTitle}</span>
      </div>

      {/* Scene/FloorPlan tabs (only when not editing an element) */}
      {showTabs && !isEditingElement && <PanelTabs />}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {content ?? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Settings size={24} className="text-sphera-border mb-3" />
            <p className="text-xs text-sphera-muted">
              {scenes.length === 0
                ? 'Upload panoramas or add demo scenes to get started.'
                : 'Select a scene, hotspot, or media point to edit its properties.'}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
