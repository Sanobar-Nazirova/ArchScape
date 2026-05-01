import { useEffect } from 'react';
import type React from 'react';
import type { Scene } from '../../../types';

export function useSceneAudio(
  scene: Scene | null | undefined,
  audioElemsRef: React.MutableRefObject<HTMLAudioElement[]>,
  audioGainsRef: React.MutableRefObject<GainNode[]>,
): void {
  // ── Scene audio playback ──────────────────────────────────────────────
  useEffect(() => {
    const sources = scene?.audioSources ?? [];
    if (sources.length === 0) return;

    // Browser autoplay policy: audio only works after a user gesture.
    // We attempt play() and silently ignore NotAllowedError.
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const nodes: { source: AudioBufferSourceNode | null; gain: GainNode; panner?: PannerNode }[] = [];
    const htmlEls: HTMLAudioElement[] = [];
    audioElemsRef.current = htmlEls;
    audioGainsRef.current = [];

    // Use Web Audio API for spatial, HTMLAudioElement for ambient (simpler + loopable)
    for (const as of sources) {
      if (as.type === 'spatial' && as.yaw !== undefined && as.pitch !== undefined) {
        // Spatial: positional audio via PannerNode
        const gain   = audioCtx.createGain();
        gain.gain.value = as.volume ?? 1;
        (gain as any)._baseVol = gain.gain.value;
        audioGainsRef.current.push(gain);
        const panner = audioCtx.createPanner();
        panner.panningModel   = 'HRTF';
        panner.distanceModel  = 'inverse';
        panner.refDistance    = 1;
        panner.maxDistance    = 10000;
        panner.rolloffFactor  = 1;
        // Convert yaw/pitch to 3D position (unit sphere)
        const y = (as.yaw  ?? 0) * (Math.PI / 180);
        const p = (as.pitch ?? 0) * (Math.PI / 180);
        panner.positionX.value = Math.sin(y) * Math.cos(p);
        panner.positionY.value = Math.sin(p);
        panner.positionZ.value = -Math.cos(y) * Math.cos(p);
        panner.connect(gain);
        gain.connect(audioCtx.destination);

        fetch(as.src)
          .then(r => r.arrayBuffer())
          .then(buf => audioCtx.decodeAudioData(buf))
          .then(decoded => {
            const src = audioCtx.createBufferSource();
            src.buffer = decoded;
            src.loop   = as.loop ?? false;
            src.connect(panner);
            src.start(0);
            nodes.push({ source: src, gain, panner });
          })
          .catch(console.warn);
        nodes.push({ source: null, gain, panner });
      } else {
        // Ambient: simple HTMLAudioElement
        const el = new Audio(as.src);
        el.volume = Math.min(1, Math.max(0, as.volume ?? 1));
        el.loop   = as.loop ?? false;
        el.play().catch(() => {
          // Retry on next user interaction
          const resume = () => { el.play().catch(console.warn); document.removeEventListener('pointerdown', resume); };
          document.addEventListener('pointerdown', resume, { once: true });
        });
        htmlEls.push(el);
      }
    }

    return () => {
      audioElemsRef.current = [];
      audioGainsRef.current = [];
      htmlEls.forEach(el => { el.pause(); el.src = ''; });
      nodes.forEach(n => { try { n.source?.stop(); } catch {} });
      audioCtx.close().catch(console.warn);
    };
  }, [scene?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
