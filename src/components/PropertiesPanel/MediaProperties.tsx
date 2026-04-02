import React, { useRef } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import type { MediaPoint, MediaPointType } from '../../types';

const MEDIA_TYPES: MediaPointType[] = ['text', 'image', 'video', 'pdf'];

interface MediaPropertiesProps {
  sceneId: string;
  media: MediaPoint;
}

export default function MediaProperties({ sceneId, media }: MediaPropertiesProps) {
  const { updateMediaPoint, removeMediaPoint } = useTourStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (updates: Partial<MediaPoint>) => updateMediaPoint(sceneId, media.id, updates);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ content: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <Field label="Title">
        <input
          type="text"
          value={media.title}
          placeholder="Information point title"
          onChange={e => update({ title: e.target.value })}
          className="input-base"
        />
      </Field>

      {/* Content type */}
      <Field label="Content Type">
        <div className="flex gap-2 flex-wrap">
          {MEDIA_TYPES.map(t => (
            <button
              key={t}
              onClick={() => update({ type: t, content: '' })}
              className={[
                'px-3 py-1.5 rounded-lg text-xs border capitalize transition-all',
                media.type === t
                  ? 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300'
                  : 'bg-nm-surface border-nm-border text-nm-muted hover:text-white',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      {/* Content */}
      <Field label={media.type === 'text' ? 'Text Content' : 'Content Source'}>
        {media.type === 'text' ? (
          <textarea
            rows={6}
            value={media.content}
            placeholder="Enter descriptive text, notes, or information…"
            onChange={e => update({ content: e.target.value })}
            className="input-base resize-none"
          />
        ) : (
          <div className="space-y-2">
            <input
              type="url"
              value={media.content}
              placeholder={`Enter ${media.type} URL…`}
              onChange={e => update({ content: e.target.value })}
              className="input-base"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 w-full justify-center px-3 py-2 border border-dashed border-nm-border rounded-lg text-xs text-nm-muted hover:border-nm-accent hover:text-white transition-colors"
            >
              <Upload size={12} />
              Upload {media.type} file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={mediaAccept(media.type)}
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}
      </Field>

      {/* Preview */}
      {media.content && media.type === 'image' && (
        <Field label="Preview">
          <img src={media.content} alt="" className="w-full rounded-lg border border-nm-border object-cover max-h-32" />
        </Field>
      )}

      {/* Position */}
      <Field label="Position in Scene">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-nm-muted mb-1">Yaw (°)</p>
            <input
              type="number" step="1"
              value={Math.round(media.yaw * 180 / Math.PI)}
              onChange={e => update({ yaw: Number(e.target.value) * Math.PI / 180 })}
              className="input-base"
            />
          </div>
          <div>
            <p className="text-[10px] text-nm-muted mb-1">Pitch (°)</p>
            <input
              type="number" step="1" min="-85" max="85"
              value={Math.round(media.pitch * 180 / Math.PI)}
              onChange={e => update({ pitch: Number(e.target.value) * Math.PI / 180 })}
              className="input-base"
            />
          </div>
        </div>
      </Field>

      <div className="pt-2 border-t border-nm-border">
        <button
          onClick={() => removeMediaPoint(sceneId, media.id)}
          className="flex items-center gap-2 text-xs text-red-400/70 hover:text-red-400 transition-colors"
        >
          <Trash2 size={13} />
          Remove Media Point
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-nm-muted uppercase tracking-wide font-medium mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function mediaAccept(type: MediaPointType): string {
  switch (type) {
    case 'image': return 'image/*';
    case 'video': return 'video/*';
    case 'pdf':   return 'application/pdf';
    default:      return '*/*';
  }
}
