import { create } from 'zustand';
import type {
  Scene, Folder, FloorPlan,
  Hotspot, MediaPoint, AudioSource,
  ToolMode, SelectedElementType,
  PanoramaFormat, MediaType,
  AppScreen, Project, Tour,
} from '../types';
import { saveImage, loadImage, deleteImage } from '../utils/imageDB';
import { saveSnapshot, getSnapshotData } from '../utils/snapshots';

let _idCounter = 0;
const genId = (prefix = 'id') => `${prefix}_${++_idCounter}_${Math.random().toString(36).slice(2, 7)}`;

interface TourState {
  // ── Navigation ────────────────────────────────────────────────────────────
  currentScreen: AppScreen;
  currentProjectId: string | null;
  currentTourId: string | null;
  projects: Record<string, Project>;
  propsTab: 'scene' | 'hotspots' | 'media' | 'audio';

  // ── Data ──────────────────────────────────────────────────────────────────
  projectName: string;
  scenes: Scene[];
  folders: Folder[];
  floorPlans: FloorPlan[];
  activeFloorPlanId: string | null;

  // ── UI state ──────────────────────────────────────────────────────────────
  theme: 'dark' | 'light';
  activeSceneId: string | null;
  selectedElementId: string | null;
  selectedElementType: SelectedElementType;
  activeTool: ToolMode;
  isPreviewMode: boolean;
  pendingVRMode: boolean;
  publishUrl: string | null;
  publishJsonUrl: string | null;
  showPublishModal: boolean;
  isFloorPlanEditing: boolean;

  // ── Navigation actions ────────────────────────────────────────────────────
  addProject: (name: string, desc?: string) => string;
  deleteProject: (id: string) => void;
  openProject: (id: string) => void;
  updateProject: (id: string, updates: { name?: string; desc?: string; thumbnail?: string }) => void;
  addTour: (projectId: string, name: string, desc?: string) => string;
  deleteTour: (projectId: string, tourId: string) => void;
  duplicateTour: (projectId: string, tourId: string) => string;
  updateTour: (projectId: string, tourId: string, updates: { name?: string; desc?: string; password?: string; thumbUrl?: string }) => void;
  updateSceneFisheyeConfig: (sceneId: string, config: import('../types').FisheyeConfig) => void;
  openTour: (projectId: string, tourId: string) => void;
  restoreSceneImages: () => Promise<void>;
  saveTour: (name?: string) => void;
  goBack: () => void;
  goHome: () => void;
  setPropsTab: (tab: 'scene' | 'hotspots' | 'media' | 'audio') => void;
  toggleTheme: () => void;

  // ── Scene actions ─────────────────────────────────────────────────────────
  setProjectName: (name: string) => void;
  addScene: (imageUrl: string, name: string, format: PanoramaFormat, mediaType: MediaType, thumbnail?: string, aspectRatio?: number) => string;
  removeScene: (id: string) => void;
  renameScene: (id: string, name: string) => void;
  reorderScenes: (activeId: string, overId: string) => void;
  setActiveScene: (id: string | null) => void;
  setSceneFolderId: (sceneId: string, folderId: string | null) => void;
  updateSceneInitialView: (sceneId: string, yaw: number, pitch: number) => void;
  updateSceneNorthOffset: (sceneId: string, offset: number) => void;
  updateSceneFormat: (sceneId: string, format: PanoramaFormat) => void;
  updateSceneStereoEye: (sceneId: string, eye: 'left' | 'right') => void;
  updateSceneImage: (sceneId: string, imageUrl: string, format: PanoramaFormat, mediaType: MediaType, thumbnail?: string, aspectRatio?: number) => void;

  // ── Folder actions ────────────────────────────────────────────────────────
  addFolder: (name: string, parentId?: string | null, color?: string) => string;
  removeFolder: (id: string) => void;
  renameFolder: (id: string, name: string) => void;
  toggleFolder: (id: string) => void;
  moveFolderTo: (folderId: string, newParentId: string | null) => void;
  updateFolderColor: (id: string, color: string) => void;

