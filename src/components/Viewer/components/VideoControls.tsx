import React, { useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

/* ─── VideoControls ───────────────────────────────────────────────────── */
export function VideoControls({ videoEl }: { videoEl: HTMLVideoElement | null }) {
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  if (!videoEl) return null;

  const toggle = () => {
    if (videoEl.paused) { videoEl.play(); setPlaying(true); }
    else { videoEl.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    videoEl.muted = !videoEl.muted;
    setMuted(videoEl.muted);
  };

  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl px-2 py-1.5">
      <span className="text-[10px] text-white/50 mr-1">360° Video</span>
      <button onClick={toggle} className="text-white hover:text-nm-accent p-1 transition-colors" title={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
      <button onClick={toggleMute} className="text-white hover:text-nm-accent p-1 transition-colors" title={muted ? 'Unmute' : 'Mute'}>
        <Volume2 size={13} className={muted ? 'opacity-40' : ''} />
      </button>
    </div>
  );
}
