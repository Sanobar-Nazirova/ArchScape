import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Toolbar from '../components/Toolbar/Toolbar';
import Sidebar from '../components/Sidebar/Sidebar';
import PanoramaViewer from '../components/Viewer/PanoramaViewer';
import PropertiesPanel from '../components/PropertiesPanel/PropertiesPanel';
import ScenePicker from '../components/ScenePicker';
import { useTourStore } from '../store/useTourStore';
import type { Hotspot } from '../types';
import { ChevronLeft, ChevronRight, Maximize2, Play, Pause, Lock } from 'lucide-react';

/* ─── Presentation HUD (overlay during preview) ───────────────────────── */
function PresentationHUD() {
  const { scenes, activeSceneId, setActiveScene, togglePreviewMode } = useTourStore();
  const [, startTransition] = useTransition();
  const idx  = scenes.findIndex(s => s.id === activeSceneId);
  const prev = scenes[idx - 1];
  const next = scenes[idx + 1];

  // ── Guided tour (auto-advance) state ────────────────────────────────────
  const INTERVAL_MS = 10000;
  const [isPlaying, setIsPlaying]   = useState(false);
  const [progress, setProgress]     = useState(0); // 0–1
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef                      = useRef<number>(0);
  const startTimeRef                = useRef<number>(0);

  const stopPlayback = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const advanceScene = useCallback(() => {
    const state = useTourStore.getState();
    const currentIdx = state.scenes.findIndex(s => s.id === state.activeSceneId);
    const nextIdx = (currentIdx + 1) % state.scenes.length;
    setActiveScene(state.scenes[nextIdx].id);
    startTimeRef.current = performance.now();
  }, [setActiveScene]);

  useEffect(() => {
    if (!isPlaying) return;
    startTimeRef.current = performance.now();

    // rAF loop for smooth progress bar
    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      setProgress(Math.min(elapsed / INTERVAL_MS, 1));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    intervalRef.current = setInterval(advanceScene, INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, advanceScene]);

  // Stop playback when user manually navigates
  const navigate = (id: string) => {
    stopPlayback();
    setActiveScene(id);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  return (
    <>
      {/* ── Progress bar (visible only when playing) ── */}
      {isPlaying && (
        <div className="absolute bottom-[56px] left-0 right-0 z-30 h-0.5 bg-white/10">
          <div
            className="h-full bg-white"
            style={{ width: `${progress * 100}%`, transition: 'none' }}
          />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/70 to-transparent px-5 py-4 flex items-center justify-between gap-3">
        {/* Exit */}
        <button
          onClick={() => { stopPlayback(); startTransition(() => togglePreviewMode()); }}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs text-white/80 hover:text-white bg-black/40 backdrop-blur-sm rounded-full transition-all"
        >
          ✕ Exit
        </button>

        {/* ← Play/Pause dots → */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { stopPlayback(); prev && setActiveScene(prev.id); }}
            disabled={!prev}
            className="w-7 h-7 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full text-white/70 hover:text-white disabled:opacity-20 transition-all"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Play / Pause button */}
          <button
            onClick={() => isPlaying ? stopPlayback() : setIsPlaying(true)}
            className="w-7 h-7 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full text-white/70 hover:text-white transition-all"
            title={isPlaying ? 'Pause auto-advance' : 'Play guided tour (10s per scene)'}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>

          <div className="flex items-center gap-1.5">
            {scenes.map((s, i) => (
              <button
                key={s.id}
                onClick={() => navigate(s.id)}
                title={s.name}
                className={`rounded-full transition-all ${
                  i === idx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => { stopPlayback(); next && setActiveScene(next.id); }}
            disabled={!next}
            className="w-7 h-7 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full text-white/70 hover:text-white disabled:opacity-20 transition-all"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-white/70 hover:text-white bg-black/40 backdrop-blur-sm rounded-full transition-all"
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
    isPreviewMode, togglePreviewMode, restoreSceneImages,
    projectName, currentProjectId, currentTourId, projects,
  } = useTourStore();

  // Derive the current tour's password from the store
  const tourPassword = (currentProjectId && currentTourId)
    ? projects[currentProjectId]?.tours[currentTourId]?.password
    : undefined;

  // Restore panorama images from IndexedDB when editor opens (after page refresh)
  useEffect(() => { restoreSceneImages(); }, []);

  const activeScene = scenes.find(s => s.id === activeSceneId) ?? null;
  const [pendingHotspotId, setPendingHotspotId] = useState<string | null>(null);

  // ── Password gate state ──────────────────────────────────────────────────
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);
  const [passwordInput, setPasswordInput]       = useState('');
  const [passwordError, setPasswordError]       = useState(false);

  // ── Splash screen state ─────────────────────────────────────────────────
  const [splashDone, setSplashDone] = useState(false);
  const [countdown, setCountdown]   = useState(8);
  const countdownRef                = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPreviewMode) {
      setSplashDone(false);
      setCountdown(8);
    } else {
      setPasswordUnlocked(false);
      setPasswordInput('');
      setPasswordError(false);
      setSplashDone(false);
    }
  }, [isPreviewMode]);

  // Auto-enter after 8 seconds when splash is showing
  useEffect(() => {
    if (!isPreviewMode || splashDone) {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      return;
    }
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          setSplashDone(true);
          if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    };
  }, [isPreviewMode, splashDone]);

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
      if (e.key === ' ') {
        e.preventDefault();
        togglePreviewMode();
      }
      if (e.key === 'ArrowLeft') {
        const i = scenes.findIndex(s => s.id === activeSceneId);
        if (i > 0) setActiveScene(scenes[i - 1].id);
      }
      if (e.key === 'ArrowRight') {
        const i = scenes.findIndex(s => s.id === activeSceneId);
        if (i < scenes.length - 1) setActiveScene(scenes[i + 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActiveTool, togglePreviewMode, scenes, activeSceneId, setActiveScene]);

  /* ── Password gate ── */
  if (isPreviewMode && tourPassword && !passwordUnlocked) {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === tourPassword) {
        setPasswordUnlocked(true);
        setPasswordError(false);
      } else {
        setPasswordError(true);
      }
    };

    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6">
        <Lock size={40} className="text-white/40" />
        <h1 className="text-2xl font-bold text-white">This tour is password protected</h1>
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3 w-full max-w-xs">
          <input
            autoFocus
            type="password"
            value={passwordInput}
            onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
            placeholder="Enter password…"
            className="w-full px-4 py-3 rounded-xl text-sm text-white bg-white/10 border border-white/20 outline-none placeholder:text-white/30 focus:border-white/50 transition-colors"
          />
          {passwordError && (
            <p className="text-red-400 text-sm">Incorrect password</p>
          )}
          <button
            type="submit"
            className="w-full px-6 py-3 bg-nm-accent text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Unlock Tour
          </button>
        </form>
        <button
          onClick={togglePreviewMode}
          className="text-white/40 hover:text-white/70 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  /* ── Splash screen ── */
  if (isPreviewMode && !splashDone) {
    const dots = Array.from({ length: 8 }, (_, i) => i);
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-black gap-6">
        <div className="text-white/20 text-xs uppercase tracking-widest">Virtual Tour</div>
        <h1 className="text-4xl font-bold text-white">{projectName}</h1>
        <p className="text-white/50 text-sm max-w-md text-center">{scenes.length} scene{scenes.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setSplashDone(true)}
          className="mt-4 px-8 py-3 bg-nm-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity"
        >
          Enter Tour →
        </button>
        {/* Countdown dot animation */}
        <div className="flex items-center gap-1.5 mt-2">
          {dots.map(i => (
            <div
              key={i}
              className={`rounded-full transition-all duration-500 ${
                i < countdown ? 'w-2 h-2 bg-white/60' : 'w-1.5 h-1.5 bg-white/15'
              }`}
            />
          ))}
        </div>
        <p className="text-white/25 text-xs">Auto-entering in {countdown}s</p>
      </div>
    );
  }

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
