import React, { useCallback, useEffect } from 'react';
import Toolbar from './components/Toolbar/Toolbar';
import Sidebar from './components/Sidebar/Sidebar';
import PanoramaViewer from './components/Viewer/PanoramaViewer';
import PropertiesPanel from './components/PropertiesPanel/PropertiesPanel';
import { useTourStore } from './store/useTourStore';
import type { Hotspot } from './types';
import { ChevronLeft, ChevronRight, Maximize2, Eye } from 'lucide-react';

/* ─── Preview HUD ─────────────────────────────────────────────────────── */
function PreviewHUD() {
  const { scenes, activeSceneId, setActiveScene, togglePreviewMode } = useTourStore();

  const activeIndex = scenes.findIndex(s => s.id === activeSceneId);
  const prev = scenes[activeIndex - 1];
  const next = scenes[activeIndex + 1];

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <>
      {/* Bottom nav bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
        <div className="pointer-events-auto">
          {prev ? (
            <button
              onClick={() => setActiveScene(prev.id)}
              className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl text-white text-xs hover:bg-black/80 transition-colors"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:block max-w-[120px] truncate">{prev.name}</span>
            </button>
          ) : <div />}
        </div>

        {/* Scene dots */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {scenes.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveScene(s.id)}
              title={s.name}
              className={[
                'rounded-full transition-all',
                s.id === activeSceneId ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70',
              ].join(' ')}
            />
          ))}
        </div>

        <div className="pointer-events-auto">
          {next ? (
            <button
              onClick={() => setActiveScene(next.id)}
              className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl text-white text-xs hover:bg-black/80 transition-colors"
            >
              <span className="hidden sm:block max-w-[120px] truncate">{next.name}</span>
              <ChevronRight size={14} />
            </button>
          ) : <div />}
        </div>
      </div>

      {/* Top controls */}
      <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-auto">
        <button
          onClick={togglePreviewMode}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl text-white text-xs hover:bg-black/80 transition-colors"
        >
          <Eye size={12} />
          Exit Preview
        </button>
      </div>

      <div className="absolute top-4 right-4 z-20 pointer-events-auto">
        <button
          onClick={handleFullscreen}
          className="w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl text-white hover:bg-black/80 transition-colors"
          title="Fullscreen"
        >
          <Maximize2 size={13} />
        </button>
      </div>
    </>
  );
}

/* ─── App ─────────────────────────────────────────────────────────────── */
export default function App() {
  const {
    scenes, activeSceneId, setActiveScene,
    selectedElementId, setSelectedElement,
    activeTool, setActiveTool,
    addHotspot, addMediaPoint,
    isPreviewMode,
  } = useTourStore();

  const activeScene = scenes.find(s => s.id === activeSceneId) ?? null;

  const handleHotspotClick  = useCallback((hs: Hotspot) => {
    if (hs.targetSceneId) setActiveScene(hs.targetSceneId);
  }, [setActiveScene]);

  const handleHotspotPlace = useCallback((yaw: number, pitch: number) => {
    if (activeSceneId) addHotspot(activeSceneId, yaw, pitch);
  }, [activeSceneId, addHotspot]);

  const handleMediaPlace = useCallback((yaw: number, pitch: number) => {
    if (activeSceneId) addMediaPoint(activeSceneId, yaw, pitch);
  }, [activeSceneId, addMediaPoint]);

  const handleHotspotSelect = useCallback((id: string) => setSelectedElement('hotspot', id), [setSelectedElement]);
  const handleMediaSelect   = useCallback((id: string) => setSelectedElement('media',   id), [setSelectedElement]);

  // Keyboard shortcuts
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

  /* ── Preview mode ── */
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
        />
        <PreviewHUD />
      </div>
    );
  }

  /* ── Editor layout ── */
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-sphera-bg">
      <Toolbar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-64 flex-shrink-0 overflow-hidden">
          <Sidebar />
        </div>

        {/* Central viewer */}
        <div className="flex-1 min-w-0 overflow-hidden">
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
          />
        </div>

        {/* Right properties panel */}
        <div className="w-72 flex-shrink-0 overflow-hidden">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}
