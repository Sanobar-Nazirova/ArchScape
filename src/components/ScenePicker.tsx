import React from 'react';
import { X } from 'lucide-react';
import type { Scene } from '../types';

interface ScenePickerProps {
  scenes: Scene[];
  currentSceneId: string;
  linkedSceneId?: string;
  onSelect: (sceneId: string) => void;
  onClose: () => void;
}

export default function ScenePicker({
  scenes, currentSceneId, linkedSceneId, onSelect, onClose,
}: ScenePickerProps) {
  const options = scenes.filter(s => s.id !== currentSceneId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 rounded-2xl p-6 w-[540px] max-w-[92vw] max-h-[80vh] flex flex-col"
        style={{
          background: 'var(--nm-base)',
          boxShadow: '20px 20px 40px var(--sh-d), -10px -10px 24px var(--sh-l)',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div>
            <h3 className="text-nm-text font-semibold text-base">Link to Scene</h3>
            <p className="text-nm-muted text-xs mt-0.5">Pick a destination for this hotspot</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-nm-muted hover:text-nm-text transition-colors"
            style={{ boxShadow: '3px 3px 7px var(--sh-d), -2px -2px 5px var(--sh-l)' }}
          >
            <X size={14} />
          </button>
        </div>

        {options.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="text-4xl opacity-40">🌐</span>
            <p className="text-nm-muted text-sm text-center">
              Upload more scenes to create navigation links.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-1">
            {options.map(s => {
              const linked = s.id === linkedSceneId;
              return (
                <button
                  key={s.id}
                  onClick={() => { onSelect(s.id); onClose(); }}
                  className="rounded-xl overflow-hidden text-left transition-all focus:outline-none"
                  style={{
                    border: linked ? '2px solid var(--nm-accent)' : '2px solid transparent',
                    boxShadow: linked
                      ? '0 0 12px rgba(224,123,63,0.3), 4px 4px 10px var(--sh-d)'
                      : '4px 4px 12px var(--sh-d), -2px -2px 6px var(--sh-l)',
                  }}
                >
                  {/* Thumbnail */}
                  {s.thumbnail ? (
                    <img
                      src={s.thumbnail}
                      alt={s.name}
                      className="w-full object-cover"
                      style={{ height: 76 }}
                    />
                  ) : (
                    <div
                      className="w-full flex items-center justify-center text-3xl"
                      style={{
                        height: 76,
                        background: 'var(--nm-surface, #2a2a36)',
                      }}
                    >
                      🌐
                    </div>
                  )}
                  {/* Label */}
                  <div
                    className="px-2.5 py-2"
                    style={{ background: 'var(--nm-surface, #2a2a36)' }}
                  >
                    <p className="text-xs text-nm-text font-medium truncate leading-tight">{s.name}</p>
                    {linked ? (
                      <p className="text-[10px] text-nm-accent mt-0.5">Linked ✓</p>
                    ) : (
                      <p className="text-[10px] text-nm-muted mt-0.5 opacity-60">Click to link</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
