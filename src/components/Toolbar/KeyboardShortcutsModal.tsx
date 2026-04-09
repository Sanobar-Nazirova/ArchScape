import React from 'react';
import { X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS: { key: string; description: string }[] = [
  { key: 'H',          description: 'Place hotspot tool' },
  { key: 'M',          description: 'Place media point tool' },
  { key: 'Esc',        description: 'Cancel active tool / close panel' },
  { key: '←',         description: 'Previous scene' },
  { key: '→',         description: 'Next scene' },
  { key: 'Space',      description: 'Toggle preview mode' },
  { key: '?',          description: 'Open keyboard shortcuts' },
  { key: 'Scroll',     description: 'Zoom in / out' },
  { key: 'Click + Drag', description: 'Pan / look around' },
];

function KeyBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center justify-center px-2 py-1 text-xs font-mono font-medium rounded-lg border border-nm-border text-nm-text flex-shrink-0"
      style={{
        background: 'var(--nm-surface)',
        boxShadow: '2px 2px 5px var(--sh-d), -1px -1px 3px var(--sh-l)',
        minWidth: '2rem',
      }}
    >
      {label}
    </span>
  );
}

export default function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="bg-nm-base border border-nm-border rounded-2xl p-6 w-[460px] max-w-[95vw] shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-nm-text font-semibold text-base">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="text-nm-muted hover:text-nm-text transition-colors p-1 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts grid */}
        <div
          className="rounded-xl overflow-hidden border border-nm-border"
          style={{ boxShadow: 'inset 2px 2px 6px rgba(0,0,0,.4)' }}
        >
          {SHORTCUTS.map((s, i) => (
            <div
              key={s.key}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]"
              style={
                i < SHORTCUTS.length - 1
                  ? { borderBottom: '1px solid var(--nm-border)' }
                  : {}
              }
            >
              <div className="w-32 flex justify-end flex-shrink-0">
                <KeyBadge label={s.key} />
              </div>
              <p className="text-sm text-nm-muted">{s.description}</p>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <p className="text-[11px] text-nm-muted text-center mt-4">
          Press <KeyBadge label="?" /> anywhere in the editor to re-open this panel.
        </p>
      </div>
    </div>
  );
}
