import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface EmbedCodeModalProps {
  onClose: () => void;
}

const PRESETS = [
  { label: '800×500', width: '800', height: '500' },
  { label: '100%×600', width: '100%', height: '600' },
  { label: '1280×720', width: '1280', height: '720' },
];

export default function EmbedCodeModal({ onClose }: EmbedCodeModalProps) {
  const url = window.location.href;
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('600');
  const [copied, setCopied] = useState(false);

  const embedCode = `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const applyPreset = (w: string, h: string) => {
    setWidth(w);
    setHeight(h);
  };

  // Compute a visual preview box (capped for display)
  const previewW = width === '100%' ? '100%' : `${Math.min(parseInt(width) / 4, 360)}px`;
  const previewH = `${Math.min(parseInt(height) / 4, 120)}px`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="bg-nm-base border border-nm-border rounded-2xl p-6 w-[520px] max-w-[95vw] shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-nm-text font-semibold text-base">Embed Code</h3>
          <button
            onClick={onClose}
            className="text-nm-muted hover:text-nm-text transition-colors p-1 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        {/* Dimension controls */}
        <div className="mb-4">
          <label className="text-[11px] text-nm-muted uppercase tracking-wide block mb-2">Dimensions</label>
          <div className="flex gap-2 mb-2">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.width, p.height)}
                className={[
                  'px-3 py-1.5 text-xs rounded-lg border transition-colors flex-shrink-0',
                  width === p.width && height === p.height
                    ? 'border-nm-accent text-nm-accent'
                    : 'border-nm-border text-nm-muted hover:text-nm-text hover:border-nm-accent',
                ].join(' ')}
                style={
                  width === p.width && height === p.height
                    ? { background: 'rgba(224,123,63,0.1)' }
                    : {}
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-nm-muted block mb-1">Width</label>
              <input
                type="text"
                value={width}
                onChange={e => setWidth(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-nm-border text-nm-text bg-transparent outline-none focus:border-nm-accent transition-colors"
                style={{ background: 'var(--nm-surface)' }}
                placeholder="e.g. 100% or 800"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-nm-muted block mb-1">Height</label>
              <input
                type="text"
                value={height}
                onChange={e => setHeight(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-nm-border text-nm-text bg-transparent outline-none focus:border-nm-accent transition-colors"
                style={{ background: 'var(--nm-surface)' }}
                placeholder="e.g. 600"
              />
            </div>
          </div>
        </div>

        {/* Dimension preview box */}
        <div className="mb-4">
          <label className="text-[11px] text-nm-muted uppercase tracking-wide block mb-2">Size Preview</label>
          <div
            className="rounded-lg border border-nm-border flex items-center justify-center overflow-hidden"
            style={{ background: 'var(--nm-surface)', padding: '12px', minHeight: '80px' }}
          >
            <div
              className="rounded border border-dashed border-nm-accent flex items-center justify-center"
              style={{
                width: previewW,
                height: previewH,
                background: 'rgba(224,123,63,0.08)',
                minWidth: '60px',
                minHeight: '40px',
              }}
            >
              <span className="text-[10px] text-nm-accent font-mono">
                {width} × {height}
              </span>
            </div>
          </div>
        </div>

        {/* Embed code display */}
        <div className="mb-4">
          <label className="text-[11px] text-nm-muted uppercase tracking-wide block mb-2">Embed Code</label>
          <div
            className="rounded-xl px-3 py-3 border border-nm-border"
            style={{ background: 'var(--nm-surface)', boxShadow: 'inset 2px 2px 6px rgba(0,0,0,.4)' }}
          >
            <pre className="text-xs text-nm-text font-mono whitespace-pre-wrap break-all leading-relaxed">
              {embedCode}
            </pre>
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--nm-accent)', boxShadow: '3px 3px 10px rgba(224,123,63,.45)' }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy Embed Code'}
        </button>
      </div>
    </div>
  );
}
