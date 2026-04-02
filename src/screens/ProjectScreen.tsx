import React, { useState } from 'react';
import { Plus, ChevronLeft, Play, Trash2, X, Layers } from 'lucide-react';
import { useTourStore } from '../store/useTourStore';
import ThemeToggle from '../components/ThemeToggle';
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
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
              placeholder="Lobby Walkthrough"
              className="w-full bg-transparent rounded-nm-sm px-4 py-3 text-sm text-nm-text outline-none placeholder:text-nm-muted"
              style={{ boxShadow: 'inset 4px 4px 10px rgba(0,0,0,.6), inset -3px -3px 8px rgba(255,255,255,.04)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-nm-muted mb-2">Description (optional)</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="What does this tour cover?"
              rows={2}
              className="w-full bg-transparent rounded-nm-sm px-4 py-3 text-sm text-nm-text outline-none placeholder:text-nm-muted resize-none"
              style={{ boxShadow: 'inset 4px 4px 10px rgba(0,0,0,.6), inset -3px -3px 8px rgba(255,255,255,.04)' }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm text-nm-muted hover:text-nm-text rounded-nm-sm transition-all"
            style={{ boxShadow: '4px 4px 10px rgba(0,0,0,.5), -2px -2px 7px rgba(255,255,255,.04)' }}
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={!name.trim()}
            className="flex-1 py-3 text-sm font-semibold text-white rounded-nm-sm transition-all disabled:opacity-40"
            style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 12px rgba(224,123,63,.35), -2px -2px 6px rgba(255,255,255,.05)' }}
          >
            Create Tour
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tour Card ─────────────────────────────────────────────────────────── */
function TourCard({ tour, projectId }: { tour: Tour; projectId: string }) {
  const { openTour, deleteTour } = useTourStore();
  const sceneCount = tour.scenes?.length ?? 0;
  const updated = tour.updated
    ? new Date(tour.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : new Date(tour.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      className="group rounded-nm p-5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{ background: 'var(--nm-base)', boxShadow: '6px 6px 14px rgba(0,0,0,.6), -4px -4px 10px rgba(255,255,255,.04)' }}
      onClick={() => openTour(projectId, tour.id)}
    >
      {/* Thumb */}
      <div
        className="w-full h-28 rounded-nm-sm mb-4 overflow-hidden flex items-center justify-center"
        style={{ boxShadow: 'inset 4px 4px 10px rgba(0,0,0,.6), inset -3px -3px 8px rgba(255,255,255,.04)' }}
      >
        {tour.thumbUrl ? (
          <img src={tour.thumbUrl} alt={tour.name} className="w-full h-full object-cover" />
        ) : (
          <Play size={28} className="text-nm-accent opacity-40" />
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-syne font-semibold text-nm-text truncate mb-0.5">{tour.name}</h3>
          {tour.desc && (
            <p className="text-xs text-nm-muted truncate mb-1.5">{tour.desc}</p>
          )}
          <p className="text-[11px] text-nm-muted">
            {sceneCount} scene{sceneCount !== 1 ? 's' : ''} · {updated}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => {
              e.stopPropagation();
              if (confirm(`Delete "${tour.name}"?`)) deleteTour(projectId, tour.id);
            }}
            className="p-1.5 rounded-lg text-nm-muted hover:text-nm-danger transition-colors"
            title="Delete tour"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ProjectScreen ─────────────────────────────────────────────────────── */
export default function ProjectScreen() {
  const { projects, currentProjectId, goBack } = useTourStore();
  const [showModal, setShowModal] = useState(false);

  const project = currentProjectId ? projects[currentProjectId] : null;
  if (!project) {
    goBack();
    return null;
  }

  const tourList = Object.values(project.tours ?? {}).sort((a, b) => b.created - a.created);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col" style={{ background: 'var(--nm-base)' }}>
      {/* Nav */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-8 h-16"
        style={{ boxShadow: '0 4px 14px var(--sh-d)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-sm text-nm-muted hover:text-nm-text transition-colors"
          >
            <ChevronLeft size={16} />
            Projects
          </button>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
              style={{ boxShadow: '3px 3px 8px rgba(0,0,0,.4), -2px -2px 5px rgba(255,255,255,.06)' }}
            >
              <img src="/logo.svg" alt="ArchScape" className="w-full h-full object-cover" />
            </div>
            <span className="font-syne font-semibold text-nm-text">{project.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
            <div
              className="flex flex-col items-center justify-center py-20 rounded-nm"
              style={{ boxShadow: 'inset 4px 4px 12px rgba(0,0,0,.5), inset -3px -3px 8px rgba(255,255,255,.03)' }}
            >
              <div
                className="w-16 h-16 rounded-nm flex items-center justify-center mb-4"
                style={{ boxShadow: '6px 6px 14px rgba(0,0,0,.6), -4px -4px 10px rgba(255,255,255,.04)' }}
              >
                <Play size={28} className="text-nm-accent opacity-50" />
              </div>
              <h3 className="font-syne font-semibold text-nm-text mb-2">No tours yet</h3>
              <p className="text-sm text-nm-muted mb-5">Create your first virtual tour to start adding panoramic scenes.</p>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-nm-sm transition-all"
                style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 12px rgba(224,123,63,.35)' }}
              >
                <Plus size={14} />
                Create Tour
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tourList.map(tour => (
                <TourCard key={tour.id} tour={tour} projectId={project.id} />
              ))}
              <button
                onClick={() => setShowModal(true)}
                className="rounded-nm p-5 flex flex-col items-center justify-center gap-3 text-nm-muted hover:text-nm-accent transition-all hover:scale-[1.01] min-h-[180px]"
                style={{ boxShadow: '6px 6px 14px rgba(0,0,0,.5), -4px -4px 10px rgba(255,255,255,.03)', border: '1.5px dashed rgba(224,221,216,0.12)' }}
              >
                <Plus size={22} />
                <span className="text-sm font-medium font-syne">New Tour</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {showModal && <NewTourModal projectId={project.id} onClose={() => setShowModal(false)} />}
    </div>
  );
}
