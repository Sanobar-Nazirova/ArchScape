import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import type { Hotspot, HotspotIconStyle } from '../../types';
import ScenePicker from '../ScenePicker';

const ICON_STYLES: HotspotIconStyle[] = ['arrow', 'door', 'circle', 'stairs', 'exit'];

interface HotspotPropertiesProps {
  sceneId: string;
  hotspot: Hotspot;
}

export default function HotspotProperties({ sceneId, hotspot }: HotspotPropertiesProps) {
  const { scenes, updateHotspot, removeHotspot } = useTourStore();
  const update = (updates: Partial<Hotspot>) => updateHotspot(sceneId, hotspot.id, updates);

  const otherScenes = scenes.filter(s => s.id !== sceneId);
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* Destination */}
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
