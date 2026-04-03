import React, { useRef, useState } from 'react';
import { Trash2, Plus, Play, Pause, Volume2, VolumeX, MapPin, ChevronDown, ChevronUp, Library } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import type { AudioSource, AudioType } from '../../types';

/* ─── Built-in ambient sound library ──────────────────────────────────── */
const SOUND_LIBRARY = [
  {
    category: 'Water',
    sounds: [
      { name: 'Water Stream',          url: 'https://www.orangefreesounds.com/wp-content/uploads/2014/09/Water-stream-sound.mp3' },
      { name: 'Forest Stream',         url: 'https://www.orangefreesounds.com/wp-content/uploads/2015/02/Forest-stream-running-water-sound.mp3' },
      { name: 'Mountain Stream',       url: 'https://www.orangefreesounds.com/wp-content/uploads/2016/11/Mountain-stream.mp3' },
      { name: 'Birds + Stream',        url: 'https://www.orangefreesounds.com/wp-content/uploads/2018/04/Bird-singing-and-forest-stream-ambient.mp3' },
    ],
  },
  {
    category: 'Crowd & Café',
    sounds: [
      { name: 'Coffee Shop',           url: 'https://www.orangefreesounds.com/wp-content/uploads/2020/02/Coffee-shop-background-noise.mp3' },
      { name: 'People Talking',        url: 'https://www.orangefreesounds.com/wp-content/uploads/2014/10/People-talking-.mp3' },
      { name: 'Crowd Noise',           url: 'https://www.orangefreesounds.com/wp-content/uploads/2015/01/Crowd-noise-sound-effect.mp3' },
    ],
  },
  {
    category: 'Traffic & City',
    sounds: [
      { name: 'City Traffic',          url: 'https://www.orangefreesounds.com/wp-content/uploads/2020/12/Traffic-sound-effect.mp3' },
      { name: 'Street Traffic',        url: 'https://www.orangefreesounds.com/wp-content/uploads/2017/07/Traffic-noise-sound-effect.mp3' },
      { name: 'Rainy Traffic',         url: 'https://orangefreesounds.com/wp-content/uploads/2024/09/Rainy-traffic-sound.mp3' },
    ],
  },
  {
    category: 'Melody & Music',
    sounds: [
      { name: 'Relaxing Piano',        url: 'https://www.orangefreesounds.com/wp-content/uploads/2016/05/Piano-music-relax-music-for-stress-relief.mp3' },
      { name: 'Instrumental Piano',    url: 'https://orangefreesounds.com/wp-content/uploads/2024/06/Relaxing-instrumental-piano-music.mp3' },
      { name: 'Piano + Water',         url: 'https://orangefreesounds.com/wp-content/uploads/2023/03/Relaxing-piano-music-water-sounds.mp3' },
    ],
  },
  {
    category: 'Birds & Nature',
    sounds: [
      { name: 'Birds in Forest',       url: 'https://www.orangefreesounds.com/wp-content/uploads/2017/04/Birds-chirping-in-the-forest.mp3' },
      { name: 'Morning Birds',         url: 'https://www.orangefreesounds.com/wp-content/uploads/2015/04/Birds-chirping-sound-morning-bird-sounds.mp3' },
      { name: 'Forest Birds Spring',   url: 'https://www.orangefreesounds.com/wp-content/uploads/2018/01/Forest-birds-ambience-early-spring.mp3' },
    ],
  },
  {
    category: 'Office & Ambience',
    sounds: [
      { name: 'Office Ambience',       url: 'https://www.orangefreesounds.com/wp-content/uploads/2015/12/Office-noise.mp3' },
      { name: 'Office + Keyboard',     url: 'https://orangefreesounds.com/wp-content/uploads/2023/02/Office-ambience-sound-effect.mp3' },
      { name: 'White Noise / AC',      url: 'https://www.orangefreesounds.com/wp-content/uploads/2019/02/Factory-air-conditioner-white-noise.mp3' },
    ],
  },
] as const;

