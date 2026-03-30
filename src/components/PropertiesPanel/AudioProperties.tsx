import React, { useRef, useState } from 'react';
import { Trash2, Plus, Play, Pause, Volume2, VolumeX, Music, MapPin } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import type { AudioSource, AudioType } from '../../types';

interface AudioPropertiesProps {
  sceneId: string;
}

export default function AudioProperties({ sceneId }: AudioPropertiesProps) {
  const { scenes, addAudioSource } = useTourStore();
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-sphera-muted uppercase tracking-wide font-medium">Audio Sources</p>
        <button
          onClick={() => addAudioSource(sceneId)}
          className="flex items-center gap-1 text-xs text-sphera-accent hover:text-sphera-accent-hover transition-colors"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {scene.audioSources.length === 0 ? (
        <div className="text-center py-8">
          <Music size={28} className="text-sphera-border mx-auto mb-2" />
          <p className="text-xs text-sphera-muted">No audio sources yet.</p>
          <p className="text-[11px] text-sphera-border mt-1 leading-snug">
            Add ambient sounds or spatial audio anchored to points in the scene.
          </p>
          <button
            onClick={() => addAudioSource(sceneId)}
            className="mt-3 px-3 py-1.5 text-xs bg-sphera-accent/20 text-sphera-accent border border-sphera-accent/30 rounded-lg hover:bg-sphera-accent/30 transition-colors"
          >
            Add Audio Source
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {scene.audioSources.map(audio => (
            <AudioSourceCard key={audio.id} sceneId={sceneId} audio={audio} />
          ))}
        </div>
      )}

      <div className="border-t border-sphera-border pt-3">
        <p className="text-[10px] text-sphera-border leading-snug">
          <strong className="text-sphera-muted">Ambient</strong> audio plays globally throughout the scene.
          <br />
          <strong className="text-sphera-muted">Spatial</strong> audio is anchored to a point — volume changes based on viewer direction.
        </p>
      </div>
    </div>
  );
}

function AudioSourceCard({ sceneId, audio }: { sceneId: string; audio: AudioSource }) {
  const { updateAudioSource, removeAudioSource } = useTourStore();
  const update = (u: Partial<AudioSource>) => updateAudioSource(sceneId, audio.id, u);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    if (!audio.src) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audio.src);
      audioRef.current.loop = audio.loop;
      audioRef.current.volume = audio.volume;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(console.warn);
    }
  };

  return (
    <div className="bg-sphera-bg border border-sphera-border rounded-xl p-3 space-y-3">
      {/* Label + type toggle */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={audio.label}
          onChange={e => update({ label: e.target.value })}
          className="flex-1 input-base text-xs py-1"
          placeholder="Label"
        />
        <div className="flex border border-sphera-border rounded-lg overflow-hidden flex-shrink-0">
          {(['ambient', 'spatial'] as AudioType[]).map(t => (
            <button
              key={t}
              onClick={() => update({ type: t })}
              className={[
                'px-2 py-1 text-[10px] capitalize transition-colors',
                audio.type === t
                  ? 'bg-sphera-accent text-white'
                  : 'text-sphera-muted hover:text-white',
              ].join(' ')}
            >
              {t === 'ambient' ? <Volume2 size={11} /> : <MapPin size={11} />}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-sphera-muted">
        {audio.type === 'ambient' ? 'Ambient — plays globally' : 'Spatial — volume follows viewer direction'}
      </div>

      {/* Source URL */}
      <input
        type="url"
        value={audio.src}
        placeholder="Audio URL (.mp3, .wav, .ogg)"
        onChange={e => update({ src: e.target.value })}
        className="input-base text-xs"
      />

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Play preview */}
        <button
          onClick={togglePlay}
          disabled={!audio.src}
          className="flex items-center gap-1 text-xs text-sphera-muted hover:text-white disabled:opacity-40 transition-colors"
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
          {playing ? 'Stop' : 'Preview'}
        </button>

        {/* Loop */}
        <label className="flex items-center gap-1.5 text-xs text-sphera-muted cursor-pointer">
          <input
            type="checkbox"
            checked={audio.loop}
            onChange={e => update({ loop: e.target.checked })}
            className="w-3 h-3 rounded accent-sphera-accent"
          />
          Loop
        </label>

        <div className="flex-1" />

        {/* Mute icon */}
        {audio.volume === 0 ? <VolumeX size={12} className="text-sphera-muted" /> : <Volume2 size={12} className="text-sphera-muted" />}
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-sphera-muted w-10">Volume</span>
        <input
          type="range" min={0} max={1} step={0.01}
          value={audio.volume}
          onChange={e => { update({ volume: Number(e.target.value) }); if (audioRef.current) audioRef.current.volume = Number(e.target.value); }}
          className="flex-1"
        />
        <span className="text-[10px] text-sphera-muted w-8 text-right">{Math.round(audio.volume * 100)}%</span>
      </div>

      {/* Spatial position (only for spatial type) */}
      {audio.type === 'spatial' && (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-sphera-border">
          <div>
            <p className="text-[10px] text-sphera-muted mb-1">Yaw (°)</p>
            <input
              type="number" step="5"
              value={Math.round((audio.yaw ?? 0) * 180 / Math.PI)}
              onChange={e => update({ yaw: Number(e.target.value) * Math.PI / 180 })}
              className="input-base text-xs"
            />
          </div>
          <div>
            <p className="text-[10px] text-sphera-muted mb-1">Pitch (°)</p>
            <input
              type="number" step="5" min="-85" max="85"
              value={Math.round((audio.pitch ?? 0) * 180 / Math.PI)}
              onChange={e => update({ pitch: Number(e.target.value) * Math.PI / 180 })}
              className="input-base text-xs"
            />
          </div>
        </div>
      )}

      {/* Delete */}
      <button
        onClick={() => removeAudioSource(sceneId, audio.id)}
        className="flex items-center gap-1.5 text-[11px] text-red-400/60 hover:text-red-400 transition-colors"
      >
        <Trash2 size={11} />
        Remove
      </button>
    </div>
  );
}
