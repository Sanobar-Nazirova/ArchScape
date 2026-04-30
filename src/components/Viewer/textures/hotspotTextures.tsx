import React from 'react';
import * as THREE from 'three';
import {
  ArrowRight, DoorOpen, Circle, ArrowUpRight, LogOut,
} from 'lucide-react';
import type { HotspotIconStyle } from '../../../types';

export const HOTSPOT_ICONS: Record<HotspotIconStyle, React.ReactNode> = {
  arrow:  <ArrowRight    size={14} />,
  door:   <DoorOpen      size={14} />,
  circle: <Circle        size={14} />,
  stairs: <ArrowUpRight  size={14} />,
  exit:   <LogOut        size={14} />,
};

/** Pill-shaped label sprite texture showing the hotspot target name. */
export function makeHotspotLabelTexture(text: string): THREE.CanvasTexture {
  const W = 384, H = 72;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const r = H / 2;
  // Dark pill background
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(W - r, 0);
  ctx.arc(W - r, r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(r, H);
  ctx.arc(r, r, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
  // Thin accent border
  ctx.strokeStyle = '#e07b3f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r, 2); ctx.lineTo(W - r, 2);
  ctx.arc(W - r, r, r - 2, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(r, H - 2);
  ctx.arc(r, r, r - 2, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.stroke();
  // White text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, H / 2, W - r * 2 - 8);
  return new THREE.CanvasTexture(c);
}

/** Renders the same hotspot icon used in the 2D overlay onto a canvas, returns a Three.js CanvasTexture. */
export function makeHotspotCanvasTexture(iconStyle: HotspotIconStyle): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const cx = S / 2, cy = S / 2, r = S / 2 - 3;

  // Dark circle background
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  // Orange border (matches --nm-accent #e07b3f)
  ctx.strokeStyle = '#e07b3f'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.stroke();

  // Icon path (lucide 24×24 viewBox scaled to canvas)
  const scale = S / 24;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#e07b3f'; ctx.lineWidth = 5 / scale;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = '#e07b3f';

  switch (iconStyle) {
    case 'arrow': // ArrowRight
      ctx.beginPath(); ctx.moveTo(5,12); ctx.lineTo(19,12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12,5); ctx.lineTo(19,12); ctx.lineTo(12,19); ctx.stroke();
      break;
    case 'door': // DoorOpen — simplified door silhouette
      ctx.beginPath();
      ctx.moveTo(13,4); ctx.lineTo(7,5.5); ctx.lineTo(7,20); ctx.lineTo(13,20); ctx.lineTo(13,4);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(10.5, 12, 1.2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2,20); ctx.lineTo(22,20); ctx.stroke();
      break;
    case 'circle': // Circle
      ctx.beginPath(); ctx.arc(12,12,7,0,Math.PI*2); ctx.stroke();
      break;
    case 'stairs': // ArrowUpRight
      ctx.beginPath(); ctx.moveTo(7,7); ctx.lineTo(17,7); ctx.lineTo(17,17); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7,17); ctx.lineTo(17,7); ctx.stroke();
      break;
    case 'exit': // LogOut
      ctx.beginPath(); ctx.moveTo(9,21); ctx.lineTo(5,21); ctx.lineTo(5,3); ctx.lineTo(9,3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(16,17); ctx.lineTo(21,12); ctx.lineTo(16,7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(21,12); ctx.lineTo(9,12); ctx.stroke();
      break;
  }
  ctx.restore();
  return new THREE.CanvasTexture(c);
}
