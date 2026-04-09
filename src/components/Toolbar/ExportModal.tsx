import React, { useState } from 'react';
import { X, Download, AlertTriangle, FileCode2, Image } from 'lucide-react';
import type { Scene } from '../../types';
import { exportTourAsHTML, estimateSceneSizeBytes } from '../../utils/exportTour';
import type { ExportStore, ExportProgress } from '../../utils/exportTour';

interface ExportModalProps {
  store: ExportStore;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return 'unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ExportModal({ store, onClose }: ExportModalProps) {
  const [includeImages, setIncludeImages] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  const scenes = store.scenes;

  const totalEstimatedBytes = includeImages
    ? scenes.reduce((acc, sc) => acc + estimateSceneSizeBytes(sc), 0)
    : 0;

  const isLarge = totalEstimatedBytes > 50 * 1024 * 1024;

  const handleExport = async () => {
    setExporting(true);
    setProgress(null);
    try {
      await exportTourAsHTML(store, includeImages, (p) => setProgress(p));
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div
        className="bg-nm-base border border-nm-border rounded-2xl p-6 w-[520px] max-w-[95vw] shadow-2xl"
        style={{ boxShadow: '10px 10px 28px rgba(0,0,0,.7), -4px -4px 16px rgba(255,255,255,.05)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileCode2 size={18} className="text-nm-accent" />
            <h3 className="text-white font-semibold text-base">Export as Self-Contained HTML</h3>
          </div>
          <button
            onClick={onClose}
            disabled={exporting}
            className="text-nm-muted hover:text-white p-1 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Warning */}
        <div className="bg-nm-surface border border-nm-border rounded-xl px-4 py-3 mb-5 text-sm text-nm-muted leading-relaxed">
          <p className="mb-1">
            The exported <code className="text-nm-text text-xs bg-black/30 px-1 py-0.5 rounded">.html</code> file
            is completely self-contained — no server required. Open it in any modern browser.
          </p>
          <p>Panorama images are embedded as base64, which can make the file large.</p>
        </div>

        {/* Export quality choice */}
        <p className="text-[11px] text-nm-muted uppercase tracking-wide mb-2">Image quality</p>
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => setIncludeImages(true)}
            className={[
              'flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-all',
              includeImages
                ? 'border-nm-accent text-white bg-nm-accent/10'
                : 'border-nm-border text-nm-muted hover:border-nm-accent/50',
            ].join(' ')}
          >
            <Image size={16} />
            Full quality
            <span className="text-[10px] font-normal text-nm-muted">Images embedded as base64</span>
          </button>

          <button
            onClick={() => setIncludeImages(false)}
            className={[
              'flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-all',
              !includeImages
                ? 'border-nm-accent text-white bg-nm-accent/10'
                : 'border-nm-border text-nm-muted hover:border-nm-accent/50',
            ].join(' ')}
          >
            <FileCode2 size={16} />
            Data only
            <span className="text-[10px] font-normal text-nm-muted">Tour structure, no images</span>
          </button>
        </div>

        {/* Scene list */}
        <p className="text-[11px] text-nm-muted uppercase tracking-wide mb-2">
          Scenes ({scenes.length})
        </p>
        <div className="space-y-1.5 mb-5 max-h-40 overflow-y-auto pr-1">
          {scenes.map((sc) => {
            const bytes = includeImages ? estimateSceneSizeBytes(sc) : 0;
            return (
              <div
                key={sc.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-nm-surface border border-nm-border text-sm"
              >
                <span className="text-nm-text truncate mr-3">{sc.name}</span>
                <span className="text-nm-muted text-xs flex-shrink-0">{formatBytes(bytes)}</span>
              </div>
            );
          })}
          {scenes.length === 0 && (
            <p className="text-nm-muted text-sm text-center py-3">No scenes added yet</p>
          )}
        </div>

        {/* Total size */}
        {includeImages && scenes.length > 0 && (
          <div
            className={[
              'flex items-center gap-2 px-4 py-2.5 rounded-xl border mb-5 text-sm',
              isLarge
                ? 'border-yellow-700/50 bg-yellow-900/20 text-yellow-300'
                : 'border-nm-border bg-nm-surface text-nm-muted',
            ].join(' ')}
          >
            {isLarge && <AlertTriangle size={14} className="flex-shrink-0" />}
            <span>
              Estimated total:{' '}
              <strong className={isLarge ? 'text-yellow-200' : 'text-nm-text'}>
                {formatBytes(totalEstimatedBytes)}
              </strong>
              {isLarge && ' — file may be large'}
            </span>
          </div>
        )}

        {/* Progress indicator */}
        {exporting && progress && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-nm-muted mb-1.5">
              <span>Converting: {progress.sceneName}</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-nm-surface overflow-hidden">
              <div
                className="h-full bg-nm-accent rounded-full transition-all duration-200"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={exporting}
            className="flex-1 py-2.5 text-sm text-nm-muted hover:text-white border border-nm-border rounded-xl transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || scenes.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'var(--nm-accent)', boxShadow: '3px 3px 10px rgba(224,123,63,.4)' }}
          >
            {exporting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <Download size={14} />
                Export HTML
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
