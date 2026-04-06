import React, { useState, useEffect } from 'react';
import { Trash2, Camera, RotateCcw, Save, Edit2 } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import { ALL_FORMATS, formatLabel } from '../../utils/panoramaDetector';
import { clearFisheyeCache } from '../../utils/fisheyeConverter';
import type { Scene } from '../../types';

interface ScenePropertiesProps {
  scene: Scene;
}

export default function SceneProperties({ scene }: ScenePropertiesProps) {
  const {
    renameScene, removeScene, updateSceneFormat, updateSceneStereoEye,
    updateSceneInitialView, setActiveScene, scenes, updateSceneFisheyeConfig,
  } = useTourStore();

  // ── Fisheye adjustment local state ─────────────────────────────────────
  const [fisheyeEditing, setFisheyeEditing] = useState(false);
  const [localFov, setLocalFov]         = useState(scene.fisheyeConfig?.fov ?? 190);
  const [localRotation, setLocalRotation] = useState(scene.fisheyeConfig?.yawOffset ?? 0);
  const [localRadius, setLocalRadius]   = useState(scene.fisheyeConfig?.radius ?? 0.92);

  // Sync local state when a different scene is selected
  useEffect(() => {
    setLocalFov(scene.fisheyeConfig?.fov ?? 190);
    setLocalRotation(scene.fisheyeConfig?.yawOffset ?? 0);
    setLocalRadius(scene.fisheyeConfig?.radius ?? 0.92);
    setFisheyeEditing(false);
  }, [scene.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveFisheyeAdjust = () => {
    const baseType = scene.format === 'fisheye-dual-tb' ? 'dual-tb'
      : scene.format === 'fisheye-dual-sbs' ? 'dual-sbs'
      : 'single';
    const saved = {
      type: baseType as 'single' | 'dual-sbs' | 'dual-tb',
      fov: localFov,
      centerX: scene.fisheyeConfig?.centerX ?? (baseType === 'dual-sbs' ? 0.25 : 0.5),
      centerY: scene.fisheyeConfig?.centerY ?? (baseType === 'dual-tb'  ? 0.25 : 0.5),
      radius: localRadius,
      yawOffset: localRotation,
    };
    clearFisheyeCache(scene.id);
    updateSceneFisheyeConfig(scene.id, saved);
    setFisheyeEditing(false);
  };

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
          <div className="mt-2 rounded-xl border border-nm-border overflow-hidden">
            {/* Header row */}
            <div className="flex items-center justify-between px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="text-[10px] uppercase tracking-widest text-nm-muted font-medium">
                Fisheye Adjustment
              </span>
              {fisheyeEditing ? (
                <button
                  onClick={() => { setFisheyeEditing(false); setLocalFov(scene.fisheyeConfig?.fov ?? 190); setLocalRotation(scene.fisheyeConfig?.yawOffset ?? 0); setLocalRadius(scene.fisheyeConfig?.radius ?? 0.92); }}
                  className="text-[10px] text-nm-muted hover:text-nm-text transition-colors flex items-center gap-0.5"
                >
                  <RotateCcw size={10} /> Reset
                </button>
              ) : (
                <button onClick={() => setFisheyeEditing(true)}
                  className="text-[10px] text-nm-accent hover:text-white transition-colors flex items-center gap-0.5"
                >
                  <Edit2 size={10} /> Edit
                </button>
              )}
            </div>

            {/* Saved state badge */}
            {!fisheyeEditing && (
              <div className="px-3 py-2 text-[10px] text-nm-muted">
                {scene.fisheyeConfig
                  ? <>FOV {scene.fisheyeConfig.fov}° · Rotation {scene.fisheyeConfig.yawOffset ?? 0}° · Radius {scene.fisheyeConfig.radius.toFixed(2)}</>
                  : 'Auto-detected — click Edit to adjust'}
              </div>
            )}

            {/* Sliders */}
            {fisheyeEditing && (
              <div className="px-3 pb-3 space-y-3 pt-1">
                <SliderField
                  label={`FOV: ${localFov}°`}
                  min={140} max={240} step={1} value={localFov}
                  onChange={setLocalFov}
                  hint="Higher FOV extends coverage toward the seam"
                />
                <SliderField
                  label={`Rotation: ${localRotation}°`}
                  min={-180} max={180} step={1} value={localRotation}
                  onChange={setLocalRotation}
                  hint="Rotate the panorama to move the seam to a less visible spot"
                />
                <SliderField
                  label={`Radius: ${localRadius.toFixed(2)}`}
                  min={0.5} max={1.3} step={0.01} value={localRadius}
                  onChange={setLocalRadius}
                  hint="Fraction of half-image that each circle occupies"
                />
                <button
                  onClick={saveFisheyeAdjust}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--nm-accent)' }}
                >
                  <Save size={11} /> Save &amp; Apply
                </button>
              </div>
            )}
          </div>
        )}
        {(scene.format === 'equirectangular-sbs' || scene.format === 'equirectangular-tb') && (
          <div className="mt-2">
            <p className="text-[10px] text-nm-muted mb-1.5">Stereo Eye to Display</p>
            <div className="flex rounded-lg overflow-hidden border border-nm-border">
              {(['left', 'right'] as const).map(eye => {
                const label = scene.format === 'equirectangular-tb'
                  ? eye === 'left' ? 'Top (left eye)' : 'Bottom (right eye)'
                  : eye === 'left' ? 'Left eye' : 'Right eye';
                return (
                  <button
                    key={eye}
                    onClick={() => updateSceneStereoEye(scene.id, eye)}
                    className={[
                      'flex-1 py-1.5 text-xs transition-colors',
                      (scene.stereoEye ?? 'left') === eye
                        ? 'bg-nm-accent text-white'
                        : 'text-nm-muted hover:text-nm-text',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-nm-muted mt-1">Switch if image appears reversed/distorted.</p>
          </div>
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

      {/* Initial view — Save View button */}
      <Field label="Initial View">
        <button
          onClick={handleSetCurrentView}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 12px rgba(224,123,63,.35), -2px -2px 6px rgba(255,255,255,.05)' }}
        >
          <Camera size={14} />
          Save Current View
        </button>
        <p className="text-[10px] text-nm-muted mt-1.5 text-center leading-snug">
          Navigate to the desired starting angle, then click to save.
        </p>
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

function SliderField({ label, min, max, step, value, onChange, hint }: {
  label: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-nm-text">{label}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: 'var(--nm-accent)' }}
      />
      {hint && <p className="text-[9px] text-nm-muted mt-0.5 leading-snug">{hint}</p>}
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
