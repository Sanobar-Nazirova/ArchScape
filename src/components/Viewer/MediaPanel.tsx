import React from 'react';
import { X, FileText, Image, Video, FileArchive, ExternalLink } from 'lucide-react';
import type { MediaPoint, MediaPointType } from '../../types';

const ICONS: Record<MediaPointType, React.ReactNode> = {
  image:  <Image  size={16} className="text-blue-400" />,
  video:  <Video  size={16} className="text-purple-400" />,
  text:   <FileText size={16} className="text-green-400" />,
  pdf:    <FileArchive size={16} className="text-orange-400" />,
};

interface MediaPanelProps {
  media: MediaPoint;
  onClose: () => void;
}

export default function MediaPanel({ media, onClose }: MediaPanelProps) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 20 }}
    >
      <div className="pointer-events-auto bg-nm-base/95 backdrop-blur-sm border border-nm-border rounded-2xl shadow-2xl w-[480px] max-w-[90vw] max-h-[70vh] overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-nm-border">
          {ICONS[media.type]}
          <span className="flex-1 text-white font-medium text-sm truncate">{media.title || 'Information'}</span>
          <button
            onClick={onClose}
            className="text-nm-muted hover:text-white transition-colors p-1 rounded hover:bg-nm-surface"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {media.type === 'text' && (
            <p className="text-nm-text text-sm leading-relaxed whitespace-pre-wrap">
              {media.content || <span className="text-nm-muted italic">No content</span>}
            </p>
          )}

          {media.type === 'image' && media.content && (
            <img
              src={media.content}
              alt={media.title}
              className="w-full rounded-lg object-contain max-h-[400px]"
            />
          )}

          {media.type === 'video' && media.content && (
            <video
              src={media.content}
              controls
              className="w-full rounded-lg"
            />
          )}

          {media.type === 'pdf' && media.content && (
            <div className="flex flex-col items-center gap-3 py-6">
              <FileArchive size={40} className="text-orange-400" />
              <p className="text-sm text-nm-text">PDF Document</p>
              <a
                href={media.content}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-nm-accent rounded-lg text-white text-sm hover:bg-nm-accent-hover transition-colors"
              >
                <ExternalLink size={14} />
                Open PDF
              </a>
            </div>
          )}

          {!media.content && (
            <p className="text-nm-muted text-sm italic text-center py-6">No content attached yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