/* ─── Sound Library Picker ─────────────────────────────────────────────── */
function SoundLibrary({ onSelect, onClose }: { onSelect: (url: string, name: string) => void; onClose: () => void }) {
  const [openCat, setOpenCat] = useState<string | null>(SOUND_LIBRARY[0].category);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState('');

  const stopPreview = () => {
    if (previewRef.current) { previewRef.current.pause(); previewRef.current = null; }
    setPreviewing('');
  };

  const togglePreview = (url: string) => {
    if (previewing === url) { stopPreview(); return; }
    stopPreview();
    const a = new Audio(url);
    a.volume = 0.5;
    a.play().catch(() => {});
    previewRef.current = a;
    setPreviewing(url);
    a.onended = () => setPreviewing('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) { stopPreview(); onClose(); } }}>
      <div className="w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-nm-lg overflow-hidden"
        style={{ background: 'var(--nm-base)', boxShadow: '12px 12px 28px rgba(0,0,0,.7), -6px -6px 18px rgba(255,255,255,.04)', maxHeight: '80vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-nm-border">
          <div className="flex items-center gap-2">
            <Library size={14} className="text-nm-accent" />
            <span className="font-syne font-semibold text-nm-text text-sm">Sound Library</span>
          </div>
          <button onClick={() => { stopPreview(); onClose(); }} className="text-nm-muted hover:text-nm-text text-xs">Close</button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 48px)' }}>
          {SOUND_LIBRARY.map(cat => (
            <div key={cat.category} className="border-b border-nm-border last:border-0">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                onClick={() => setOpenCat(openCat === cat.category ? null : cat.category)}
              >
                <span className="text-xs font-semibold text-nm-text">{cat.category}</span>
                {openCat === cat.category ? <ChevronUp size={12} className="text-nm-muted" /> : <ChevronDown size={12} className="text-nm-muted" />}
              </button>
              {openCat === cat.category && (
                <div className="pb-1">
                  {cat.sounds.map(s => (
                    <div key={s.url} className="flex items-center gap-2 px-4 py-1.5 hover:bg-white/5 group">
                      <button
                        onClick={() => togglePreview(s.url)}
                        className="w-6 h-6 flex items-center justify-center rounded-full text-nm-muted hover:text-nm-accent transition-colors flex-shrink-0"
                        title={previewing === s.url ? 'Stop' : 'Preview'}
                      >
                        {previewing === s.url ? <Pause size={10} /> : <Play size={10} />}
                      </button>
                      <span className="flex-1 text-xs text-nm-text truncate">{s.name}</span>
                      <button
                        onClick={() => { stopPreview(); onSelect(s.url, s.name); onClose(); }}
                        className="text-[10px] text-nm-accent opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded border border-nm-accent/40 hover:bg-nm-accent/20"
                      >
                        Use
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <p className="text-[9px] text-nm-border text-center py-3 px-4">
            Sounds from orangefreesounds.com · Free for personal &amp; commercial use
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── AudioProperties ──────────────────────────────────────────────────── */
interface AudioPropertiesProps { sceneId: string }

export default function AudioProperties({ sceneId }: AudioPropertiesProps) {
  const { scenes, addAudioSource } = useTourStore();
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-nm-muted uppercase tracking-wide font-medium">Audio Sources</p>
        <button
          onClick={() => addAudioSource(sceneId)}
          className="flex items-center gap-1 text-xs text-nm-accent hover:text-nm-accent-hover transition-colors"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {scene.audioSources.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-nm-muted">No audio sources yet.</p>
          <p className="text-[11px] text-nm-border mt-1 leading-snug mb-3">
            Add ambient sounds or spatial audio anchored to points in the scene.
          </p>
          <button
            onClick={() => addAudioSource(sceneId)}
            className="px-3 py-1.5 text-xs bg-nm-accent/20 text-nm-accent border border-nm-accent/30 rounded-lg hover:bg-nm-accent/30 transition-colors"
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

      <div className="border-t border-nm-border pt-3">
        <p className="text-[10px] text-nm-border leading-snug">
          <strong className="text-nm-muted">Ambient</strong> audio plays globally throughout the scene.
          <br />
          <strong className="text-nm-muted">Spatial</strong> audio is anchored to a point — volume changes based on viewer direction.
        </p>
      </div>
    </div>
  );
}

/* ─── AudioSourceCard ──────────────────────────────────────────────────── */
function AudioSourceCard({ sceneId, audio }: { sceneId: string; audio: AudioSource }) {
  const { updateAudioSource, removeAudioSource } = useTourStore();
  const update = (u: Partial<AudioSource>) => updateAudioSource(sceneId, audio.id, u);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

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

  const selectFromLibrary = (url: string, name: string) => {
    // Stop any current playback
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlaying(false); }
    update({ src: url, label: name });
  };

  return (
    <div className="bg-nm-base border border-nm-border rounded-xl p-3 space-y-3">
      {/* Label + type toggle */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={audio.label}
          onChange={e => update({ label: e.target.value })}
          className="flex-1 input-base text-xs py-1"
          placeholder="Label"
        />
        <div className="flex border border-nm-border rounded-lg overflow-hidden flex-shrink-0">
          {(['ambient', 'spatial'] as AudioType[]).map(t => (
            <button
              key={t}
              onClick={() => update({ type: t })}
              className={[
                'px-2 py-1 text-[10px] capitalize transition-colors',
                audio.type === t ? 'bg-nm-accent text-white' : 'text-nm-muted hover:text-white',
              ].join(' ')}
              title={t === 'ambient' ? 'Ambient — plays globally' : 'Spatial — volume follows viewer direction'}
            >
              {t === 'ambient' ? <Volume2 size={11} /> : <MapPin size={11} />}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-nm-muted">
        {audio.type === 'ambient' ? 'Ambient — plays globally' : 'Spatial — volume follows viewer direction'}
      </div>

      {/* Source URL + Library button */}
      <div className="flex gap-1.5">
        <input
          type="url"
          value={audio.src}
          placeholder="Audio URL (.mp3, .wav, .ogg)"
          onChange={e => update({ src: e.target.value })}
          className="input-base text-xs flex-1"
        />
        <button
          onClick={() => setShowLibrary(true)}
          className="flex-shrink-0 px-2 py-1.5 rounded-lg text-xs text-nm-muted hover:text-nm-accent border border-nm-border hover:border-nm-accent/40 transition-colors"
          title="Browse sound library"
        >
          <Library size={12} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!audio.src}
          className="flex items-center gap-1 text-xs text-nm-muted hover:text-white disabled:opacity-40 transition-colors"
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
          {playing ? 'Stop' : 'Preview'}
        </button>

        <label className="flex items-center gap-1.5 text-xs text-nm-muted cursor-pointer">
          <input
            type="checkbox"
            checked={audio.loop}
            onChange={e => update({ loop: e.target.checked })}
            className="w-3 h-3 rounded accent-nm-accent"
          />
          Loop
        </label>

        <div className="flex-1" />
        {audio.volume === 0 ? <VolumeX size={12} className="text-nm-muted" /> : <Volume2 size={12} className="text-nm-muted" />}
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-nm-muted w-10">Volume</span>
        <input
          type="range" min={0} max={1} step={0.01}
          value={audio.volume}
          onChange={e => {
            update({ volume: Number(e.target.value) });
            if (audioRef.current) audioRef.current.volume = Number(e.target.value);
          }}
          className="flex-1"
        />
        <span className="text-[10px] text-nm-muted w-8 text-right">{Math.round(audio.volume * 100)}%</span>
      </div>

      {/* Spatial position */}
      {audio.type === 'spatial' && (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-nm-border">
          <div>
            <p className="text-[10px] text-nm-muted mb-1">Yaw (°)</p>
            <input
              type="number" step="5"
              value={Math.round((audio.yaw ?? 0) * 180 / Math.PI)}
              onChange={e => update({ yaw: Number(e.target.value) * Math.PI / 180 })}
              className="input-base text-xs"
            />
          </div>
          <div>
            <p className="text-[10px] text-nm-muted mb-1">Pitch (°)</p>
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

      {showLibrary && (
        <SoundLibrary
          onSelect={selectFromLibrary}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}
