import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Camera, RotateCcw, Save, Edit2, BookmarkPlus, Copy, Check } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import { ALL_FORMATS, formatLabel } from '../../utils/panoramaDetector';
import { clearFisheyeCache } from '../../utils/fisheyeConverter';
import type { Scene, FisheyeConfig } from '../../types';

/* ── Fisheye preset storage (localStorage) ──────────────────────────────── */
interface FisheyePreset { name: string; overlap: number; rotation: number; radius: number; }
const PRESETS_KEY = 'sphera_fisheye_presets_v1';
const loadPresets = (): FisheyePreset[] => {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY) ?? '[]'); } catch { return []; }
};
const savePresets = (list: FisheyePreset[]) => {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)); } catch {}
};

/* ── Conversion helpers ─────────────────────────────────────────────────── */
const fovToOverlap = (fov: number) => Math.max(0, Math.round((fov - 180) / 2));
const overlapToFov = (ov: number) => 180 + ov * 2;

/** Format-appropriate defaults — dual lenses use a smaller radius scale. */
function formatDefaults(format: string): { overlap: number; radius: number } {
  if (format === 'fisheye-dual-sbs' || format === 'fisheye-dual-tb') {
    return { overlap: 10, radius: 0.46 };
  }
  return { overlap: 0, radius: 0.92 };
}

/* ── Component ──────────────────────────────────────────────────────────── */
interface ScenePropertiesProps { scene: Scene; }

