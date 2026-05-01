import React from 'react';
import {
  Info, Image, Video, FileText, FileArchive,
} from 'lucide-react';
import type { MediaPoint } from '../../../types';

const MEDIA_ICONS: Record<string, React.ReactNode> = {
  image: <Image   size={13} />,
  video: <Video   size={13} />,
  text:  <FileText size={13} />,
  pdf:   <FileArchive size={13} />,
};

export function MediaMarker({ media, isSelected, onClick }: {
  media: MediaPoint; isSelected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group focus:outline-none"
    >
      <div className={[
        'w-8 h-8 rounded-full flex items-center justify-center transition-all',
        'border-2 shadow-lg backdrop-blur-sm media-pulse',
        isSelected
          ? 'bg-yellow-500 border-white text-white scale-110'
          : 'bg-black/50 border-yellow-400/70 text-yellow-400 hover:scale-110 hover:bg-yellow-500 hover:text-white',
      ].join(' ')}
      >
        {MEDIA_ICONS[media.type] ?? <Info size={13} />}
      </div>
      {media.title && (
        <span className="text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm border whitespace-nowrap bg-black/60 text-white border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
          {media.title}
        </span>
      )}
    </button>
  );
}
