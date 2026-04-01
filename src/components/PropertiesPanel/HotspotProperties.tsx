import React from 'react';
import { Trash2 } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import type { Hotspot, HotspotIconStyle } from '../../types';

const ICON_STYLES: HotspotIconStyle[] = ['arrow', 'door', 'circle', 'stairs', 'exit'];

interface HotspotPropertiesProps {
  sceneId: string;
  hotspot: Hotspot;
}

export default function HotspotProperties({ sceneId, hotspot }: HotspotPropertiesProps) {
  const { scenes, updateHotspot, removeHotspot } = useTourStore();
  const update = (updates: Partial<Hotspot>) => updateHotspot(sceneId, hotspot.id, updates);

  const otherScenes = scenes.filter(s => s.id !== sceneId);

  return (
    <div className="space-y-5">
      {/* Destination */}
      <Field label="Destination Scene">
        {otherScenes.length === 0 ? (
          <p className="text-xs text-nm-muted italic">Add more scenes to create navigation.</p>
        ) : (
          <select
            value={hotspot.targetSceneId}
            onChange={e => update({ targetSceneId: e.target.value })}
            className="input-base"
          >
            <option value="">— Select destination —</option>
            {otherScenes.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </Field>

      {/* Label */}
      <Field label="Hotspot Label">
        <input
          type="text"
          value={hotspot.label}
          placeholder="e.g. Enter Kitchen"
          onChange={e => update({ label: e.target.value })}
          className="input-base"
        />
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