  // ── Scene extras ──────────────────────────────────────────────────────────
  duplicateScene: (sceneId: string) => string;
  addSceneTag: (sceneId: string, tag: string) => void;
  removeSceneTag: (sceneId: string, tag: string) => void;

  // ── Hotspot actions ───────────────────────────────────────────────────────
  addHotspot: (sceneId: string, yaw: number, pitch: number, type?: Hotspot['type']) => string;
  updateHotspot: (sceneId: string, hotspotId: string, updates: Partial<Hotspot>) => void;
  removeHotspot: (sceneId: string, hotspotId: string) => void;

  // ── Media point actions ───────────────────────────────────────────────────
  addMediaPoint: (sceneId: string, yaw: number, pitch: number) => string;
  updateMediaPoint: (sceneId: string, mediaId: string, updates: Partial<MediaPoint>) => void;
  removeMediaPoint: (sceneId: string, mediaId: string) => void;

  // ── Audio source actions ──────────────────────────────────────────────────
  addAudioSource: (sceneId: string) => string;
  updateAudioSource: (sceneId: string, audioId: string, updates: Partial<AudioSource>) => void;
  removeAudioSource: (sceneId: string, audioId: string) => void;

  // ── Floor plan actions ────────────────────────────────────────────────────
  addFloorPlan: (imageUrl: string, name?: string, level?: number) => string;
  removeFloorPlan: (id: string) => void;
  updateFloorPlan: (id: string, updates: { name?: string; level?: number }) => void;
  updateFloorPlanImage: (id: string, imageUrl: string) => void;
  setActiveFloorPlan: (id: string | null) => void;
  setFloorPlanMarker: (floorPlanId: string, sceneId: string, x: number, y: number) => void;
  removeFloorPlanMarker: (floorPlanId: string, sceneId: string) => void;

  // ── Variant hotspot actions ───────────────────────────────────────────────
  pendingStartView: { yaw: number; pitch: number } | null;
  setPendingStartView: (v: { yaw: number; pitch: number } | null) => void;
  syncVariantHotspot: (fromSceneId: string, hotspotId: string) => void;

  // ── UI actions ────────────────────────────────────────────────────────────
  setActiveTool: (tool: ToolMode) => void;
  setSelectedElement: (type: SelectedElementType, id: string | null) => void;
  togglePreviewMode: () => void;
  clearPendingVRMode: () => void;
  publish: () => void;
  closePublishModal: () => void;
  setFloorPlanEditing: (v: boolean) => void;

  // ── Snapshot actions ──────────────────────────────────────────────────────
  createSnapshot: (name: string) => void;
  restoreSnapshot: (id: string) => void;

  // ── Selectors (helpers, not reactive) ────────────────────────────────────
  getActiveScene: () => Scene | null;
  getScene: (id: string) => Scene | undefined;
}

