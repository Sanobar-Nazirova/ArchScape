import React, { useState } from 'react';
import { Plus, FolderOpen, Trash2, X, Layers } from 'lucide-react';
import { useTourStore } from '../store/useTourStore';
import type { Project } from '../types';

/* ─── New Project Modal ─────────────────────────────────────────────────── */
function NewProjectModal({ onClose }: { onClose: () => void }) {
  const { addProject, openProject } = useTourStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = addProject(trimmed, desc.trim() || undefined);
    openProject(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-[420px] max-w-[95vw] rounded-nm-lg p-7"
        style={{ background: 'var(--nm-base)', boxShadow: '10px 10px 24px rgba(0,0,0,.65), -6px -6px 16px rgba(255,255,255,.05)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-syne text-xl font-bold text-nm-text">New Project</h2>
          <button onClick={onClose} className="text-nm-muted hover:text-nm-text transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-nm-muted mb-2">Project Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
              placeholder="My Virtual Tour Project"
              className="w-full bg-transparent rounded-nm-sm px-4 py-3 text-sm text-nm-text outline-none placeholder:text-nm-muted"
              style={{ boxShadow: 'inset 4px 4px 10px rgba(0,0,0,.6), inset -3px -3px 8px rgba(255,255,255,.04)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-nm-muted mb-2">Description (optional)</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Brief description of this project..."
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
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Project Card ──────────────────────────────────────────────────────── */
function ProjectCard({ project }: { project: Project }) {
  const { openProject, deleteProject } = useTourStore();
  const tourCount = Object.keys(project.tours ?? {}).length;
  const initials = project.name.slice(0, 2).toUpperCase();

  const created = new Date(project.created).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div
      className="group rounded-nm p-5 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{ background: 'var(--nm-base)', boxShadow: '6px 6px 14px rgba(0,0,0,.6), -4px -4px 10px rgba(255,255,255,.04)' }}
      onClick={() => openProject(project.id)}
    >
      {/* Thumb */}
      <div
        className="w-full h-32 rounded-nm-sm mb-4 flex items-center justify-center"
        style={{ boxShadow: 'inset 4px 4px 10px rgba(0,0,0,.6), inset -3px -3px 8px rgba(255,255,255,.04)' }}
      >
        <span className="font-syne text-4xl font-bold text-nm-accent opacity-60">{initials}</span>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-syne font-semibold text-nm-text truncate mb-0.5">{project.name}</h3>
          {project.desc && (
            <p className="text-xs text-nm-muted truncate mb-2">{project.desc}</p>
          )}
          <p className="text-[11px] text-nm-muted">
            {tourCount} tour{tourCount !== 1 ? 's' : ''} · {created}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); openProject(project.id); }}
            className="p-1.5 rounded-lg text-nm-muted hover:text-nm-accent transition-colors"
            title="Open project"
          >
            <FolderOpen size={14} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); if (confirm(`Delete "${project.name}"?`)) deleteProject(project.id); }}
            className="p-1.5 rounded-lg text-nm-muted hover:text-nm-danger transition-colors"
            title="Delete project"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── HomeScreen ────────────────────────────────────────────────────────── */
export default function HomeScreen() {
  const { projects } = useTourStore();
  const [showModal, setShowModal] = useState(false);

  const projectList = Object.values(projects).sort((a, b) => b.created - a.created);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col" style={{ background: 'var(--nm-base)' }}>
      {/* Nav */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-8 h-16"
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,.4)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-nm-sm flex items-center justify-center"
            style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 10px rgba(224,123,63,.4), -2px -2px 6px rgba(255,255,255,.06)' }}
          >
            <Layers size={17} className="text-white" />
          </div>
          <span className="font-syne text-lg font-bold text-nm-text">Sphera</span>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-nm-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 12px rgba(224,123,63,.35), -2px -2px 6px rgba(255,255,255,.05)' }}
        >
          <Plus size={15} />
          New Project
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="font-syne text-2xl font-bold text-nm-text mb-1">Projects</h1>
            <p className="text-sm text-nm-muted">
              {projectList.length} project{projectList.length !== 1 ? 's' : ''}
            </p>
          </div>

          {projectList.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-20 rounded-nm"
              style={{ boxShadow: 'inset 4px 4px 12px rgba(0,0,0,.5), inset -3px -3px 8px rgba(255,255,255,.03)' }}
            >
              <div
                className="w-16 h-16 rounded-nm flex items-center justify-center mb-4"
                style={{ boxShadow: '6px 6px 14px rgba(0,0,0,.6), -4px -4px 10px rgba(255,255,255,.04)' }}
              >
                <Layers size={28} className="text-nm-accent opacity-50" />
              </div>
              <h3 className="font-syne font-semibold text-nm-text mb-2">No projects yet</h3>
              <p className="text-sm text-nm-muted mb-5">Create your first virtual tour project to get started.</p>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-nm-sm transition-all"
                style={{ background: 'var(--nm-accent)', boxShadow: '4px 4px 12px rgba(224,123,63,.35)' }}
              >
                <Plus size={14} />
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {projectList.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
              <button
                onClick={() => setShowModal(true)}
                className="rounded-nm p-5 flex flex-col items-center justify-center gap-3 text-nm-muted hover:text-nm-accent transition-all hover:scale-[1.01] active:scale-[0.99] min-h-[200px]"
                style={{ boxShadow: '6px 6px 14px rgba(0,0,0,.5), -4px -4px 10px rgba(255,255,255,.03)', border: '1.5px dashed rgba(224,221,216,0.12)' }}
              >
                <Plus size={22} />
                <span className="text-sm font-medium font-syne">New Project</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
