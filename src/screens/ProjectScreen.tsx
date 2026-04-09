import React, { useEffect, useRef, useState } from 'react';
import {
  Plus, ChevronLeft, Play, Trash2, X, Copy, Share2,
  Edit2, Lock, Globe, Headset, HelpCircle, Check, Camera,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useTourStore } from '../store/useTourStore';
import { generateThumbnail } from '../utils/panoramaGenerator';
import ThemeToggle from '../components/ThemeToggle';
import HelpModal from '../components/HelpModal';
import type { Tour } from '../types';

/* ─── New Tour Modal ────────────────────────────────────────────────────── */
function NewTourModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { addTour, openTour } = useTourStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = addTour(projectId, trimmed, desc.trim() || undefined);
    openTour(projectId, id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-[420px] max-w-[95vw] rounded-nm-lg p-7"
        style={{ background: 'var(--nm-base)', boxShadow: '10px 10px 24px rgba(0,0,0,.65), -6px -6px 16px rgba(255,255,255,.05)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-syne text-xl font-bold text-nm-text">New Tour</h2>
          <button onClick={onClose} className="text-nm-muted hover:text-nm-text transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-nm-muted mb-2">Tour Name</label>
            <input
              autoFocus value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
              placeholder="Lobby Walkthrough"
              className="w-full bg-transparent rounded-nm-sm px-4 py-3 text-sm text-nm-text outline-none placeholder:text-nm-muted"
              style={{ boxShadow: 'inset 4px 4px 10px rgba(0,0,0,.6), inset -3px -3px 8px rgba(255,255,255,.04)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-nm-muted mb-2">Description (optional)</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="What does this tour cover?"
              rows={2}
              className="w-full bg-transparent rounded-nm-sm px-4 py-3 text-sm text-nm-text outline-none placeholder:text-nm-muted resize-none"
              style={{ boxShadow: 'inset 4px 4px 10px rgba(0,0,0,.6), inset -3px -3px 8px rgba(255,255,255,.04)' }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 text-sm text-nm-muted hover:text-nm-text rounded-nm-sm transition-all"
            style={{ boxShadow: '4px 4px 10px rgba(0,0,0,.5), -2px -2px 7px rgba(255,255,255,.04)' }}>
            Cancel
          </button>
          <button onClick={create} disabled={!name.trim()}
            className="flex-1 py-3 text-sm font-semibold text-white rounded-nm-sm transition-all disabled:opacity-40"
            style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 12px rgba(224,123,63,.35), -2px -2px 6px rgba(255,255,255,.05)' }}>
            Create Tour
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit Tour Modal ───────────────────────────────────────────────────── */
function EditTourModal({ tour, projectId, onClose }: { tour: Tour; projectId: string; onClose: () => void }) {
  const { updateTour } = useTourStore();
  const [name, setName] = useState(tour.name);
  const [desc, setDesc] = useState(tour.desc ?? '');

  const save = () => {
    if (!name.trim()) return;
    updateTour(projectId, tour.id, { name: name.trim(), desc: desc.trim() || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] max-w-[95vw] rounded-nm-lg p-7"
        style={{ background: 'var(--nm-base)', boxShadow: '10px 10px 24px rgba(0,0,0,.65), -6px -6px 16px rgba(255,255,255,.05)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-syne text-xl font-bold text-nm-text">Edit Tour</h2>
          <button onClick={onClose} className="text-nm-muted hover:text-nm-text transition-colors p-1"><X size={18} /></button>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-nm-muted mb-2">Tour Name</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              className="w-full bg-transparent rounded-nm-sm px-4 py-3 text-sm text-nm-text outline-none"
              style={{ boxShadow: 'inset 4px 4px 10px rgba(0,0,0,.6), inset -3px -3px 8px rgba(255,255,255,.04)' }} />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-nm-muted mb-2">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="What does this tour cover?"
              className="w-full bg-transparent rounded-nm-sm px-4 py-3 text-sm text-nm-text outline-none placeholder:text-nm-muted resize-none"
              style={{ boxShadow: 'inset 4px 4px 10px rgba(0,0,0,.6), inset -3px -3px 8px rgba(255,255,255,.04)' }} />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm text-nm-muted hover:text-nm-text rounded-nm-sm transition-all"
            style={{ boxShadow: '4px 4px 10px rgba(0,0,0,.5), -2px -2px 7px rgba(255,255,255,.04)' }}>Cancel</button>
          <button onClick={save} disabled={!name.trim()} className="flex-1 py-3 text-sm font-semibold text-white rounded-nm-sm transition-all disabled:opacity-40"
            style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 12px rgba(224,123,63,.35)' }}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Password Modal ────────────────────────────────────────────────────── */
function PasswordModal({ tour, projectId, onClose }: { tour: Tour; projectId: string; onClose: () => void }) {
  const { updateTour } = useTourStore();
  const [pw, setPw] = useState(tour.password ?? '');

  const save = () => {
    updateTour(projectId, tour.id, { password: pw.trim() || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[380px] max-w-[95vw] rounded-nm-lg p-7"
        style={{ background: 'var(--nm-base)', boxShadow: '10px 10px 24px rgba(0,0,0,.65), -6px -6px 16px rgba(255,255,255,.05)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-syne text-xl font-bold text-nm-text">Password Protect</h2>
          <button onClick={onClose} className="text-nm-muted hover:text-nm-text p-1"><X size={18} /></button>
        </div>
        <p className="text-xs text-nm-muted mb-4">Set a password visitors must enter before viewing this tour. Leave blank to remove protection.</p>
        <input
          autoFocus type="password" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="Enter password…"
          className="w-full bg-transparent rounded-nm-sm px-4 py-3 text-sm text-nm-text outline-none placeholder:text-nm-muted mb-6"
          style={{ boxShadow: 'inset 4px 4px 10px rgba(0,0,0,.6), inset -3px -3px 8px rgba(255,255,255,.04)' }}
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm text-nm-muted hover:text-nm-text rounded-nm-sm"
            style={{ boxShadow: '4px 4px 10px rgba(0,0,0,.5), -2px -2px 7px rgba(255,255,255,.04)' }}>Cancel</button>
          <button onClick={save} className="flex-1 py-3 text-sm font-semibold text-white rounded-nm-sm"
            style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 12px rgba(224,123,63,.35)' }}>
            {pw.trim() ? 'Set Password' : 'Remove Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Share Modal ───────────────────────────────────────────────────────── */
function ShareModal({ tour, projectId, onClose }: { tour: Tour; projectId: string; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}${window.location.pathname}?project=${projectId}&tour=${tour.id}&mode=present`;

  useEffect(() => {
    QRCode.toDataURL(shareUrl, { width: 200, margin: 2, color: { dark: '#e0ddd8', light: '#1e1e26' } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [shareUrl]);

  const copy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] max-w-[95vw] rounded-nm-lg p-7"
        style={{ background: 'var(--nm-base)', boxShadow: '10px 10px 24px rgba(0,0,0,.65), -6px -6px 16px rgba(255,255,255,.05)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-syne text-xl font-bold text-nm-text">Share Tour</h2>
          <button onClick={onClose} className="text-nm-muted hover:text-nm-text p-1"><X size={18} /></button>
        </div>

        <p className="text-xs text-nm-muted mb-4">
          Share this presentation link with your audience. They'll open the tour in presentation mode directly.
        </p>

        {/* URL copy */}
        <div className="flex gap-2 mb-5">
          <div className="flex-1 rounded-nm-sm px-3 py-2.5 text-xs text-nm-muted font-mono truncate"
            style={{ boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.6), inset -2px -2px 5px rgba(255,255,255,.03)' }}>
            {shareUrl}
          </div>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-nm-sm transition-all text-nm-muted hover:text-nm-text"
            style={{ boxShadow: '3px 3px 8px rgba(0,0,0,.5), -2px -2px 5px rgba(255,255,255,.04)' }}
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="flex flex-col items-center gap-2 mb-5">
            <p className="text-[11px] uppercase tracking-widest text-nm-muted">Scan with phone</p>
            <div className="rounded-nm-sm p-3" style={{ boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.5), inset -2px -2px 5px rgba(255,255,255,.03)' }}>
              <img src={qrDataUrl} alt="QR Code" className="w-44 h-44" />
            </div>
          </div>
        )}

        <p className="text-[10px] text-nm-muted text-center">
          Tour data is stored locally. Recipients need access to this browser's data or an exported copy.
        </p>
      </div>
    </div>
  );
}

/* ─── Tour Card ─────────────────────────────────────────────────────────── */
type TourModal = 'edit' | 'share' | 'password' | null;

function TourCard({ tour, projectId }: { tour: Tour; projectId: string }) {
  const { openTour, deleteTour, duplicateTour, togglePreviewMode, updateTour } = useTourStore();
  const [modal, setModal] = useState<TourModal>(null);
  const [hovered, setHovered] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const handleThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      // Compress to ~480×270 before storing to avoid localStorage quota issues
      const compressed = await generateThumbnail(dataUrl, 480, 270);
      updateTour(projectId, tour.id, { thumbUrl: compressed || dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sceneCount = tour.scenes?.length ?? 0;
  const updated = tour.updated
    ? new Date(tour.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : new Date(tour.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const openInWeb = (e: React.MouseEvent) => {
    e.stopPropagation();
    openTour(projectId, tour.id);
    // Switch to preview mode after a short tick to let the editor mount
    setTimeout(() => togglePreviewMode(), 100);
  };

  const openInVR = (e: React.MouseEvent) => {
    e.stopPropagation();
    openTour(projectId, tour.id);
    setTimeout(() => {
      togglePreviewMode();
      document.documentElement.requestFullscreen?.().catch(() => {});
    }, 100);
  };

  return (
    <>
      <div
        className="group rounded-nm transition-all hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
        style={{ background: 'var(--nm-base)', boxShadow: '6px 6px 14px rgba(0,0,0,.6), -4px -4px 10px rgba(255,255,255,.04)' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => openTour(projectId, tour.id)}
      >
        {/* Thumbnail */}
        <div className="relative w-full h-28 overflow-hidden"
          style={{ boxShadow: 'inset 0 -4px 10px rgba(0,0,0,.4)' }}>
          {tour.thumbUrl ? (
            <img src={tour.thumbUrl} alt={tour.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(80,80,120,.3) 0%, rgba(40,40,80,.5) 100%)' }}>
              <Play size={28} className="text-nm-accent opacity-40" />
            </div>
          )}

          {/* Hover overlay: View options + thumbnail upload */}
          {hovered && (
            <div
              className="absolute inset-0 flex items-center justify-center gap-3 bg-black/70 backdrop-blur-sm"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={openInWeb}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                title="View in web (presentation mode)"
              >
                <Globe size={18} />
                <span className="text-[10px] font-medium">View Web</span>
              </button>
              <div className="w-px h-10 bg-white/20" />
              <button
                onClick={openInVR}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                title="View in VR (fullscreen)"
              >
                <Headset size={18} />
                <span className="text-[10px] font-medium">View VR</span>
              </button>

              {/* Thumbnail upload — bottom-right corner */}
              <button
                onClick={() => thumbInputRef.current?.click()}
                className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-white/70 hover:text-white hover:bg-black/80 transition-colors text-[10px]"
                title="Set thumbnail image"
              >
                <Camera size={11} />
                Set Thumbnail
              </button>
            </div>
          )}

          {/* Hidden thumbnail file input */}
          <input
            ref={thumbInputRef} type="file" accept="image/*" className="hidden"
            onChange={handleThumbUpload}
          />

          {/* Password badge */}
          {tour.password && (
            <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1" title="Password protected">
              <Lock size={10} className="text-nm-accent" />
            </div>
          )}
        </div>

        {/* Info + actions */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-syne font-semibold text-nm-text truncate mb-0.5">{tour.name}</h3>
              {tour.desc && <p className="text-xs text-nm-muted truncate mb-1">{tour.desc}</p>}
              <p className="text-[11px] text-nm-muted">
                {sceneCount} scene{sceneCount !== 1 ? 's' : ''} · {updated}
              </p>
            </div>

            {/* Action buttons (always visible on hover via group) */}
            <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <ActionBtn icon={<Edit2 size={12} />} title="Edit name & description" onClick={() => setModal('edit')} />
              <ActionBtn icon={<Share2 size={12} />} title="Share" onClick={() => setModal('share')} />
              <ActionBtn icon={<Copy size={12} />} title="Duplicate tour" onClick={() => duplicateTour(projectId, tour.id)} />
              <ActionBtn icon={<Lock size={12} />} title="Password protect" onClick={() => setModal('password')} />
              <ActionBtn
                icon={<Trash2 size={12} />} title="Delete tour" danger
                onClick={() => { if (confirm(`Delete "${tour.name}"?`)) deleteTour(projectId, tour.id); }}
              />
            </div>
          </div>
        </div>
      </div>

      {modal === 'edit'     && <EditTourModal tour={tour} projectId={projectId} onClose={() => setModal(null)} />}
      {modal === 'share'    && <ShareModal tour={tour} projectId={projectId} onClose={() => setModal(null)} />}
      {modal === 'password' && <PasswordModal tour={tour} projectId={projectId} onClose={() => setModal(null)} />}
    </>
  );
}

function ActionBtn({ icon, title, onClick, danger }: {
  icon: React.ReactNode; title: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick} title={title}
      className={`p-1.5 rounded-lg transition-colors ${danger ? 'text-nm-muted hover:text-nm-danger' : 'text-nm-muted hover:text-nm-accent'}`}
    >
      {icon}
    </button>
  );
}

/* ─── ProjectScreen ─────────────────────────────────────────────────────── */
export default function ProjectScreen() {
  const { projects, currentProjectId, goBack } = useTourStore();
  const [showModal, setShowModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const project = currentProjectId ? projects[currentProjectId] : null;
  if (!project) { goBack(); return null; }

  const tourList = Object.values(project.tours ?? {}).sort((a, b) => b.created - a.created);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col" style={{ background: 'var(--nm-base)' }}>
      {/* Nav */}
      <header className="flex-shrink-0 flex items-center justify-between px-8 h-16"
        style={{ boxShadow: '0 4px 14px var(--sh-d)' }}>
        <div className="flex items-center gap-4">
          <button onClick={goBack} className="flex items-center gap-2 text-sm text-nm-muted hover:text-nm-text transition-colors">
            <ChevronLeft size={16} />
            Projects
          </button>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-2.5">
            <img src="/logo-512.png" alt="ArchScape"
              className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
              style={{ boxShadow: '3px 3px 8px rgba(0,0,0,.5), -2px -2px 5px rgba(255,255,255,.08)' }}
            />
            <span className="font-syne font-semibold text-nm-text">{project.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-nm-muted hover:text-nm-text transition-colors rounded-nm-sm"
            style={{ boxShadow: '3px 3px 8px var(--sh-d), -2px -2px 5px var(--sh-l)' }}
          >
            <HelpCircle size={14} />
            Help
          </button>
          <ThemeToggle />
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-nm-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 12px rgba(224,123,63,.35)' }}
          >
            <Plus size={15} />
            New Tour
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="font-syne text-2xl font-bold text-nm-text mb-1">Tours</h1>
            <p className="text-sm text-nm-muted">
              {project.desc ? `${project.desc} · ` : ''}
              {tourList.length} tour{tourList.length !== 1 ? 's' : ''}
            </p>
          </div>

          {tourList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-nm"
              style={{ boxShadow: 'inset 4px 4px 12px rgba(0,0,0,.5), inset -3px -3px 8px rgba(255,255,255,.03)' }}>
              <div className="w-16 h-16 rounded-nm flex items-center justify-center mb-4"
                style={{ boxShadow: '6px 6px 14px rgba(0,0,0,.6), -4px -4px 10px rgba(255,255,255,.04)' }}>
                <Play size={28} className="text-nm-accent opacity-50" />
              </div>
              <h3 className="font-syne font-semibold text-nm-text mb-2">No tours yet</h3>
              <p className="text-sm text-nm-muted mb-5">Create your first virtual tour to start adding panoramic scenes.</p>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-nm-sm"
                style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 12px rgba(224,123,63,.35)' }}>
                <Plus size={14} />
                Create Tour
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tourList.map(tour => (
                <TourCard key={tour.id} tour={tour} projectId={project.id} />
              ))}
              <button onClick={() => setShowModal(true)}
                className="rounded-nm p-5 flex flex-col items-center justify-center gap-3 text-nm-muted hover:text-nm-accent transition-all hover:scale-[1.01] min-h-[180px]"
                style={{ boxShadow: '6px 6px 14px rgba(0,0,0,.5), -4px -4px 10px rgba(255,255,255,.03)', border: '1.5px dashed rgba(224,221,216,0.12)' }}>
                <Plus size={22} />
                <span className="text-sm font-medium font-syne">New Tour</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {showModal && <NewTourModal projectId={project.id} onClose={() => setShowModal(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
