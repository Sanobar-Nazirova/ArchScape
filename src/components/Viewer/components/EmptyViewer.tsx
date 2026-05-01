import React from 'react';
import { Upload } from 'lucide-react';
import { triggerUpload } from '../../../utils/uploadTrigger';

/* ─── Empty state ─────────────────────────────────────────────────────── */
export function EmptyViewer() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center select-none px-8">
      {/* Globe icon */}
      <div
        className="w-24 h-24 rounded-nm flex items-center justify-center"
        style={{ boxShadow: '8px 8px 18px var(--sh-d), -5px -5px 12px var(--sh-l)' }}
      >
        <svg viewBox="0 0 80 80" className="w-14 h-14 text-nm-accent opacity-60" fill="none">
          <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="2.5" />
          <ellipse cx="40" cy="40" rx="30" ry="14" stroke="currentColor" strokeWidth="2.5" />
          <line x1="40" y1="10" x2="40" y2="70" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      </div>

      <div className="space-y-2">
        <p className="font-syne font-semibold text-lg text-nm-text">Add Your First Scene</p>
        <p className="text-nm-muted text-sm max-w-xs leading-relaxed">
          Upload panoramic images or 360° videos to start building your virtual tour.
        </p>
      </div>

      {/* Upload CTA */}
      <button
        onClick={triggerUpload}
        className="flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white rounded-nm-sm transition-all hover:scale-[1.03] active:scale-[0.97]"
        style={{ background: 'var(--nm-accent)', boxShadow: '5px 5px 14px rgba(224,123,63,.4), -2px -2px 6px rgba(255,255,255,.06)' }}
      >
        <Upload size={15} />
        Upload Panoramas
      </button>

      <div className="grid grid-cols-3 gap-3 text-center w-full max-w-sm">
        {[
          { label: 'Equirectangular', sub: 'JPG · PNG · WEBP', icon: '🌐' },
          { label: '360° Video',      sub: 'MP4 · WEBM · MOV', icon: '🎬' },
          { label: 'Fisheye',         sub: 'Auto-detected',    icon: '👁' },
        ].map(({ label, sub, icon }) => (
          <div
            key={label}
            className="rounded-nm-sm p-3"
            style={{ boxShadow: 'inset 3px 3px 7px var(--sh-d-in), inset -2px -2px 5px var(--sh-l-in)' }}
          >
            <div className="text-2xl mb-1">{icon}</div>
            <p className="text-xs text-nm-text font-medium leading-tight">{label}</p>
            <p className="text-[10px] text-nm-muted mt-0.5">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
