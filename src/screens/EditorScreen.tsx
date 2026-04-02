import React, { useCallback, useEffect, useState } from 'react';
import Toolbar from '../components/Toolbar/Toolbar';
import Sidebar from '../components/Sidebar/Sidebar';
import PanoramaViewer from '../components/Viewer/PanoramaViewer';
import PropertiesPanel from '../components/PropertiesPanel/PropertiesPanel';
import ScenePicker from '../components/ScenePicker';
import { useTourStore } from '../store/useTourStore';
import type { Hotspot } from '../types';
import { ChevronLeft, ChevronRight, Maximize2, Play } from 'lucide-react';

/* ─── Presentation HUD (overlay during preview) ───────────────────────── */
function PresentationHUD() {
  const { scenes, activeSceneId, setActiveScene, togglePreviewMode } = useTourStore();
  const idx  = scenes.findIndex(s => s.id === activeSceneId);
  const prev = scenes[idx - 1];
  const next = scenes[idx + 1];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  return (
    <>
      {/* Scene name overlay */}
      {scenes[idx] && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="px-4 py-2 rounded-full text-white text-sm font-medium bg-black/50 backdrop-blur-sm">
            {scenes[idx].name}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-gradient-to-t from-black/70 to-transparent">
        <button
          onClick={togglePreviewMode}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/80 hover:text-white bg-black/40 backdrop-blur-sm rounded-full transition-all"
        >
          ✕ Exit
        </button>

        {/* Dots */}
        <div className="flex items-center gap-2">
          {prev && (
            <button
              onClick={() => setActiveScene(prev.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-white bg-black/40 backdrop-blur-sm rounded-full transition-all"
            >
              <ChevronLeft size={13} />
              <span className="max-w-[100px] truncate">{prev.name}</span>
            </button>
          )}
          <div className="flex items-center gap-1.5">
            {scenes.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveScene(s.id)}
                title={s.name}
                className={`rounded-full transition-all ${
                  i === idx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
          {next && (
            <button
              onClick={() => setActiveScene(next.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/70 hover:text-white bg-black/40 backdrop-blur-sm rounded-full transition-all"
            >
              <span className="max-w-[100px] truncate">{next.name}</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>

        <button
          onClick={toggleFullscreen}
          className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white bg-black/40 backdrop-blur-sm rounded-full transition-all"
          title="Fullscreen"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </>
  );
}

/* ─── EditorScreen ─────────────────────────────────────────────────────── */
export default function EditorScreen() {
  const {
    scenes, activeSceneId, setActiveScene,
    selectedElementId, setSelectedElement,
    activeTool, setActiveTool,
    addHotspot, addMediaPoint, updateHotspot,
    isPreviewMode,
  } = useTourStore();

  const activeScene = scenes.find(s => s.id === activeSceneId) ?? null;
  const [pendingHotspotId, setPendingHotspotId] = useState<string | null>(null);

  const handleHotspotClick = useCallback((hs: Hotspot) => {
    if (hs.targetSceneId) setActiveScene(hs.targetSceneId);
  }, [setActiveScene]);

  const handleHotspotPlace = useCallback((yaw: number, pitch: number) => {
    if (activeSceneId) {
      const id = addHotspot(activeSceneId, yaw, pitch);
      setPendingHotspotId(id);
    }
  }, [activeSceneId, addHotspot]);

  const handleHotspotReposition = useCallback((hotspotId: string, yaw: number, pitch: number) => {
    if (activeSceneId) updateHotspot(activeSceneId, hotspotId, { yaw, pitch });
  }, [activeSceneId, updateHotspot]);

  const handleMediaPlace = useCallback((yaw: number, pitch: number) => {
    if (activeSceneId) addMediaPoint(activeSceneId, yaw, pitch);
  }, [activeSceneId, addMediaPoint]);

  const handleHotspotSelect = useCallback((id: string) => setSelectedElement('hotspot', id), [setSelectedElement]);
  const handleMediaSelect   = useCallback((id: string) => setSelectedElement('media', id),   [setSelectedElement]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') setActiveTool('none');
      if (e.key === 'h')      setActiveTool('hotspot');
      if (e.key === 'm')      setActiveTool('media');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActiveTool]);

  /* ── Presentation (preview) mode — full screen viewer ── */
  if (isPreviewMode) {
    return (
      <div className="w-screen h-screen bg-black overflow-hidden relative">
        <PanoramaViewer
          scene={activeScene}
          isPreviewMode
          activeTool="none"
          selectedElementId={null}
          onHotspotPlace={() => {}}
          onMediaPlace={() => {}}
          onHotspotClick={handleHotspotClick}
          onHotspotSelect={() => {}}
          onMediaSelect={() => {}}
          onHotspotReposition={() => {}}
        />
        <PresentationHUD />
        {pendingHotspotId && activeScene && (
          <ScenePicker
            scenes={scenes}
            currentSceneId={activeScene.id}
            onSelect={(targetId) => {
              updateHotspot(activeScene.id, pendingHotspotId, { targetSceneId: targetId });
              setPendingHotspotId(null);
            }}
            onClose={() => setPendingHotspotId(null)}
          />
        )}
      </div>
    );
  }

  /* ── Editor layout ── */
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col" style={{ background: 'var(--nm-base)' }}>
      <Toolbar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar — scene navigator + edit tools */}
        <div className="w-64 flex-shrink-0 overflow-hidden">
          <Sidebar />
        </div>

        {/* Central 360° viewer */}
        <div className="flex-1 min-w-0 overflow-hidden relative">
          {/* Active tool hint bar */}
          {activeTool !== 'none' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full text-xs font-medium text-white pointer-events-none"
              style={{ background: 'rgba(224,123,63,0.85)', backdropFilter: 'blur(6px)' }}>
              {activeTool === 'hotspot' && '🔗 Click in the viewer to place a navigation hotspot'}
              {activeTool === 'media'   && '🖼 Click in the viewer to place a media point'}
              {activeTool === 'audio'   && '🔊 Configure audio in the Properties panel →'}
            </div>
          )}
          <PanoramaViewer
            scene={activeScene}
            isPreviewMode={false}
            activeTool={activeTool}
            selectedElementId={selectedElementId}
            onHotspotPlace={handleHotspotPlace}
            onMediaPlace={handleMediaPlace}
            onHotspotClick={handleHotspotClick}
            onHotspotSelect={handleHotspotSelect}
            onMediaSelect={handleMediaSelect}
            onHotspotReposition={handleHotspotReposition}
          />
        </div>

        {/* Right properties panel */}
        <div className="w-72 flex-shrink-0 overflow-hidden">
          <PropertiesPanel />
        </div>
      </div>
      {pendingHotspotId && activeScene && (
        <ScenePicker
          scenes={scenes}
          currentSceneId={activeScene.id}
          onSelect={(targetId) => {
            updateHotspot(activeScene.id, pendingHotspotId, { targetSceneId: targetId });
            setPendingHotspotId(null);
          }}
          onClose={() => setPendingHotspotId(null)}
        />
      )}
    </div>
  );
}