export const useTourStore = create<TourState>()((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  theme: (() => {
    const saved = (localStorage.getItem('sphera_theme') as 'dark' | 'light') ?? 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    return saved;
  })(),
  currentScreen: 'home',
  currentProjectId: null,
  currentTourId: null,
  projects: (() => {
    try { return JSON.parse(localStorage.getItem('sphera_v2') || '{}'); } catch (_e) { return {}; }
  })(),
  propsTab: 'scene',

  projectName: 'Untitled Tour',
  scenes: [],
  folders: [],
  floorPlans: [],
  activeFloorPlanId: null,
  activeSceneId: null,
  selectedElementId: null,
  selectedElementType: null,
  activeTool: 'none',
  isPreviewMode: false,
  pendingVRMode: false,
  publishUrl: null,
  publishJsonUrl: null,
  showPublishModal: false,
  isFloorPlanEditing: false,
  pendingStartView: null,

  // ── Navigation actions ────────────────────────────────────────────────────
  addProject: (name, desc) => {
    const id = genId('proj');
    const project: Project = { id, name, desc, created: Date.now(), tours: {} };
    set(s => {
      const updated = { ...s.projects, [id]: project };
      try { localStorage.setItem('sphera_v2', JSON.stringify(updated)); } catch (_e) {}
      return { projects: updated };
    });
    return id;
  },

  deleteProject: (id) => set(s => {
    const { [id]: _removed, ...rest } = s.projects;
    try { localStorage.setItem('sphera_v2', JSON.stringify(rest)); } catch (_e) {}
    return { projects: rest };
  }),

  updateProject: (id, updates) => set(s => {
    const updated = { ...s.projects, [id]: { ...s.projects[id], ...updates } };
    try { localStorage.setItem('sphera_v2', JSON.stringify(updated)); } catch (_e) {}
    return { projects: updated };
  }),

  openProject: (id) => set({ currentScreen: 'project', currentProjectId: id }),

  addTour: (projectId, name, desc) => {
    const id = genId('tour');
    const tour: Tour = { id, name, desc, created: Date.now(), scenes: [], folders: [] };
    set(s => {
      const updated = {
        ...s.projects,
        [projectId]: {
          ...s.projects[projectId],
          tours: { ...s.projects[projectId].tours, [id]: tour },
        },
      };
      try { localStorage.setItem('sphera_v2', JSON.stringify(updated)); } catch (_e) {}
      return { projects: updated };
    });
    return id;
  },

  deleteTour: (projectId, tourId) => set(s => {
    const { [tourId]: _removed, ...rest } = s.projects[projectId]?.tours ?? {};
    const updated = {
      ...s.projects,
      [projectId]: { ...s.projects[projectId], tours: rest },
    };
    try { localStorage.setItem('sphera_v2', JSON.stringify(updated)); } catch (_e) {}
    return { projects: updated };
  }),

  duplicateTour: (projectId, tourId) => {
    const state = get();
    const orig = state.projects[projectId]?.tours[tourId];
    if (!orig) return '';
    const newId = genId('tour');
    const copy: Tour = {
      ...orig,
      id: newId,
      name: `${orig.name} (copy)`,
      created: Date.now(),
      updated: undefined,
    };
    // Copy images in IndexedDB for each scene
    orig.scenes.forEach(sc => {
      loadImage(`scene_${sc.id}`).then(url => {
        if (url) saveImage(`scene_${newId}_${sc.id}`, url);
      });
    });
    const updated = {
      ...state.projects,
      [projectId]: {
        ...state.projects[projectId],
        tours: { ...state.projects[projectId].tours, [newId]: copy },
      },
    };
    try { localStorage.setItem('sphera_v2', JSON.stringify(updated)); } catch (_e) {}
    set({ projects: updated });
    return newId;
  },

  updateTour: (projectId, tourId, updates) => set(s => {
    const existing = s.projects[projectId]?.tours[tourId];
    if (!existing) return {};
    const updated = {
      ...s.projects,
      [projectId]: {
        ...s.projects[projectId],
        tours: {
          ...s.projects[projectId].tours,
          [tourId]: { ...existing, ...updates },
        },
      },
    };
    try { localStorage.setItem('sphera_v2', JSON.stringify(updated)); } catch (_e) {}
    return { projects: updated };
  }),

  openTour: (projectId, tourId) => {
    const state = get();
    const tour = state.projects[projectId]?.tours?.[tourId];
    if (!tour) return;
    // Normalize scenes loaded from storage — ensure required arrays always exist
    const scenes = (tour.scenes ?? []).map(s => ({
      ...s,
      hotspots:     s.hotspots     ?? [],
      mediaPoints:  s.mediaPoints  ?? [],
      audioSources: s.audioSources ?? [],
      tags:         s.tags         ?? [],
    }));
    const floorPlans = tour.floorPlans ?? [];
    set({
      currentScreen: 'editor',
      currentProjectId: projectId,
      currentTourId: tourId,
      projectName: tour.name,
      scenes,
      folders: tour.folders ?? [],
      floorPlans,
      activeFloorPlanId: floorPlans[0]?.id ?? null,
      activeSceneId: scenes[0]?.id ?? null,
      selectedElementId: null,
      selectedElementType: null,
      activeTool: 'none',
      isPreviewMode: false,
    });
  },

  saveTour: (name) => {
    const state = get();
    const { currentProjectId: pid, currentTourId: tid, scenes, folders, floorPlans, projects } = state;
    if (!pid || !tid || !projects[pid]) return;
    const existing = projects[pid].tours[tid];
    if (!existing) return;
    const thumbUrl = scenes[0]?.thumbnail;

    // Persist full images in IndexedDB; strip from localStorage to avoid quota overflow
    scenes.forEach(sc => {
      if (sc.imageUrl) saveImage(`scene_${sc.id}`, sc.imageUrl);
    });
    floorPlans.forEach(fp => {
      if (fp.imageUrl) saveImage(`fp_${fp.id}`, fp.imageUrl);
    });

    // Strip imageUrl before localStorage — it can be 10–100 MB per scene
    const scenesForStorage = scenes.map(sc => ({ ...sc, imageUrl: '' }));
    const floorPlansForStorage = floorPlans.map(fp => ({ ...fp, imageUrl: '' }));
    const updated: Tour = {
      ...existing,
      name: name ?? existing.name,
      updated: Date.now(),
      scenes: scenesForStorage,
      folders,
      floorPlans: floorPlansForStorage,
      thumbUrl,
    };
    const newProjects = {
      ...projects,
      [pid]: {
        ...projects[pid],
        tours: { ...projects[pid].tours, [tid]: updated },
      },
    };
    set({ projects: newProjects });
    try { localStorage.setItem('sphera_v2', JSON.stringify(newProjects)); } catch (_e) {
      console.warn('Storage full – consider removing old tours');
    }
  },

  /** After openTour, call this to restore imageUrls from IndexedDB. */
  restoreSceneImages: async () => {
    const { scenes, floorPlans } = get();
    const [updatedScenes, updatedFloorPlans] = await Promise.all([
      Promise.all(scenes.map(async sc => {
        if (sc.imageUrl) return sc;
        const url = await loadImage(`scene_${sc.id}`);
        return url ? { ...sc, imageUrl: url } : sc;
      })),
      Promise.all(floorPlans.map(async fp => {
        if (fp.imageUrl) return fp;
        const url = await loadImage(`fp_${fp.id}`);
        return url ? { ...fp, imageUrl: url } : fp;
      })),
    ]);
    set({ scenes: updatedScenes, floorPlans: updatedFloorPlans });
  },

  goBack: () => {
    const { currentScreen } = get();
    if (currentScreen === 'editor') set({ currentScreen: 'project', isPreviewMode: false });
    else if (currentScreen === 'project') set({ currentScreen: 'home' });
  },

  goHome: () => set({ currentScreen: 'home', isPreviewMode: false }),

  setPropsTab: (tab) => set({ propsTab: tab }),

  toggleTheme: () => set(s => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sphera_theme', next);
    return { theme: next };
  }),

  // ── Scene actions ─────────────────────────────────────────────────────────
  setProjectName: (name) => set({ projectName: name }),

  addScene: (imageUrl, name, format, mediaType, thumbnail, aspectRatio) => {
    const id = genId('scene');
    const scene: Scene = {
      id, name, imageUrl, mediaType, format,
      folderId: null,
      hotspots: [],
      mediaPoints: [],
      audioSources: [],
      initialYaw: 0,
      initialPitch: 0,
      thumbnail,
      aspectRatio,
    };
    set((s) => ({
      scenes: [...s.scenes, scene],
      activeSceneId: s.activeSceneId ?? id,
    }));
    return id;
  },

  removeScene: (id) => {
    deleteImage(`scene_${id}`);
    set((s) => {
      const scenes = s.scenes.filter(sc => sc.id !== id);
      const activeSceneId = s.activeSceneId === id
        ? (scenes[0]?.id ?? null)
        : s.activeSceneId;
      const selectedElementId = s.selectedElementType === 'scene' && s.selectedElementId === id
        ? null : s.selectedElementId;
      const selectedElementType = selectedElementId === null ? null : s.selectedElementType;
      // Remove hotspots in other scenes pointing to this scene
      const cleanedScenes = scenes.map(sc => ({
        ...sc,
        hotspots: sc.hotspots.filter(h => h.targetSceneId !== id),
      }));
      // Remove floor plan markers for this scene across all floor plans
      const floorPlans = s.floorPlans.map(fp => ({
        ...fp, markers: fp.markers.filter(m => m.sceneId !== id),
      }));
      return { scenes: cleanedScenes, activeSceneId, selectedElementId, selectedElementType, floorPlans };
    });
  },

  renameScene: (id, name) =>
    set((s) => ({ scenes: s.scenes.map(sc => sc.id === id ? { ...sc, name } : sc) })),

  reorderScenes: (activeId, overId) => {
    set((s) => {
      const scenes = [...s.scenes];
      const from = scenes.findIndex(sc => sc.id === activeId);
      const to   = scenes.findIndex(sc => sc.id === overId);
      if (from < 0 || to < 0 || from === to) return {};
      const [moved] = scenes.splice(from, 1);
      scenes.splice(to, 0, moved);
      return { scenes };
    });
  },

  setActiveScene: (id) =>
    set({ activeSceneId: id, selectedElementId: null, selectedElementType: null }),

  setSceneFolderId: (sceneId, folderId) =>
    set((s) => ({ scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, folderId } : sc) })),

  updateSceneInitialView: (sceneId, yaw, pitch) =>
    set((s) => ({ scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, initialYaw: yaw, initialPitch: pitch } : sc) })),

  updateSceneNorthOffset: (sceneId, offset) =>
    set((s) => ({ scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, northOffset: offset } : sc) })),

  updateSceneFormat: (sceneId, format) =>
    set((s) => ({ scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, format } : sc) })),

  updateSceneStereoEye: (sceneId, eye) =>
    set((s) => ({ scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, stereoEye: eye } : sc) })),

  updateSceneImage: (sceneId, imageUrl, format, mediaType, thumbnail, aspectRatio) => {
    saveImage(`scene_${sceneId}`, imageUrl);
    set((s) => ({
      scenes: s.scenes.map(sc =>
        sc.id !== sceneId ? sc : {
          ...sc, imageUrl, format, mediaType,
          ...(thumbnail   !== undefined && { thumbnail }),
          ...(aspectRatio !== undefined && { aspectRatio }),
          // Clear fisheye config so it re-derives from new image
          fisheyeConfig: undefined,
        },
      ),
    }));
  },

  updateSceneFisheyeConfig: (sceneId, config) =>
    set((s) => ({ scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, fisheyeConfig: config } : sc) })),

  // ── Folder actions ─────────────────────────────────────────────────────────
  addFolder: (name, parentId = null, color) => {
    const id = genId('folder');
    const folder: Folder = { id, name, isExpanded: true, parentId, color };
    set((s) => ({ folders: [...s.folders, folder] }));
    return id;
  },

  removeFolder: (id) => {
    // Collect all descendant folder IDs recursively
    const collectDescendants = (fId: string, all: Folder[]): string[] => {
      const children = all.filter(f => f.parentId === fId).map(f => f.id);
      return [fId, ...children.flatMap(c => collectDescendants(c, all))];
    };
    set((s) => {
      const toRemove = new Set(collectDescendants(id, s.folders));
      return {
        folders: s.folders.filter(f => !toRemove.has(f.id)),
        scenes: s.scenes.map(sc => toRemove.has(sc.folderId ?? '') ? { ...sc, folderId: null } : sc),
      };
    });
  },

  renameFolder: (id, name) =>
    set((s) => ({ folders: s.folders.map(f => f.id === id ? { ...f, name } : f) })),

  toggleFolder: (id) =>
    set((s) => ({ folders: s.folders.map(f => f.id === id ? { ...f, isExpanded: !f.isExpanded } : f) })),

  moveFolderTo: (folderId, newParentId) =>
    set((s) => ({ folders: s.folders.map(f => f.id === folderId ? { ...f, parentId: newParentId } : f) })),

  updateFolderColor: (id, color) =>
    set((s) => ({ folders: s.folders.map(f => f.id === id ? { ...f, color } : f) })),

  // ── Scene extras ──────────────────────────────────────────────────────────
  duplicateScene: (sceneId) => {
    const state = get();
    const orig = state.scenes.find(s => s.id === sceneId);
    if (!orig) return '';
    const newId = genId('scene');
    const copy: Scene = {
      ...orig,
      id: newId,
      name: `${orig.name} (copy)`,
      hotspots: orig.hotspots.map(h => ({ ...h, id: genId('hs') })),
      mediaPoints: orig.mediaPoints.map(m => ({ ...m, id: genId('mp') })),
      audioSources: orig.audioSources.map(a => ({ ...a, id: genId('audio') })),
    };
    set((s) => {
      const scenes = [...s.scenes];
      const idx = scenes.findIndex(sc => sc.id === sceneId);
      scenes.splice(idx + 1, 0, copy);
      return { scenes, activeSceneId: newId };
    });
    return newId;
  },

  addSceneTag: (sceneId, tag) =>
    set((s) => ({
      scenes: s.scenes.map(sc =>
        sc.id === sceneId
          ? { ...sc, tags: [...new Set([...(sc.tags ?? []), tag])] }
          : sc,
      ),
    })),

  removeSceneTag: (sceneId, tag) =>
    set((s) => ({
      scenes: s.scenes.map(sc =>
        sc.id === sceneId
          ? { ...sc, tags: (sc.tags ?? []).filter(t => t !== tag) }
          : sc,
      ),
    })),

  // ── Hotspot actions ────────────────────────────────────────────────────────
  addHotspot: (sceneId, yaw, pitch, type) => {
    const id = genId('hs');
    const isVariants = type === 'variants';
    const hotspot: Hotspot = {
      id, yaw, pitch, targetSceneId: '',
      label: isVariants ? 'Design Options' : 'Go to',
      iconStyle: 'arrow',
      ...(isVariants ? { type: 'variants' as const } : {}),
    };
    set((s) => ({
      scenes: s.scenes.map(sc =>
        sc.id === sceneId ? { ...sc, hotspots: [...sc.hotspots, hotspot] } : sc,
      ),
      selectedElementId: id,
      selectedElementType: 'hotspot',
      activeTool: 'none',
    }));
    return id;
  },

  updateHotspot: (sceneId, hotspotId, updates) =>
    set((s) => ({
      scenes: s.scenes.map(sc =>
        sc.id === sceneId
          ? { ...sc, hotspots: sc.hotspots.map(h => h.id === hotspotId ? { ...h, ...updates } : h) }
          : sc,
      ),
    })),

  removeHotspot: (sceneId, hotspotId) =>
    set((s) => ({
      scenes: s.scenes.map(sc =>
        sc.id === sceneId
          ? { ...sc, hotspots: sc.hotspots.filter(h => h.id !== hotspotId) }
          : sc,
      ),
      selectedElementId: null,
      selectedElementType: null,
    })),

  // ── Media point actions ────────────────────────────────────────────────────
  addMediaPoint: (sceneId, yaw, pitch) => {
    const id = genId('mp');
    const mp: MediaPoint = { id, yaw, pitch, type: 'text', title: 'Info', content: '' };
    set((s) => ({
      scenes: s.scenes.map(sc =>
        sc.id === sceneId ? { ...sc, mediaPoints: [...sc.mediaPoints, mp] } : sc,
      ),
      selectedElementId: id,
      selectedElementType: 'media',
      activeTool: 'none',
    }));
    return id;
  },

  updateMediaPoint: (sceneId, mediaId, updates) =>
    set((s) => ({
      scenes: s.scenes.map(sc =>
        sc.id === sceneId
          ? { ...sc, mediaPoints: sc.mediaPoints.map(m => m.id === mediaId ? { ...m, ...updates } : m) }
          : sc,
      ),
    })),

  removeMediaPoint: (sceneId, mediaId) =>
    set((s) => ({
      scenes: s.scenes.map(sc =>
        sc.id === sceneId
          ? { ...sc, mediaPoints: sc.mediaPoints.filter(m => m.id !== mediaId) }
          : sc,
      ),
      selectedElementId: null,
      selectedElementType: null,
    })),

  // ── Audio source actions ───────────────────────────────────────────────────
  addAudioSource: (sceneId) => {
    const id = genId('audio');
    const audio: AudioSource = { id, label: 'Ambient Sound', type: 'ambient', src: '', volume: 0.7, loop: true };
    set((s) => ({
      scenes: s.scenes.map(sc =>
        sc.id === sceneId ? { ...sc, audioSources: [...sc.audioSources, audio] } : sc,
      ),
      selectedElementId: id,
      selectedElementType: 'audio',
    }));
    return id;
  },

  updateAudioSource: (sceneId, audioId, updates) =>
    set((s) => ({
      scenes: s.scenes.map(sc =>
        sc.id === sceneId
          ? { ...sc, audioSources: sc.audioSources.map(a => a.id === audioId ? { ...a, ...updates } : a) }
          : sc,
      ),
    })),

  removeAudioSource: (sceneId, audioId) =>
    set((s) => ({
      scenes: s.scenes.map(sc =>
        sc.id === sceneId
          ? { ...sc, audioSources: sc.audioSources.filter(a => a.id !== audioId) }
          : sc,
      ),
      selectedElementId: null,
      selectedElementType: null,
    })),

  // ── Floor plan actions ─────────────────────────────────────────────────────
  addFloorPlan: (imageUrl, name, level) => {
    const id = genId('fp');
    const existingLevels = get().floorPlans.map(f => f.level);
    const nextLevel = existingLevels.length ? Math.max(...existingLevels) + 1 : 0;
    const fp: FloorPlan = {
      id,
      name: name ?? `Level ${nextLevel}`,
      level: level ?? nextLevel,
      imageUrl,
      markers: [],
    };
    set((s) => ({
      floorPlans: [...s.floorPlans, fp],
      activeFloorPlanId: id,
      isFloorPlanEditing: true,
    }));
    return id;
  },

  removeFloorPlan: (id) =>
    set((s) => {
      const remaining = s.floorPlans.filter(f => f.id !== id);
      return {
        floorPlans: remaining,
        activeFloorPlanId:
          s.activeFloorPlanId === id
            ? (remaining[remaining.length - 1]?.id ?? null)
            : s.activeFloorPlanId,
      };
    }),

  updateFloorPlan: (id, updates) =>
    set((s) => ({
      floorPlans: s.floorPlans.map(fp => fp.id === id ? { ...fp, ...updates } : fp),
    })),

  updateFloorPlanImage: (id, imageUrl) => {
    saveImage(`fp_${id}`, imageUrl);
    set((s) => ({
      floorPlans: s.floorPlans.map(fp => fp.id === id ? { ...fp, imageUrl } : fp),
    }));
  },

  setActiveFloorPlan: (id) => set({ activeFloorPlanId: id }),

  setFloorPlanMarker: (floorPlanId, sceneId, x, y) =>
    set((s) => ({
      floorPlans: s.floorPlans.map(fp => {
        if (fp.id !== floorPlanId) return fp;
        const markers = fp.markers.filter(m => m.sceneId !== sceneId);
        markers.push({ sceneId, x, y });
        return { ...fp, markers };
      }),
    })),

  removeFloorPlanMarker: (floorPlanId, sceneId) =>
    set((s) => ({
      floorPlans: s.floorPlans.map(fp =>
        fp.id !== floorPlanId ? fp : { ...fp, markers: fp.markers.filter(m => m.sceneId !== sceneId) },
      ),
    })),

  // ── Variant hotspot actions ────────────────────────────────────────────────
  setPendingStartView: (v) => set({ pendingStartView: v }),

  syncVariantHotspot: (fromSceneId, hotspotId) => set(s => {
    const fromScene = s.scenes.find(sc => sc.id === fromSceneId);
    const srcHotspot = fromScene?.hotspots.find(h => h.id === hotspotId);
    if (!srcHotspot || !srcHotspot.variantSceneIds?.length) return {};
    // Copy this hotspot to every variant scene that doesn't already have it
    const updatedScenes = s.scenes.map(sc => {
      if (sc.id === fromSceneId) return sc;
      if (!srcHotspot.variantSceneIds!.includes(sc.id)) return sc;
      const existingIdx = sc.hotspots.findIndex(h => h.variantSceneIds && h.variantSceneIds.join() === srcHotspot.variantSceneIds!.join());
      // Always use the source hotspot's ID so the variant panel can find it by the same ID after navigation
      const newHotspot: Hotspot = { ...srcHotspot };
      if (existingIdx >= 0) {
        return { ...sc, hotspots: sc.hotspots.map((h, i) => i === existingIdx ? newHotspot : h) };
      }
      return { ...sc, hotspots: [...sc.hotspots, newHotspot] };
    });
    return { scenes: updatedScenes };
  }),

  // ── UI actions ─────────────────────────────────────────────────────────────
  setActiveTool: (tool) =>
    set((s) => ({
      activeTool: s.activeTool === tool ? 'none' : tool,
      selectedElementId: null,
      selectedElementType: null,
    })),

  setSelectedElement: (type, id) =>
    set({ selectedElementType: type, selectedElementId: id }),

  togglePreviewMode: () =>
    set((s) => ({ isPreviewMode: !s.isPreviewMode, activeTool: 'none' })),

  clearPendingVRMode: () => set({ pendingVRMode: false }),

  publish: () => {
    const state = get();
    const exportData = {
      projectName: state.projectName,
      scenes: state.scenes,
      folders: state.folders,
      floorPlans: state.floorPlans,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(blob);

    // Build a real shareable presentation URL (works on this device/browser)
    const { currentProjectId, currentTourId } = state;
    const presentUrl = currentProjectId && currentTourId
      ? `${window.location.origin}${window.location.pathname}?project=${currentProjectId}&tour=${currentTourId}&mode=present`
      : null;

    set({ publishUrl: presentUrl, publishJsonUrl: jsonUrl, showPublishModal: true });
  },

  closePublishModal: () => set({ showPublishModal: false }),

  setFloorPlanEditing: (v) => set({ isFloorPlanEditing: v }),

  // ── Snapshot actions ───────────────────────────────────────────────────────
  createSnapshot: (name) => {
    const s = get();
    // Capture serializable tour state — exclude blob imageUrls (they won't survive)
    const state = {
      projectName: s.projectName,
      scenes: s.scenes.map(sc => ({ ...sc, imageUrl: '' })),
      folders: s.folders,
      floorPlans: s.floorPlans,
    };
    saveSnapshot(name, state);
  },

  restoreSnapshot: (id) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = getSnapshotData(id) as any;
    if (!data) return;
    set({
      projectName: data.projectName ?? get().projectName,
      scenes: data.scenes ?? get().scenes,
      folders: data.folders ?? get().folders,
      floorPlans: data.floorPlans ?? get().floorPlans,
    });
  },

  // ── Selectors ──────────────────────────────────────────────────────────────
  getActiveScene: () => {
    const { scenes, activeSceneId } = get();
    return scenes.find(s => s.id === activeSceneId) ?? null;
  },

  getScene: (id) => get().scenes.find(s => s.id === id),
}));
