import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Upload, Plus, Image, Music, Map, Eye, Globe,
  X, Layers, MonitorPlay, ChevronLeft, Save,
} from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';
import ThemeToggle from '../ThemeToggle';
import { registerUploadTrigger } from '../../utils/uploadTrigger';
import { detectPanorama } from '../../utils/panoramaDetector';
import { fisheyeToEquirectangular, fileToCanvas } from '../../utils/fisheyeConverter';
import { generateThumbnail } from '../../utils/panoramaGenerator';
import type { PanoramaDetectionResult, FisheyeConfig } from '../../types';

/* ─── FisheyeConversionDialog ─────────────────────────────────────────── */
interface FisheyeDialogProps {
  result: PanoramaDetectionResult;
  file: File;
  onConfirm: (config: FisheyeConfig) => void;
  onSkip: () => void;
  onCancel: () => void;
}

function FisheyeConversionDialog({ result, file, onConfirm, onSkip, onCancel }: FisheyeDialogProps) {
  const [config, setConfig] = useState<FisheyeConfig>(
    result.suggestedFisheyeConfig ?? { type: 'dual-sbs', fov: 180, centerX: 0.25, centerY: 0.5, radius: 0.92 },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-sphera-panel border border-sphera-border rounded-2xl p-6 w-[460px] max-w-[95vw] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Fisheye Image Detected</h3>
          <button onClick={onCancel} className="text-sphera-muted hover:text-white transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        <p className="text-sphera-muted text-sm mb-5 leading-relaxed">
          <span className="text-white font-medium">{file.name}</span>{' '}
          appears to be a fisheye image ({result.width}×{result.height}px, {result.aspectRatio.toFixed(2)}:1 ratio).
          Convert it to equirectangular for 360° viewing?
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[11px] text-sphera-muted uppercase tracking-wide block mb-1.5">Fisheye Type</label>
            <select
              value={config.type}
              onChange={e => setConfig(c => ({ ...c, type: e.target.value as FisheyeConfig['type'] }))}
              className="input-base"
            >
              <option value="dual-sbs">Dual Fisheye — Side by Side (Ricoh Theta, Insta360 ONE)</option>
              <option value="dual-tb">Dual Fisheye — Top / Bottom</option>
              <option value="single">Single Fisheye (front hemisphere only)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-sphera-muted uppercase tracking-wide block mb-1.5">Field of View (°)</label>
              <input
                type="number" min={120} max={240} step={5}
                value={config.fov}
                onChange={e => setConfig(c => ({ ...c, fov: Number(e.target.value) }))}
                className="input-base"
              />
            </div>
            <div>
              <label className="text-[11px] text-sphera-muted uppercase tracking-wide block mb-1.5">Circle Radius (0–1)</label>
              <input
                type="number" min={0.5} max={1} step={0.01}
                value={config.radius}
                onChange={e => setConfig(c => ({ ...c, radius: Number(e.target.value) }))}
                className="input-base"
              />
            </div>
          </div>

          {config.type === 'single' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-sphera-muted block mb-1.5">Center X (0–1)</label>
                <input type="number" min={0} max={1} step={0.01} value={config.centerX}
                  onChange={e => setConfig(c => ({ ...c, centerX: Number(e.target.value) }))}
                  className="input-base" />
              </div>
              <div>
                <label className="text-[11px] text-sphera-muted block mb-1.5">Center Y (0–1)</label>
                <input type="number" min={0} max={1} step={0.01} value={config.centerY}
                  onChange={e => setConfig(c => ({ ...c, centerY: Number(e.target.value) }))}
                  className="input-base" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onSkip}
            className="px-4 py-2 text-sm text-sphera-muted hover:text-white border border-sphera-border rounded-xl transition-colors">
            Import as-is
          </button>
          <button onClick={() => onConfirm(config)}
            className="px-5 py-2 text-sm bg-sphera-accent hover:bg-sphera-accent-hover text-white rounded-xl font-medium transition-colors">
            Convert &amp; Import
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Publish Modal ───────────────────────────────────────────────────── */
function PublishModal() {
  const { publishUrl, showPublishModal, closePublishModal, projectName } = useTourStore();
  const [copied, setCopied] = useState(false);
  if (!showPublishModal || !publishUrl) return null;

  const download = () => {
    const a = document.createElement('a');
    a.href = publishUrl;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-tour.json`;
    a.click();
  };

  const copy = () => {
    navigator.clipboard.writeText(publishUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-sphera-panel border border-sphera-border rounded-2xl p-6 w-[500px] max-w-[95vw] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-sphera-accent" />
            <h3 className="text-white font-semibold">Tour Published</h3>
          </div>
          <button onClick={closePublishModal} className="text-sphera-muted hover:text-white p-1 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="bg-green-900/20 border border-green-700/30 rounded-xl px-4 py-3 mb-4">
          <p className="text-green-400 text-sm font-medium">✓ Tour exported successfully</p>
          <p className="text-green-300/60 text-xs mt-0.5">
            Your tour data is packaged as JSON. Host it alongside the Sphera viewer to share.
          </p>
        </div>

        <div className="bg-sphera-bg border border-sphera-border rounded-xl px-3 py-2.5 mb-5">
          <p className="text-[10px] text-sphera-muted mb-1">Tour data URL (blob)</p>
          <p className="text-[11px] text-sphera-text font-mono break-all line-clamp-2">{publishUrl.slice(0, 80)}…</p>
        </div>

        <div className="flex gap-2">
          <button onClick={copy}
            className="flex-1 py-2.5 text-sm border border-sphera-border rounded-xl text-sphera-text hover:border-sphera-accent hover:text-white transition-colors">
            {copied ? '✓ Copied!' : 'Copy URL'}
          </button>
          <button onClick={download}
            className="flex-1 py-2.5 text-sm bg-sphera-accent hover:bg-sphera-accent-hover text-white rounded-xl font-medium transition-colors">
            Download JSON
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Processing toast ────────────────────────────────────────────────── */
function ProcessingToast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-sphera-surface border border-sphera-border rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3">
      <div className="w-4 h-4 border-2 border-sphera-accent border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-sphera-text">{message}</span>
    </div>
  );
}

/* ─── Toolbar ─────────────────────────────────────────────────────────── */
export default function Toolbar() {
  const {
    scenes, activeTool, setActiveTool, isPreviewMode, togglePreviewMode,
    addScene, publish, projectName, setProjectName, setFloorPlan,
    goBack, saveTour,
  } = useTourStore();

  const panoramaInputRef = useRef<HTMLInputElement>(null);
  const floorPlanInputRef = useRef<HTMLInputElement>(null);

  // Register global upload trigger so EmptyViewer / Sidebar can fire it
  useEffect(() => {
    registerUploadTrigger(() => panoramaInputRef.current?.click());
  }, []);

  // Fisheye dialog state
  const fisheyeResolveRef = useRef<((cfg: FisheyeConfig | null) => void) | null>(null);
  const [fisheyeDialogData, setFisheyeDialogData] = useState<{
    result: PanoramaDetectionResult; file: File;
  } | null>(null);

  const [processingMsg, setProcessingMsg] = useState('');
  const [editingName, setEditingName] = useState(false);

  const waitForFisheyeDialog = useCallback((result: PanoramaDetectionResult, file: File): Promise<FisheyeConfig | null> => {
    return new Promise(resolve => {
      fisheyeResolveRef.current = resolve;
      setFisheyeDialogData({ result, file });
    });
  }, []);

  const handleFisheyeConfirm = useCallback((config: FisheyeConfig) => {
    setFisheyeDialogData(null);
    fisheyeResolveRef.current?.(config);
    fisheyeResolveRef.current = null;
  }, []);

  const handleFisheyeSkip = useCallback(() => {
    setFisheyeDialogData(null);
    fisheyeResolveRef.current?.(null);
    fisheyeResolveRef.current = null;
  }, []);

  const handleFisheyeCancel = useCallback(() => {
    setFisheyeDialogData(null);
    fisheyeResolveRef.current?.(null);
    fisheyeResolveRef.current = null;
  }, []);

  const handlePanoramaFiles = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      setProcessingMsg(`Analysing ${file.name}…`);
      try {
        const detection = await detectPanorama(file);
        let imageUrl: string;
        let finalFormat = detection.format;

        if (detection.needsConversion) {
          const config = await waitForFisheyeDialog(detection, file);
          if (config) {
            setProcessingMsg(`Converting fisheye: ${file.name}…`);
            const canvas = await fileToCanvas(file);
            const converted = fisheyeToEquirectangular(canvas, config);
            imageUrl = converted.toDataURL('image/jpeg', 0.9);
            finalFormat = 'equirectangular-mono';
          } else {
            imageUrl = await fileToDataUrl(file);
          }
        } else {
          imageUrl = await fileToDataUrl(file);
        }

        setProcessingMsg(`Processing ${file.name}…`);
        const thumbnail = await generateThumbnail(imageUrl);
        const sceneName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        addScene(imageUrl, sceneName, finalFormat, detection.mediaType, thumbnail);
      } catch (err) {
        console.error('Failed to process file:', err);
      }
    }
    setProcessingMsg('');
  }, [waitForFisheyeDialog, addScene]);

  const handleFloorPlanFile = useCallback(async (files: FileList) => {
    const file = files[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setFloorPlan(url);
  }, [setFloorPlan]);

  if (isPreviewMode) {
    return (
      <div
        className="flex items-center justify-between px-4 h-12 flex-shrink-0"
        style={{ background: 'var(--nm-base)', boxShadow: '0 4px 10px rgba(0,0,0,.5)' }}
      >
        <div className="flex items-center gap-2">
          <MonitorPlay size={15} className="text-nm-accent" />
          <span className="text-sm text-nm-muted font-medium">Preview Mode</span>
        </div>
        <button
          onClick={togglePreviewMode}
          className="flex items-center gap-2 px-4 py-1.5 text-sm text-nm-text rounded-nm-sm transition-all hover:text-nm-accent"
          style={{ boxShadow: '3px 3px 8px var(--sh-d), -2px -2px 5px var(--sh-l)' }}
        >
          <X size={13} />
          Exit Preview
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex items-center h-14 px-3 gap-1 select-none flex-shrink-0"
        style={{ background: 'var(--nm-base)', boxShadow: '0 4px 14px var(--sh-d)' }}
      >
        {/* Back + Brand */}
        <div className="flex items-center gap-2 mr-3 pr-3" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-nm-muted hover:text-nm-text transition-colors text-xs mr-1"
            title="Back to tours"
          >
            <ChevronLeft size={14} />
          </button>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--nm-accent)', boxShadow: '3px 3px 8px rgba(224,123,63,.4)' }}
          >
            <Layers size={14} className="text-white" />
          </div>
          {editingName ? (
            <input
              autoFocus
              className="text-nm-text text-sm font-bold bg-transparent outline-none w-28"
              style={{ borderBottom: '1px solid var(--nm-accent)' }}
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
            />
          ) : (
            <span
              className="text-nm-text text-sm font-bold cursor-pointer hover:text-nm-accent transition-colors font-syne"
              title="Double-click to rename"
              onDoubleClick={() => setEditingName(true)}
            >
              {projectName}
            </span>
          )}
        </div>

        {/* Upload Panoramas */}
        <ToolBtn
          icon={<Upload size={14} />}
          label="Upload"
          tooltip="Upload equirectangular images or 360° videos (fisheye auto-detected)"
          onClick={() => panoramaInputRef.current?.click()}
        />

        <Divider />

        <ToolBtn
          icon={<Plus size={14} />}
          label="Hotspot"
          tooltip="Click in viewer to place navigation hotspot  [H]"
          active={activeTool === 'hotspot'}
          onClick={() => setActiveTool('hotspot')}
          disabled={scenes.length < 2}
        />
        <ToolBtn
          icon={<Image size={14} />}
          label="Media"
          tooltip="Click in viewer to place media info point  [M]"
          active={activeTool === 'media'}
          onClick={() => setActiveTool('media')}
          disabled={scenes.length === 0}
        />
        <ToolBtn
          icon={<Music size={14} />}
          label="Audio"
          tooltip="Configure ambient or spatial audio for this scene"
          active={activeTool === 'audio'}
          onClick={() => setActiveTool('audio')}
          disabled={scenes.length === 0}
        />

        <Divider />

        <ToolBtn
          icon={<Map size={14} />}
          label="Floor Plan"
          tooltip="Upload a floor plan image and place scene markers"
          onClick={() => floorPlanInputRef.current?.click()}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {scenes.length > 0 && (
          <span className="text-xs text-nm-muted mr-2 hidden md:block">
            {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
          </span>
        )}

        <ThemeToggle />

        <button
          onClick={togglePreviewMode}
          disabled={scenes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-nm-muted hover:text-nm-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-nm-sm"
          style={{ boxShadow: '3px 3px 8px var(--sh-d), -2px -2px 5px var(--sh-l)' }}
        >
          <Eye size={13} />
          Preview
        </button>

        <button
          onClick={() => saveTour()}
          disabled={scenes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-nm-muted hover:text-nm-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-nm-sm ml-1"
          style={{ boxShadow: '3px 3px 8px var(--sh-d), -2px -2px 5px var(--sh-l)' }}
        >
          <Save size={13} />
          Save
        </button>

        <button
          onClick={publish}
          disabled={scenes.length === 0}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white rounded-nm-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all ml-1 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--nm-accent)', boxShadow: '3px 3px 10px rgba(224,123,63,.45)' }}
        >
          <Globe size={13} />
          Publish
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={panoramaInputRef} type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg"
        multiple className="hidden"
        onChange={e => { if (e.target.files) handlePanoramaFiles(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={floorPlanInputRef} type="file"
        accept="image/*" className="hidden"
        onChange={e => { if (e.target.files) handleFloorPlanFile(e.target.files); e.target.value = ''; }}
      />

      {processingMsg && <ProcessingToast message={processingMsg} />}

      {fisheyeDialogData && (
        <FisheyeConversionDialog
          result={fisheyeDialogData.result}
          file={fisheyeDialogData.file}
          onConfirm={handleFisheyeConfirm}
          onSkip={handleFisheyeSkip}
          onCancel={handleFisheyeCancel}
        />
      )}

      <PublishModal />
    </>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function Divider() {
  return <div className="w-px h-6 mx-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />;
}

interface ToolBtnProps {
  icon: React.ReactNode; label: string; tooltip?: string;
  active?: boolean; disabled?: boolean; onClick?: () => void;
}

function ToolBtn({ icon, label, tooltip, active, disabled, onClick }: ToolBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={[
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-nm-sm text-xs font-medium transition-all select-none flex-shrink-0',
        active ? 'text-nm-accent' : 'text-nm-muted hover:text-nm-text',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
      style={active ? {
        boxShadow: 'inset 3px 3px 7px rgba(0,0,0,.55), inset -2px -2px 5px rgba(255,255,255,.04)',
        background: 'rgba(224,123,63,0.12)',
      } : {}}
    >
      {icon}
      <span className="hidden lg:block">{label}</span>
    </button>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
