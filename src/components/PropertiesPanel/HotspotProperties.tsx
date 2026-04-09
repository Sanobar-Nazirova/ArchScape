import React, { useState } from 'react';
import { Trash2, Layers, RefreshCw, Plus, X, Info, Star, AlertTriangle, Check } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import type { Hotspot, HotspotIconStyle } from '../../types';
import ScenePicker from '../ScenePicker';

const ICON_STYLES: HotspotIconStyle[] = ['arrow', 'door', 'circle', 'stairs', 'exit'];

interface HotspotPropertiesProps {
  sceneId: string;
  hotspot: Hotspot;
}

export default function HotspotProperties({ sceneId, hotspot }: HotspotPropertiesProps) {
  const { scenes, updateHotspot, removeHotspot, syncVariantHotspot } = useTourStore();
  const update = (updates: Partial<Hotspot>) => updateHotspot(sceneId, hotspot.id, updates);

  const otherScenes = scenes.filter(s => s.id !== sceneId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);

  return (
    <div className="space-y-5">

      {/* Hotspot Type */}
      <Field label="Hotspot Type">
        <div className="flex rounded-xl overflow-hidden border border-nm-border">
          {([
            { value: 'navigation', icon: '→',             label: 'Navigation'   },
            { value: 'variants',   icon: <Layers size={11} />, label: 'Design Options' },
            { value: 'info',       icon: <Info size={11} />,   label: 'Info Card'   },
          ] as const).map(t => (
            <button key={t.value} onClick={() => update({ type: t.value })}
              className={['flex-1 py-1.5 text-xs flex items-center justify-center gap-1.5 transition-colors capitalize',
                (hotspot.type ?? 'navigation') === t.value ? 'bg-nm-accent text-white' : 'text-nm-muted hover:text-nm-text',
              ].join(' ')}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Navigation: Link to Scene */}
      {(hotspot.type ?? 'navigation') === 'navigation' && (
        <>
          <Field label="Link to Scene">
            {otherScenes.length === 0 ? (
              <div className="px-3 py-2.5 rounded-xl text-[11px] text-nm-muted text-center"
                style={{ boxShadow: 'inset 3px 3px 7px var(--sh-d-in), inset -2px -2px 5px var(--sh-l-in)' }}>
                Upload more scenes to enable navigation links.
              </div>
            ) : (
              <>
                {hotspot.targetSceneId ? (
                  /* Linked scene card */
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ boxShadow: '4px 4px 10px var(--sh-d), -2px -2px 6px var(--sh-l)' }}
                  >
                    {(() => {
                      const linked = otherScenes.find(s => s.id === hotspot.targetSceneId);
                      return (
                        <>
                          {linked?.thumbnail ? (
                            <img src={linked.thumbnail} alt={linked?.name} className="w-full object-cover" style={{ height: 64 }} />
                          ) : (
                            <div className="w-full flex items-center justify-center text-2xl"
                              style={{ height: 64, background: 'var(--nm-surface, #2a2a36)' }}>🌐</div>
                          )}
                          <div className="flex items-center justify-between px-3 py-2"
                            style={{ background: 'var(--nm-surface, #2a2a36)' }}>
                            <div>
                              <p className="text-xs text-nm-text font-medium truncate max-w-[140px]">{linked?.name ?? 'Unknown'}</p>
                              <p className="text-[10px] text-nm-accent">Linked ✓</p>
                            </div>
                            <button
                              onClick={() => setPickerOpen(true)}
                              className="text-[11px] text-nm-muted hover:text-nm-text px-2 py-1 rounded-lg transition-colors"
                              style={{ boxShadow: '2px 2px 5px var(--sh-d), -1px -1px 3px var(--sh-l)' }}
                            >
                              Change
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  /* No link yet */
                  <button
                    onClick={() => setPickerOpen(true)}
                    className="w-full py-3 rounded-xl text-sm text-nm-muted hover:text-nm-text transition-all flex items-center justify-center gap-2"
                    style={{ boxShadow: '4px 4px 10px var(--sh-d), -2px -2px 6px var(--sh-l)' }}
                  >
                    <span className="text-lg">🔗</span>
                    Select destination scene
                  </button>
                )}
              </>
            )}
          </Field>

          {pickerOpen && (
            <ScenePicker
              scenes={scenes}
              currentSceneId={sceneId}
              linkedSceneId={hotspot.targetSceneId}
              onSelect={(id) => update({ targetSceneId: id })}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </>
      )}

      {/* Variants: Design Variants picker */}
      {(hotspot.type ?? 'navigation') === 'variants' && (
        <Field label="Design Variants">
          <p className="text-[10px] text-nm-muted mb-2 leading-snug">
            Add scenes that show the same space with different design options. The view angle is preserved when switching.
          </p>
          {/* List current variants */}
          {(hotspot.variantSceneIds ?? []).length > 0 && (
            <div className="space-y-1 mb-2">
              {(hotspot.variantSceneIds ?? []).map(sid => {
                const s = scenes.find(sc => sc.id === sid);
                const isCurrent = sid === sceneId;
                return (
                  <div key={sid} className="flex items-center gap-2 px-2 py-1.5 bg-nm-base rounded-lg border border-nm-border">
                    {s?.thumbnail
                      ? <img src={s.thumbnail} className="w-8 h-5 object-cover rounded flex-shrink-0" />
                      : <div className="w-8 h-5 bg-nm-surface rounded flex-shrink-0" />
                    }
                    <span className="flex-1 text-xs text-nm-text truncate">{s?.name ?? sid}{isCurrent ? ' (this scene)' : ''}</span>
                    {!isCurrent && (
                      <button onClick={() => update({ variantSceneIds: (hotspot.variantSceneIds ?? []).filter(id => id !== sid) })}
                        className="text-nm-muted hover:text-red-400 p-0.5 transition-colors">
                        <X size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* Add variant button */}
          <button onClick={() => setVariantPickerOpen(true)}
            className="w-full py-2 rounded-xl text-xs text-nm-muted hover:text-nm-accent border border-nm-border hover:border-nm-accent/40 transition-colors flex items-center justify-center gap-1.5">
            <Plus size={11} /> Add variant scene
          </button>
          {/* Sync button */}
          {(hotspot.variantSceneIds ?? []).length > 1 && (
            <button onClick={() => syncVariantHotspot(sceneId, hotspot.id)}
              className="mt-2 w-full py-2 rounded-xl text-xs font-medium text-nm-teal border border-nm-teal/30 hover:bg-nm-teal/10 transition-colors flex items-center justify-center gap-1.5">
              <RefreshCw size={11} /> Sync hotspot position to all variants
            </button>
          )}
        </Field>
      )}

      {variantPickerOpen && (
        <ScenePicker
          scenes={scenes}
          currentSceneId={sceneId}
          linkedSceneId={undefined}
          onSelect={(id) => {
            const existing = hotspot.variantSceneIds ?? [];
            if (!existing.includes(sceneId)) {
              // auto-include current scene
              update({ variantSceneIds: [...new Set([sceneId, ...existing, id])] });
            } else {
              update({ variantSceneIds: [...new Set([...existing, id])] });
            }
            setVariantPickerOpen(false);
          }}
          onClose={() => setVariantPickerOpen(false)}
        />
      )}

      {/* Info card fields */}
      {hotspot.type === 'info' && (
        <>
          <Field label="Info Title">
            <input
              type="text"
              value={hotspot.infoTitle ?? ''}
              placeholder="e.g. Living Room"
              onChange={e => update({ infoTitle: e.target.value })}
              className="input-base"
            />
          </Field>

          <Field label="Info Body">
            <textarea
              value={hotspot.infoBody ?? ''}
              placeholder="Describe this location…"
              rows={4}
              onChange={e => update({ infoBody: e.target.value })}
              className="input-base resize-none"
            />
          </Field>

          <Field label="Icon Style">
            <div className="flex gap-2 flex-wrap">
              {([
                { value: 'info',    icon: <Info size={13} />,          label: 'Info'    },
                { value: 'star',    icon: <Star size={13} />,          label: 'Star'    },
                { value: 'warning', icon: <AlertTriangle size={13} />, label: 'Warning' },
                { value: 'check',   icon: <Check size={13} />,         label: 'Check'   },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update({ infoIcon: opt.value })}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all',
                    (hotspot.infoIcon ?? 'info') === opt.value
                      ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                      : 'bg-nm-surface border-nm-border text-nm-muted hover:text-white hover:border-nm-border',
                  ].join(' ')}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
        </>
      )}

      {/* Label override */}
      <Field label="Custom Tooltip Label">
        <input
          type="text"
          value={hotspot.label}
          placeholder="Leave blank to show scene name"
          onChange={e => update({ label: e.target.value })}
          className="input-base"
        />
        <p className="text-[10px] text-nm-muted mt-1">Overrides the linked scene name on hover.</p>
      </Field>

      {/* Icon style */}
      <Field label="Icon Style">
        <div className="flex gap-2 flex-wrap">
          {ICON_STYLES.map(style => (
            <button
              key={style}
              onClick={() => update({ iconStyle: style })}
              className={[
                'px-3 py-1.5 rounded-lg text-xs border capitalize transition-all',
                hotspot.iconStyle === style
                  ? 'bg-nm-accent/20 border-nm-accent/50 text-nm-accent'
                  : 'bg-nm-surface border-nm-border text-nm-muted hover:text-white hover:border-nm-border',
              ].join(' ')}
            >
              {style}
            </button>
          ))}
        </div>
      </Field>

      {/* Position */}
      <Field label="Position in Scene">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-nm-muted mb-1">Yaw (°)</p>
            <input
              type="number" step="1"
              value={Math.round(hotspot.yaw * 180 / Math.PI)}
              onChange={e => update({ yaw: Number(e.target.value) * Math.PI / 180 })}
              className="input-base"
            />
          </div>
          <div>
            <p className="text-[10px] text-nm-muted mb-1">Pitch (°)</p>
            <input
              type="number" step="1" min="-85" max="85"
              value={Math.round(hotspot.pitch * 180 / Math.PI)}
              onChange={e => update({ pitch: Number(e.target.value) * Math.PI / 180 })}
              className="input-base"
            />
          </div>
        </div>
      </Field>

      {/* Reposition hint */}
      <div className="px-3 py-2 rounded-xl text-[10px] text-nm-muted leading-snug"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--nm-border)' }}>
        <span className="font-medium text-nm-text">Reposition:</span> drag the hotspot directly in the viewer, or edit the Yaw/Pitch values above.
      </div>

      {/* Delete */}
      <div className="pt-2 border-t border-nm-border">
        <button
          onClick={() => removeHotspot(sceneId, hotspot.id)}
          className="flex items-center gap-2 text-xs text-red-400/70 hover:text-red-400 transition-colors"
        >
          <Trash2 size={13} />
          Remove Hotspot
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