export default function SceneProperties({ scene }: ScenePropertiesProps) {
  const {
    renameScene, removeScene, updateSceneFormat, updateSceneStereoEye,
    updateSceneInitialView, setActiveScene, scenes, updateSceneFisheyeConfig,
  } = useTourStore();

  /* ── Fisheye editing state ─────────────────────────────────────────────── */
  const defs = formatDefaults(scene.format);
  const [fisheyeEditing, setFisheyeEditing] = useState(false);
  const [localOverlap, setLocalOverlap]   = useState(fovToOverlap(scene.fisheyeConfig?.fov ?? overlapToFov(defs.overlap)));
  const [localRotation, setLocalRotation] = useState(scene.fisheyeConfig?.yawOffset ?? 0);
  const [localRadius, setLocalRadius]     = useState(scene.fisheyeConfig?.radius ?? defs.radius);
  const [presets, setPresets]             = useState<FisheyePreset[]>(loadPresets);
  const [copied, setCopied]               = useState(false);

  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Snapshot taken when Edit is opened — used for Reset
  const editStartRef   = useRef<{ overlap: number; rotation: number; radius: number } | null>(null);

  /* Sync when switching scenes */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const d = formatDefaults(scene.format);
    setLocalOverlap(fovToOverlap(scene.fisheyeConfig?.fov ?? overlapToFov(d.overlap)));
    setLocalRotation(scene.fisheyeConfig?.yawOffset ?? 0);
    setLocalRadius(scene.fisheyeConfig?.radius ?? d.radius);
    setFisheyeEditing(false);
    editStartRef.current = null;
  }, [scene.id, scene.format]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Config builder ────────────────────────────────────────────────────── */
  const buildConfig = useCallback((overlap: number, rot: number, radius: number): FisheyeConfig => {
    const baseType: FisheyeConfig['type'] =
      scene.format === 'fisheye-dual-tb'  ? 'dual-tb'  :
      scene.format === 'fisheye-dual-sbs' ? 'dual-sbs' : 'single';
    return {
      type: baseType,
      fov:     overlapToFov(overlap),
      centerX: scene.fisheyeConfig?.centerX ?? (baseType === 'dual-sbs' ? 0.25 : 0.5),
      centerY: scene.fisheyeConfig?.centerY ?? (baseType === 'dual-tb'  ? 0.25 : 0.5),
      radius,
      yawOffset: rot,
    };
  }, [scene.format, scene.fisheyeConfig?.centerX, scene.fisheyeConfig?.centerY]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Apply to viewer (clears cache → viewer re-converts) ───────────────── */
  const applyNow = useCallback((overlap: number, rot: number, radius: number) => {
    clearFisheyeCache(scene.id);
    updateSceneFisheyeConfig(scene.id, buildConfig(overlap, rot, radius));
  }, [scene.id, buildConfig, updateSceneFisheyeConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedApply = useCallback((overlap: number, rot: number, radius: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyNow(overlap, rot, radius), 500);
  }, [applyNow]);

  /* ── Slider handlers ────────────────────────────────────────────────────── */
  const handleOverlap = (v: number) => { setLocalOverlap(v); debouncedApply(v, localRotation, localRadius); };
  const handleRadius  = (v: number) => { setLocalRadius(v);  debouncedApply(localOverlap, localRotation, v); };
  const handleRotation = (v: number) => {
    setLocalRotation(v);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)['__sphera_setFisheyeYaw']?.(v); // instant texture offset
    debouncedApply(localOverlap, v, localRadius);
  };

  /* ── Edit open / save / reset ───────────────────────────────────────────── */
  const openEdit = () => {
    editStartRef.current = { overlap: localOverlap, rotation: localRotation, radius: localRadius };
    setFisheyeEditing(true);
  };

  const handleReset = () => {
    const snap = editStartRef.current ?? { overlap: defs.overlap, rotation: 0, radius: defs.radius };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalOverlap(snap.overlap);
    setLocalRotation(snap.rotation);
    setLocalRadius(snap.radius);
    applyNow(snap.overlap, snap.rotation, snap.radius);
    setFisheyeEditing(false);
    editStartRef.current = null;
  };

  const handleSave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    applyNow(localOverlap, localRotation, localRadius);
    setFisheyeEditing(false);
    editStartRef.current = null;
  };

  /* ── Presets ─────────────────────────────────────────────────────────────── */
  const applyPreset = (p: FisheyePreset) => {
    setLocalOverlap(p.overlap);
    setLocalRotation(p.rotation);
    setLocalRadius(p.radius);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)['__sphera_setFisheyeYaw']?.(p.rotation);
    debouncedApply(p.overlap, p.rotation, p.radius);
  };

  const saveAsPreset = () => {
    const name = prompt('Preset name (e.g. "Insta360 X3"):');
    if (!name?.trim()) return;
    const newPreset: FisheyePreset = { name: name.trim(), overlap: localOverlap, rotation: localRotation, radius: localRadius };
    const updated = [...presets.filter(p => p.name !== newPreset.name), newPreset];
    setPresets(updated);
    savePresets(updated);
  };

  const copySettings = () => {
    const text = JSON.stringify({ overlap: localOverlap, rotation: localRotation, radius: localRadius });
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ── Other handlers ──────────────────────────────────────────────────────── */
  const handleSetCurrentView = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getter = (window as any)['__sphera_getCameraView'] as (() => { yaw: number; pitch: number }) | undefined;
    if (getter) { const { yaw, pitch } = getter(); updateSceneInitialView(scene.id, yaw, pitch); }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */
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
        <input type="text" value={scene.name}
          onChange={e => renameScene(scene.id, e.target.value)}
          className="input-base" />
      </Field>

      {/* Format */}
      <Field label="Panorama Format">
        <select value={scene.format}
          onChange={e => updateSceneFormat(scene.id, e.target.value as Scene['format'])}
          className="input-base">
          {ALL_FORMATS.map(f => <option key={f} value={f}>{formatLabel(f)}</option>)}
        </select>

        {/* ── Fisheye adjustment panel ─────────────────────────────────────── */}
        {scene.format.startsWith('fisheye') && (
          <div className="mt-2 rounded-xl border border-nm-border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="text-[10px] uppercase tracking-widest text-nm-muted font-medium">
                Fisheye Adjustment
              </span>
              {fisheyeEditing ? (
                <button onClick={handleReset}
                  className="text-[10px] text-nm-muted hover:text-red-400 transition-colors flex items-center gap-0.5">
                  <RotateCcw size={10} /> Reset
                </button>
              ) : (
                <button onClick={openEdit}
                  className="text-[10px] text-nm-accent hover:text-white transition-colors flex items-center gap-0.5">
                  <Edit2 size={10} /> Edit
                </button>
              )}
            </div>

            {/* Summary (collapsed) */}
            {!fisheyeEditing && (
              <div className="px-3 py-2 text-[10px] text-nm-muted">
                {scene.fisheyeConfig
                  ? <>Overlap {fovToOverlap(scene.fisheyeConfig.fov)}° · Rotation {scene.fisheyeConfig.yawOffset ?? 0}° · Radius {scene.fisheyeConfig.radius.toFixed(2)}</>
                  : 'Auto-detected — click Edit to adjust'}
              </div>
            )}

            {/* Edit panel */}
            {fisheyeEditing && (
              <div className="px-3 pb-3 pt-2 space-y-3">

                {/* Presets row */}
                <div className="flex items-center gap-1.5">
                  <select
                    defaultValue=""
                    onChange={e => {
                      const p = presets.find(x => x.name === e.target.value);
                      if (p) applyPreset(p);
                      e.target.value = '';
                    }}
                    className="flex-1 text-[10px] bg-nm-base border border-nm-border rounded-lg px-2 py-1.5 text-nm-muted outline-none"
                  >
                    <option value="" disabled>— Apply preset —</option>
                    {presets.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <button onClick={saveAsPreset} title="Save as preset"
                    className="p-1.5 rounded-lg border border-nm-border text-nm-muted hover:text-nm-accent transition-colors">
                    <BookmarkPlus size={12} />
                  </button>
                  <button onClick={copySettings} title="Copy settings to clipboard"
                    className="p-1.5 rounded-lg border border-nm-border text-nm-muted hover:text-nm-accent transition-colors">
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>

                {/* Overlap slider */}
                <SliderField
                  label={`Overlap: ${localOverlap}°`}
                  min={0} max={50} step={1} value={localOverlap}
                  onChange={handleOverlap}
                  hint="Stretches each circle past the horizon — increase until the seam gap closes"
                />

                {/* Rotation slider */}
                <SliderField
                  label={`Rotation: ${localRotation}°`}
                  min={-180} max={180} step={1} value={localRotation}
                  onChange={handleRotation}
                  hint="Rotate the panorama to move the seam to a less visible spot"
                />

                {/* Radius slider */}
                <SliderField
                  label={`Radius: ${localRadius.toFixed(2)}`}
                  min={0.5} max={1.3} step={0.01} value={localRadius}
                  onChange={handleRadius}
                  hint="Size of the fisheye circle within each image half"
                />

                <button onClick={handleSave}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--nm-accent)' }}>
                  <Save size={11} /> Save &amp; Apply
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stereo eye toggle */}
        {(scene.format === 'equirectangular-sbs' || scene.format === 'equirectangular-tb') && (
          <div className="mt-2">
            <p className="text-[10px] text-nm-muted mb-1.5">Stereo Eye to Display</p>
            <div className="flex rounded-lg overflow-hidden border border-nm-border">
              {(['left', 'right'] as const).map(eye => {
                const label = scene.format === 'equirectangular-tb'
                  ? eye === 'left' ? 'Top (left eye)' : 'Bottom (right eye)'
                  : eye === 'left' ? 'Left eye' : 'Right eye';
                return (
                  <button key={eye} onClick={() => updateSceneStereoEye(scene.id, eye)}
                    className={[
                      'flex-1 py-1.5 text-xs transition-colors',
                      (scene.stereoEye ?? 'left') === eye ? 'bg-nm-accent text-white' : 'text-nm-muted hover:text-nm-text',
                    ].join(' ')}>
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
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
          scene.mediaType === 'panorama-video'
            ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
            : 'bg-nm-accent/15 border-nm-accent/30 text-nm-accent'
        }`}>
          {scene.mediaType === 'panorama-video' ? '360° Video' : 'Panorama Image'}
        </span>
      </Field>

      {/* Initial View */}
      <Field label="Initial View">
        <button onClick={handleSetCurrentView}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 12px rgba(224,123,63,.35), -2px -2px 6px rgba(255,255,255,.05)' }}>
          <Camera size={14} />
          Save Current View
        </button>
        <p className="text-[10px] text-nm-muted mt-1.5 text-center leading-snug">
          Navigate to the desired starting angle, then click to save.
        </p>
      </Field>

      {/* Scene stats */}
      <Field label="Scene Contents">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Hotspots" value={scene.hotspots.length} />
          <Stat label="Media"    value={scene.mediaPoints.length} />
          <Stat label="Audio"    value={scene.audioSources.length} />
        </div>
      </Field>

      {/* Delete */}
      <div className="pt-2 border-t border-nm-border">
        <button
          onClick={() => {
            if (confirm(`Delete scene "${scene.name}"?`)) {
              const remaining = scenes.filter(s => s.id !== scene.id);
              setActiveScene(remaining[0]?.id ?? null);
              removeScene(scene.id);
            }
          }}
          className="flex items-center gap-2 text-xs text-red-400/70 hover:text-red-400 transition-colors">
          <Trash2 size={13} />
          Delete Scene
        </button>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
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
      <span className="text-[10px] text-nm-text">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 mt-1 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: 'var(--nm-accent)' }} />
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
