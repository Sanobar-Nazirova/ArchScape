import React from 'react';
import { Layers } from 'lucide-react';
import { HOTSPOT_ICONS } from '../textures/hotspotTextures';
import type { Hotspot, Scene } from '../../../types';

export function HotspotMarker({
  hotspot, isSelected, isPreview, targetSceneName, isHovered,
}: {
  hotspot: Hotspot;
  isSelected: boolean;
  isPreview: boolean;
  targetSceneName?: string;
  isHovered?: boolean;
}) {
  const tooltip = targetSceneName || hotspot.label;
  const showLabel = isSelected || isHovered;
  return (
    <div className="flex flex-col items-center select-none" style={{ cursor: isPreview ? 'pointer' : 'grab', gap: 0 }}>
      {tooltip && (
        <span className={[
          'text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm border whitespace-nowrap font-medium mb-1 transition-opacity',
          showLabel
            ? 'bg-black/80 text-white border-white/30 opacity-100'
            : 'opacity-0 pointer-events-none',
        ].join(' ')}>
          {tooltip}
        </span>
      )}
      <div className={[
        'w-10 h-10 rounded-full flex items-center justify-center transition-all',
        'border-2 shadow-lg backdrop-blur-sm',
        isSelected
          ? 'bg-nm-accent border-white text-white scale-110 shadow-nm-accent/40'
          : isPreview
          ? 'bg-black/60 border-white/70 text-white hotspot-pulse'
          : 'bg-black/50 border-nm-accent/70 text-nm-accent hotspot-pulse',
        isHovered && !isSelected ? 'scale-110 bg-nm-accent border-white text-white' : '',
      ].join(' ')}>
        {HOTSPOT_ICONS[hotspot.iconStyle]}
      </div>
    </div>
  );
}

/* ─── VariantHotspotMarker ────────────────────────────────────────────── */
export function VariantHotspotMarker({ hotspot, isSelected, isPreview, isOpen, currentSceneId: _currentSceneId, scenes: _scenes }: {
  hotspot: Hotspot; isSelected: boolean; isPreview: boolean;
  isOpen: boolean; currentSceneId: string; scenes: Scene[];
}) {
  const label = hotspot.label || 'Design Options';
  return (
    <div className="flex flex-col items-center gap-1 group select-none" style={{ cursor: isPreview ? 'pointer' : 'grab' }}>
      <div className={[
        'w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 shadow-lg backdrop-blur-sm',
        isSelected || isOpen
          ? 'bg-nm-teal border-white text-white scale-110'
          : isPreview
          ? 'bg-black/60 border-nm-teal/70 text-nm-teal hover:scale-110 hover:bg-nm-teal hover:border-white'
          : 'bg-black/50 border-nm-teal/70 text-nm-teal hover:scale-110 hover:bg-nm-teal hover:text-white',
      ].join(' ')}>
        <Layers size={16} />
      </div>
      <span className={[
        'text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm border whitespace-nowrap font-medium',
        isSelected || isOpen
          ? 'bg-nm-teal text-white border-white/30 opacity-100'
          : 'bg-black/75 text-white border-white/20 opacity-0 group-hover:opacity-100 transition-opacity',
      ].join(' ')}>
        {label}
      </span>
    </div>
  );
}
