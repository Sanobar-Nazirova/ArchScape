import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

/* ─── ZoomControls ────────────────────────────────────────────────────── */
export function ZoomControls({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
      <button onClick={onZoomIn} className="w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg text-white hover:text-nm-accent hover:border-nm-accent/40 transition-colors">
        <ZoomIn size={14} />
      </button>
      <button onClick={onZoomOut} className="w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg text-white hover:text-nm-accent hover:border-nm-accent/40 transition-colors">
        <ZoomOut size={14} />
      </button>
    </div>
  );
}
