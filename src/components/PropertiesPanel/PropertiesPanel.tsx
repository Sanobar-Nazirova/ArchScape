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
    <div className="flex flex-shrink-0 px-3 pt-3 gap-1">
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
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-nm-sm transition-all font-medium"
      style={active ? {
        color: 'var(--nm-accent)',
        boxShadow: 'inset 3px 3px 7px var(--sh-d-in), inset -2px -2px 5px var(--sh-l-in)',
        background: 'rgba(224,123,63,0.08)',
      } : { color: 'var(--nm-muted)' }}
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
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--nm-base)', borderLeft: '1px solid var(--nm-border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--nm-border)' }}
      >
        <span style={{ color: 'var(--nm-accent)' }}>{panelIcon}</span>
        <span className="text-xs font-semibold uppercase tracking-widest font-syne" style={{ color: 'var(--nm-text)' }}>
          {panelTitle}
        </span>
      </div>

      {showTabs && !isEditingElement && <PanelTabs />}

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {content ?? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-3">
            <div
              className="w-12 h-12 rounded-nm flex items-center justify-center"
              style={{ boxShadow: '4px 4px 10px var(--sh-d), -2px -2px 6px var(--sh-l)' }}
            >
              <Settings size={20} style={{ color: 'var(--nm-muted)', opacity: 0.5 }} />
            </div>
            <p className="text-xs" style={{ color: 'var(--nm-muted)' }}>
              {scenes.length === 0
                ? 'Upload scenes to get started.'
                : 'Select a scene, hotspot, or media point to view properties.'}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
