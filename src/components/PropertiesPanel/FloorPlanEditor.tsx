import React, { useRef, useCallback, useState } from 'react';
import { X, Trash2, MapPin, Plus, Pencil, Check, ChevronUp, ChevronDown, Maximize2 } from 'lucide-react';
import { useTourStore } from '../../store/useTourStore';

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

export default function FloorPlanEditor() {
  const {
    scenes, floorPlans, activeFloorPlanId,
    addFloorPlan, removeFloorPlan, updateFloorPlan,
    setActiveFloorPlan, setFloorPlanMarker, removeFloorPlanMarker,
    activeSceneId,
  } = useTourStore();

  const imgRef      = useRef<HTMLImageElement>(null);
  const modalImgRef = useRef<HTMLImageElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editName,   setEditName]   = useState('');
  const [editLevel,  setEditLevel]  = useState(0);
  const [expanded,   setExpanded]   = useState(false);

  const sorted   = [...floorPlans].sort((a, b) => a.level - b.level);
  const activeFp = floorPlans.find(f => f.id === activeFloorPlanId) ?? sorted[0] ?? null;

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>, ref: React.RefObject<HTMLImageElement | null>) => {
    if (!ref.current || !activeSceneId || !activeFp) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    setFloorPlanMarker(activeFp.id, activeSceneId, Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)));
  }, [activeSceneId, activeFp, setFloorPlanMarker]);

  const startEdit = (fp: typeof floorPlans[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(fp.id);
    setEditName(fp.name);
    setEditLevel(fp.level);
  };

  const commitEdit = () => {
    if (!editingId) return;
    updateFloorPlan(editingId, { name: editName.trim() || 'Untitled', level: editLevel });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">

      {/* ── Add button ── */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-nm-muted uppercase tracking-wide font-medium">Floor Plans</p>
        <button
          onClick={() => addInputRef.current?.click()}
          className="flex items-center gap-1 text-[10px] text-nm-accent hover:text-white px-2 py-1 rounded-lg hover:bg-nm-accent/10 transition-colors"
        >
          <Plus size={11} /> Add Floor
        </button>
        <input ref={addInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { if (e.target.files?.[0]) fileToDataUrl(e.target.files[0]).then(url => addFloorPlan(url)); e.target.value = ''; }}
        />
      </div>

      {floorPlans.length === 0 && (
        <div className="text-center py-6">
          <p className="text-[11px] text-nm-muted mb-3">No floor plans yet.</p>
          <button onClick={() => addInputRef.current?.click()}
            className="px-3 py-1.5 text-xs bg-nm-accent hover:bg-nm-accent-hover text-white rounded-xl font-medium transition-colors">
            Upload Floor Plan
          </button>
        </div>
      )}

      {sorted.length > 0 && (
        <>
          {/* ── Floor selector tabs ── */}
          <div>
            <p className="text-[9px] text-nm-muted uppercase tracking-wide mb-1.5">Select floor to edit</p>
            <div className="flex flex-wrap gap-1.5">
              {sorted.map(fp => {
                const isActive = fp.id === (activeFp?.id ?? null);
                return (
                  <button
                    key={fp.id}
                    onClick={() => setActiveFloorPlan(fp.id)}
                    className={[
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      isActive
                        ? 'bg-nm-accent text-white border-nm-accent shadow-sm'
                        : 'bg-nm-surface text-nm-muted border-nm-border hover:border-nm-accent hover:text-nm-text',
                    ].join(' ')}
                  >
                    <span className={['text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center',
                      isActive ? 'bg-white/20' : 'bg-nm-base',
                    ].join(' ')}>{fp.level}</span>
                    {fp.name}
                    {fp.markers.length > 0 && (
                      <span className={['text-[9px]', isActive ? 'text-white/70' : 'text-nm-muted'].join(' ')}>
                        ·{fp.markers.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Active floor plan image editor ── */}
          {activeFp && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-nm-muted uppercase tracking-wide font-medium">{activeFp.name}</p>
                <button onClick={() => setExpanded(true)}
                  className="flex items-center gap-1 text-[10px] text-nm-accent hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-nm-accent/10"
                  title="Expand for accurate placement">
                  <Maximize2 size={10} /> Expand
                </button>
              </div>

              {activeSceneId ? (
                <p className="text-[11px] text-nm-muted leading-snug">
                  Click the map to place{' '}
                  <span className="text-nm-text font-medium">"{scenes.find(s => s.id === activeSceneId)?.name}"</span>
                </p>
              ) : (
                <p className="text-[11px] text-nm-muted">Select a scene first, then click the map.</p>
              )}

              <div
                className="relative rounded-xl overflow-hidden border border-nm-border cursor-crosshair"
                onClick={e => handleImageClick(e, imgRef)}
              >
                <img
                  ref={imgRef}
                  src={activeFp.imageUrl}
                  alt={activeFp.name}
                  className="w-full object-contain block"
                  draggable={false}
                />
                {activeFp.markers.map(m => {
                  const sc = scenes.find(s => s.id === m.sceneId);
                  const isCurrentScene = m.sceneId === activeSceneId;
                  return (
                    <div key={m.sceneId} className="absolute group"
                      style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, transform: 'translate(-50%, -100%)' }}
                      title={sc?.name}
                      onClick={e => e.stopPropagation()}
                    >
                      <MapPin size={18}
                        className={isCurrentScene ? 'text-nm-accent drop-shadow' : 'text-nm-muted'}
                        fill={isCurrentScene ? '#4f7cff' : 'transparent'}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 hidden group-hover:block pointer-events-none">
                        <span className="bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
                          {sc?.name ?? m.sceneId}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Placed markers list */}
              {activeFp.markers.length > 0 && (
                <div className="space-y-1">
                  {activeFp.markers.map(m => {
                    const sc = scenes.find(s => s.id === m.sceneId);
                    return (
                      <div key={m.sceneId} className="flex items-center gap-2 px-2 py-1.5 bg-nm-base rounded-lg border border-nm-border">
                        <MapPin size={11} className="text-nm-accent flex-shrink-0" />
                        <span className="flex-1 text-xs text-nm-text truncate">{sc?.name ?? m.sceneId}</span>
                        <button onClick={() => removeFloorPlanMarker(activeFp.id, m.sceneId)}
                          className="text-nm-muted hover:text-red-400 transition-colors p-0.5">
                          <X size={11} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Manage floors (rename / delete) ── */}
          <div className="border-t border-nm-border pt-3 space-y-1.5">
            <p className="text-[9px] text-nm-muted uppercase tracking-wide mb-1.5">Manage floors</p>
            {sorted.map(fp => {
              const isEditing = fp.id === editingId;
              return (
                <div key={fp.id} className="flex items-center gap-2 px-2 py-1.5 bg-nm-base rounded-lg border border-nm-border">
                  <span className="text-[9px] font-bold w-5 h-5 rounded bg-nm-surface text-nm-muted flex items-center justify-center flex-shrink-0">
                    {isEditing ? editLevel : fp.level}
                  </span>

                  {isEditing ? (
                    <>
                      <input
                        className="flex-1 bg-nm-surface border border-nm-border rounded px-1.5 py-0.5 text-xs text-nm-text outline-none focus:border-nm-accent"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                        autoFocus
                      />
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => setEditLevel(v => v - 1)} className="text-nm-muted hover:text-nm-text p-0.5 transition-colors"><ChevronDown size={10} /></button>
                        <span className="text-[9px] text-nm-muted w-4 text-center">{editLevel}</span>
                        <button onClick={() => setEditLevel(v => v + 1)} className="text-nm-muted hover:text-nm-text p-0.5 transition-colors"><ChevronUp size={10} /></button>
                      </div>
                      <button onClick={commitEdit} className="text-nm-accent hover:text-white p-0.5 transition-colors"><Check size={11} /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-xs text-nm-text truncate">{fp.name}</span>
                      <button onClick={e => startEdit(fp, e)} className="text-nm-muted hover:text-nm-accent p-0.5 transition-colors"><Pencil size={10} /></button>
                      <button onClick={() => removeFloorPlan(fp.id)} className="text-nm-muted hover:text-red-400 p-0.5 transition-colors"><Trash2 size={10} /></button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Fullscreen expand modal ── */}
      {expanded && activeFp && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
          onClick={() => setExpanded(false)}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            onClick={e => e.stopPropagation()}>
            <div>
              <p className="text-white font-semibold text-sm">{activeFp.name} — Place Markers</p>
              {activeSceneId
                ? <p className="text-[11px] text-white/60 mt-0.5">
                    Click the map to place <span className="text-nm-accent">"{scenes.find(s => s.id === activeSceneId)?.name}"</span>
                  </p>
                : <p className="text-[11px] text-white/60 mt-0.5">Select a scene in the sidebar first.</p>
              }
            </div>
            <button onClick={() => setExpanded(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Floor plan image — fills remaining space */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}>
            <div
              className="relative cursor-crosshair rounded-xl overflow-hidden border border-white/20 max-h-full"
              style={{ maxWidth: '100%' }}
              onClick={e => handleImageClick(e, modalImgRef)}
            >
              <img
                ref={modalImgRef}
                src={activeFp.imageUrl}
                alt={activeFp.name}
                className="block max-w-full max-h-[calc(100vh-140px)] object-contain"
                draggable={false}
              />
              {activeFp.markers.map(m => {
                const sc = scenes.find(s => s.id === m.sceneId);
                const isCurrentScene = m.sceneId === activeSceneId;
                return (
                  <div key={m.sceneId} className="absolute group"
                    style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, transform: 'translate(-50%, -100%)' }}
                    title={sc?.name}
                    onClick={e => e.stopPropagation()}
                  >
                    <MapPin size={24}
                      className={isCurrentScene ? 'text-nm-accent drop-shadow-lg' : 'text-white/70'}
                      fill={isCurrentScene ? '#4f7cff' : 'rgba(255,255,255,0.3)'}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block pointer-events-none">
                      <span className="bg-black/80 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap">
                        {sc?.name ?? m.sceneId}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
