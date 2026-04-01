import React from 'react';
import { Trash2, RotateCcw, Camera } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import { ALL_FORMATS, formatLabel, formatShortLabel } from '../../utils/panoramaDetector';
import type { Scene } from '../../types';

interface ScenePropertiesProps {
  scene: Scene;
}

export default function SceneProperties({ scene }: ScenePropertiesProps) {
  const {
    renameScene, removeScene, updateSceneFormat,
    updateSceneInitialView, setActiveScene, scenes,
  } = useTourStore();

  const handleSetCurrentView = () => {
    // This would ideally read the current camera yaw/pitch from the viewer.
    // We expose a global helper set by PanoramaViewer.
    const getter = (window as unknown as Record<string, unknown>)['__sphera_getCameraView'] as (() => { yaw: number; pitch: number }) | undefined;
    if (getter) {
      const { yaw, pitch } = getter();
      updateSceneInitialView(scene.id, yaw, pitch);
    }
  };

  return (
    <div className="space-y-5">
      {/* Thumbnail */}
      {scene.thumbnail && (
        <div className="rounded-xl overflow-hidden border border-nm-border">
          <img src={scene.thumbnail} alt="" className="w-full object-cover" style={{ height: 80 }} />
        </div>
      )}

      {/* Name */}
      <Field label="Scene Name">
        <input
          type="text"
          value={scene.name}
          onChange={e => renameScene(scene.id, e.target.value)}
          className="input-base"
        />
      </Field>

      {/* Format */}
      <Field label="Panorama Format">
        <select
          value={scene.format}
          onChange={e => updateSceneFormat(scene.id, e.target.value as Scene['format'])}
          className="input-base"
        >
          {ALL_FORMATS.map(f => (
            <option key={f} value={f}>{formatLabel(f)}</option>
          ))}
        </select>
        {scene.format.startsWith('fisheye') && (
          <div className="mt-1.5 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-yellow-400 text-[10px] leading-snug">
              ⚠ Fisheye images display best after conversion. Re-upload and choose "Convert &amp; Import" in the dialog.
            </span>
          </div>
        )}
        {(scene.format === 'equirectangular-sbs' || scene.format === 'equirectangular-tb') && (
          <p className="text-[10px] text-nm-muted mt-1 leading-snug">Stereo — left eye shown.</p>
        )}
        {scene.format === 'cylindrical' && (
          <p className="text-[10px] text-nm-muted mt-1 leading-snug">360° horizontal, limited vertical field of view.</p>
        )}
        {(scene.format === 'partial' || scene.format === 'rectilinear') && (
          <p className="text-[10px] text-nm-muted mt-1 leading-snug">Wide-angle, less than 360° coverage.</p>
        )}
      </Field>

      {/* Media type */}
      <Field label="Media Type">
        <div className="flex gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
            scene.mediaType === 'panorama-video'
              ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
              : 'bg-nm-accent/15 border-nm-accent/30 text-nm-accent'
          }`}>
            {scene.mediaType === 'panorama-video' ? '360° Video' : 'Panorama Image'}
          </span>
        </div>
      </Field>

      {/* Initial view */}
      <Field label="Initial View Angle">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-nm-muted mb-1">Yaw (°)</p>
            <input
              type="number"
              step="5"
              value={Math.round(scene.initialYaw * 180 / Math.PI)}
              onChange={e => updateSceneInitialView(scene.id, Number(e.target.value) * Math.PI / 180, scene.initialPitch)}
              className="input-base"
            />
          </div>
          <div>
            <p className="text-[10px] text-nm-muted mb-1">Pitch (°)</p>
            <input
              type="number"
              step="5"
              min="-85"
              max="85"
              value={Math.round(scene.initialPitch * 180 / Math.PI)}
              onChange={e => updateSceneInitialView(scene.id, scene.initialYaw, Number(e.target.value) * Math.PI / 180)}
              className="input-base"
            />
          </div>
        </div>
        <button
          onClick={handleSetCurrentView}
          className="mt-2 flex items-center gap-1.5 text-xs text-nm-muted hover:text-white transition-colors"
        >
          <Camera size={12} />
          Set from current view
        </button>
      </Field>

      {/* Stats */}
      <Field label="Scene Contents">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Hotspots" value={scene.hotspots.length} />
          <Stat label="Media"    value={scene.mediaPoints.length} />
          <Stat label="Audio"    value={scene.audioSources.length} />
        </div>
      </Field>

      {/* Danger zone */}
      <div className="pt-2 border-t border-nm-border">
        <button
          onClick={() => {
            if (confirm(`Delete scene "${scene.name}"?`)) {
              const remaining = scenes.filter(s => s.id !== scene.id);
              setActiveScene(remaining[0]?.id ?? null);
              removeScene(scene.id);
            }
          }}
          className="flex items-center gap-2 text-xs text-red-400/70 hover:text-red-400 transition-colors"
        >
          <Trash2 size={13} />
          Delete Scene
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-nm-muted uppercase tracking-wide font-medium mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-nm-base rounded-lg p-2 text-center">
      <p className="text-white font-semibold text-sm">{value}</p>
      <p className="text-[10px] text-nm-muted">{label}</p>
    </div>
  );
}
