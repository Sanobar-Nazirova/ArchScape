/**
 * Generates a mock equirectangular panorama via an HTML canvas gradient.
 * Returns a data URL (JPEG).
 */

const PALETTES: Array<{ sky: string[]; ground: string[]; horizon: string }> = [
  { sky: ['#0a1628', '#1a3a6b', '#3b7abd'], ground: ['#4a4030', '#2a2416', '#1a160c'], horizon: '#5a7090' },
  { sky: ['#1a0a2e', '#4a1a6b', '#9b59b6'], ground: ['#3a2a1a', '#1a1208', '#0a0804'], horizon: '#8060a0' },
  { sky: ['#0a2a1a', '#1a5a3a', '#2d8a5a'], ground: ['#2a3a20', '#161e10', '#0c1008'], horizon: '#3a7050' },
  { sky: ['#2a1a0a', '#8b4513', '#ff8c00'], ground: ['#4a3828', '#2a1e14', '#1a120c'], horizon: '#d4852a' },
  { sky: ['#0a1420', '#1a2840', '#243660'], ground: ['#3a4a5a', '#1e2a34', '#0c1420'], horizon: '#4a7080' },
  { sky: ['#200a0a', '#601a1a', '#c0403a'], ground: ['#3a2020', '#1a1010', '#0a0808'], horizon: '#904030' },
];

export function generateMockPanorama(
  seed = 0,
  width = 2048,
  height = 1024,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const palette = PALETTES[seed % PALETTES.length];

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.62);
  skyGrad.addColorStop(0, palette.sky[0]);
  skyGrad.addColorStop(0.5, palette.sky[1]);
  skyGrad.addColorStop(1, palette.sky[2]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height * 0.62);

  // Ground gradient
  const groundGrad = ctx.createLinearGradient(0, height * 0.62, 0, height);
  groundGrad.addColorStop(0, palette.ground[0]);
  groundGrad.addColorStop(0.5, palette.ground[1]);
  groundGrad.addColorStop(1, palette.ground[2]);
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, height * 0.62, width, height * 0.38);

  // Horizon glow
  const horizonGrad = ctx.createLinearGradient(0, height * 0.55, 0, height * 0.72);
  horizonGrad.addColorStop(0, 'transparent');
  horizonGrad.addColorStop(0.5, palette.horizon + '55');
  horizonGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = horizonGrad;
  ctx.fillRect(0, height * 0.55, width, height * 0.17);

  // Architectural silhouettes
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  const rng = (n: number) => Math.abs(Math.sin(seed * 7 + n) * 0.5 + 0.5);

  const buildingCount = 6 + (seed % 4);
  for (let i = 0; i < buildingCount; i++) {
    const bx = rng(i * 3) * width;
    const bw = 40 + rng(i * 3 + 1) * 140;
    const bh = 60 + rng(i * 3 + 2) * 200;
    const by = height * 0.62 - bh;
    ctx.fillRect(bx, by, bw, bh);

    // Windows
    ctx.fillStyle = 'rgba(255,220,100,0.25)';
    const wrows = Math.floor(bh / 22);
    const wcols = Math.floor(bw / 18);
    for (let wr = 0; wr < wrows; wr++) {
      for (let wc = 0; wc < wcols; wc++) {
        if (rng(i * 100 + wr * 10 + wc) > 0.5) {
          ctx.fillRect(bx + wc * 18 + 4, by + wr * 22 + 5, 10, 14);
        }
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
  }

  // Stars (for dark skies)
  if (seed % 2 === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let s = 0; s < 120; s++) {
      const sx = rng(s * 2 + 500) * width;
      const sy = rng(s * 2 + 501) * height * 0.5;
      const sr = rng(s + 502) * 1.5 + 0.3;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

/** Generate a small thumbnail from a full panorama data URL */
export function generateThumbnail(imageUrl: string, width = 160, height = 80): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve('');
    img.src = imageUrl;
  });
}
