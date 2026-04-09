import React, { useRef, useCallback, useState } from 'react';
import { X, Trash2, MapPin, Plus, Pencil, Check, ChevronUp, ChevronDown } from 'lucide-react';
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

  const imgRef = useRef<HTMLImageElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Editing state per-floor-plan
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState(0);

  const activeFp = floorPlans.find(f => f.id === activeFloorPlanId) ?? null;

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current || !activeSceneId || !activeFp) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    setFloorPlanMarker(activeFp.id, activeSceneId, x, y);
  }, [activeSceneId, activeFp, setFloorPlanMarker]);

  const handleAddFile = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const url = await fileToDataUrl(files[0]);
    addFloorPlan(url);
  };

  const startEdit = (fp: typeof floorPlans[0]) => {
    setEditingId(fp.id);
    setEditName(fp.name);
    setEditLevel(fp.level);
  };

  const commitEdit = () => {
    if (!editingId) return;
    updateFloorPlan(editingId, { name: editName.trim() || 'Untitled', level: editLevel });
    setEditingId(null);
  };

  const sorted = [...floorPlans].sort((a, b) => a.level - b.level);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-nm-muted uppercase tracking-wide font-medium">Floor Plans</p>
        <button
          onClick={() => addInputRef.current?.click()}
          className="flex items-center gap-1 text-[10px] text-nm-accent hover:text-white px-2 py-1 rounded-lg hover:bg-nm-accent/10 transition-colors"
          title="Add floor plan"
        >
          <Plus size={11} /> Add
        </button>
        <input
          ref={addInputRef}
          type="file" accept="image/*" className="hidden"
          onChange={e => { handleAddFile(e.target.files); e.target.value = ''; }}
        />
      </div>

      {floorPlans.length === 0 && (
        <div className="text-center py-6">
          <p className="text-[11px] text-nm-muted mb-3">No floor plans added yet.</p>
          <button
            onClick={() => addInputRef.current?.click()}
            className="px-3 py-1.5 text-xs bg-nm-accent hover:bg-nm-accent-hover text-white rounded-xl font-medium transition-colors"
          >
            Upload Floor Plan
          </button>
        </div>
      )}

      {/* Floor plan list */}
      {sorted.length > 0 && (
        <div className="space-y-1.5">
          {sorted.map(fp => {
            const isActive  = fp.id === activeFloorPlanId;
            const isEditing = fp.id === editingId;
            return (
              <div key={fp.id}
                className={['rounded-xl border transition-colors overflow-hidden',
                  isActive ? 'border-nm-accent/50 bg-nm-accent/5' : 'border-nm-border bg-nm-base',
                ].join(' ')}
              >
                {/* Row */}
                <div
                  className="flex items-center gap-2 px-2 py-2 cursor-pointer"
                  onClick={() => { if (!isEditing) setActiveFloorPlan(fp.id); }}
                >
                  {/* Level badge */}
                  <span className={['text-[9px] font-bold w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0',
                    isActive ? 'bg-nm-accent text-white' : 'bg-nm-surface text-nm-muted',
                  ].join(' ')}>
                    {fp.level}
                  </span>

                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <input
                        className="flex-1 bg-nm-surface border border-nm-border rounded px-1.5 py-0.5 text-xs text-nm-text outline-none focus:border-nm-accent"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                        autoFocus
                      />
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => setEditLevel(v => v - 1)} className="text-nm-muted hover:text-nm-text p-0.5"><ChevronDown size={10} /></button>
                        <span className="text-[9px] text-nm-muted w-4 text-center">{editLevel}</span>
                        <button onClick={() => setEditLevel(v => v + 1)} className="text-nm-muted hover:text-nm-text p-0.5"><ChevronUp size={10} /></button>
                      </div>
                      <button onClick={commitEdit} className="text-nm-accent hover:text-white p-0.5 transition-colors"><Check size={11} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-xs text-nm-text truncate">{fp.name}</span>
                      <span className="text-[9px] text-nm-muted">{fp.markers.length} marker{fp.markers.length !== 1 ? 's' : ''}</span>
                    </>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => startEdit(fp)} className="text-nm-muted hover:text-nm-accent p-1 transition-colors"><Pencil size={10} /></button>
                      <button onClick={() => removeFloorPlan(fp.id)} className="text-nm-muted hover:text-red-400 p-1 transition-colors"><Trash2 size={10} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active floor plan editor */}
      {activeFp && (
        <>
          <div className="border-t border-nm-border pt-3">
            <p className="text-[10px] text-nm-muted uppercase tracking-wide font-medium mb-2">{activeFp.name} — Markers</p>

            {activeSceneId ? (
              <p className="text-[11px] text-nm-muted leading-snug mb-2">
                Click the floor plan to place a marker for{' '}
                <span className="text-white">"{scenes.find(s => s.id === activeSceneId)?.name}"</span>.
              </p>
            ) : (
              <p className="text-[11px] text-nm-muted mb-2">Select a scene to place its marker.</p>
            )}

            {/* Floor plan image with markers */}
            <div
              className="relative rounded-xl overflow-hidden border border-nm-border cursor-crosshair"
              onClick={handleImageClick}
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
                const isActive = m.sceneId === activeSceneId;
                return (
                  <div key={m.sceneId} className="absolute"
                    style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, transform: 'translate(-50%, -100%)' }}
                    title={sc?.name}
                    onClick={e => e.stopPropagation()}
                  >
                    <MapPin size={18}
                      className={isActive ? 'text-nm-accent drop-shadow' : 'text-nm-muted'}
                      fill={isActive ? '#4f7cff' : 'transparent'}
                    />
                  </div>
                );
              })}
            </div>

            {/* Marker list */}
            {activeFp.markers.length > 0 && (
              <div className="space-y-1.5 mt-3">
                {activeFp.markers.map(m => {
                  const sc = scenes.find(s => s.id === m.sceneId);
                  return (
                    <div key={m.sceneId} className="flex items-center gap-2 px-2 py-1.5 bg-nm-base rounded-lg border border-nm-border">
                      <MapPin size={11} className="text-nm-accent flex-shrink-0" />
                      <span className="flex-1 text-xs text-nm-text truncate">{sc?.name ?? m.sceneId}</span>
                      <button onClick={() => removeFloorPlanMarker(activeFp.id, m.sceneId)}
                        className="text-nm-muted hover:text-red-400 transition-colors">
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
