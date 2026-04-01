import { create } from 'zustand';
import type {
  Scene, Folder, FloorPlan, FloorPlanMarker,
  Hotspot, MediaPoint, AudioSource,
  ToolMode, SelectedElementType,
  PanoramaFormat, MediaType,
} from '../types';

let _idCounter = 0;
const genId = (prefix = 'id') => `${prefix}_${++_idCounter}_${Math.random().toString(36).slice(2, 7)}`;

interface TourState {
  // ── Data ──────────────────────────────────────────────────────────────────
  projectName: string;
  scenes: Scene[];
  folders: Folder[];
  floorPlan: FloorPlan | null;

  // ── UI state ──────────────────────────────────────────────────────────────
  activeSceneId: string | null;
  selectedElementId: string | null;
  selectedElementType: SelectedElementType;
  activeTool: ToolMode;
  isPreviewMode: boolean;
  publishUrl: string | null;
  showPublishModal: boolean;
  isFloorPlanEditing: boolean;

  // ── Scene actions ─────────────────────────────────────────────────────────
  setProjectName: (name: string) => void;
  addScene: (imageUrl: string, name: string, format: PanoramaFormat, mediaType: MediaType, thumbnail?: string) => string;
  removeScene: (id: string) => void;
  renameScene: (id: string, name: string) => void;
  reorderScenes: (activeId: string, overId: string) => void;
  setActiveScene: (id: string | null) => void;
  setSceneFolderId: (sceneId: string, folderId: string | null) => void;
  updateSceneInitialView: (sceneId: string, yaw: number, pitch: number) => void;
  updateSceneFormat: (sceneId: string, format: PanoramaFormat) => void;

  // ── Folder actions ────────────────────────────────────────────────────────
  addFolder: (name: string) => void;
  removeFolder: (id: string) => void;
  renameFolder: (id: string, name: string) => void;
  toggleFolder: (id: string) => void;

  // ── Hotspot actions ───────────────────────────────────────────────────────
  addHotspot: (sceneId: string, yaw: number, pitch: number) => string;
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
  setFloorPlan: (imageUrl: string) => void;
  removeFloorPlan: () => void;
  setFloorPlanMarker: (sceneId: string, x: number, y: number) => void;
  removeFloorPlanMarker: (sceneId: string) => void;

  // ── UI actions ────────────────────────────────────────────────────────────
  setActiveTool: (tool: ToolMode) => void;
  setSelectedElement: (type: SelectedElementType, id: string | null) => void;
  togglePreviewMode: () => void;
  publish: () => void;
  closePublishModal: () => void;
  setFloorPlanEditing: (v: boolean) => void;

  // ── Selectors (helpers, not reactive) ────────────────────────────────────
  getActiveScene: () => Scene | null;
  getScene: (id: string) => Scene | undefined;
}

export const useTourStore = create<TourState>()((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  projectName: 'Untitled Tour',
  scenes: [],
  folders: [],
  floorPlan: null,
  activeSceneId: null,
  selectedElementId: null,
  selectedElementType: null,
  activeTool: 'none',
  isPreviewMode: false,
  publishUrl: null,
  showPublishModal: false,
  isFloorPlanEditing: false,

  // ── Scene actions ─────────────────────────────────────────────────────────
  setProjectName: (name) => set({ projectName: name }),

  addScene: (imageUrl, name, format, mediaType, thumbnail) => {
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
    };
    set((s) => ({
      scenes: [...s.scenes, scene],
      activeSceneId: s.activeSceneId ?? id,
    }));
    return id;
  },

  removeScene: (id) => {
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
      // Remove floor plan marker
      const floorPlan = s.floorPlan
        ? { ...s.floorPlan, markers: s.floorPlan.markers.filter(m => m.sceneId !== id) }
        : null;
      return { scenes: cleanedScenes, activeSceneId, selectedElementId, selectedElementType, floorPlan };
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

  updateSceneFormat: (sceneId, format) =>
    set((s) => ({ scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, format } : sc) })),

  // ── Folder actions ─────────────────────────────────────────────────────────
  addFolder: (name) => {
    const folder: Folder = { id: genId('folder'), name, isExpanded: true };
    set((s) => ({ folders: [...s.folders, folder] }));
  },

  removeFolder: (id) =>
    set((s) => ({
      folders: s.folders.filter(f => f.id !== id),
      scenes: s.scenes.map(sc => sc.folderId === id ? { ...sc, folderId: null } : sc),
    })),

  renameFolder: (id, name) =>
    set((s) => ({ folders: s.folders.map(f => f.id === id ? { ...f, name } : f) })),

  toggleFolder: (id) =>
    set((s) => ({ folders: s.folders.map(f => f.id === id ? { ...f, isExpanded: !f.isExpanded } : f) })),

  // ── Hotspot actions ────────────────────────────────────────────────────────
  addHotspot: (sceneId, yaw, pitch) => {
    const id = genId('hs');
    const hotspot: Hotspot = { id, yaw, pitch, targetSceneId: '', label: 'Go to', iconStyle: 'arrow' };
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
  setFloorPlan: (imageUrl) =>
    set((s) => ({
      floorPlan: { imageUrl, markers: s.floorPlan?.markers ?? [] },
      isFloorPlanEditing: true,
    })),

  removeFloorPlan: () => set({ floorPlan: null }),

  setFloorPlanMarker: (sceneId, x, y) =>
    set((s) => {
      if (!s.floorPlan) return {};
      const markers: FloorPlanMarker[] = s.floorPlan.markers.filter(m => m.sceneId !== sceneId);
      markers.push({ sceneId, x, y });
      return { floorPlan: { ...s.floorPlan, markers } };
    }),

  removeFloorPlanMarker: (sceneId) =>
    set((s) => ({
      floorPlan: s.floorPlan
        ? { ...s.floorPlan, markers: s.floorPlan.markers.filter(m => m.sceneId !== sceneId) }
        : null,
    })),

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

  publish: () => {
    const state = get();
    const exportData = {
      projectName: state.projectName,
      scenes: state.scenes,
      folders: state.folders,
      floorPlan: state.floorPlan,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    set({ publishUrl: url, showPublishModal: true });
  },

  closePublishModal: () => set({ showPublishModal: false }),

  setFloorPlanEditing: (v) => set({ isFloorPlanEditing: v }),

  // ── Selectors ──────────────────────────────────────────────────────────────
  getActiveScene: () => {
    const { scenes, activeSceneId } = get();
    return scenes.find(s => s.id === activeSceneId) ?? null;
  },

  getScene: (id) => get().scenes.find(s => s.id === id),
}));
