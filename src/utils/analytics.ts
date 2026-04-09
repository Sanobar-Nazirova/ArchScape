export interface SceneVisit {
  sceneId: string;
  sceneName: string;
  enteredAt: number;
  durationMs: number;
}

export interface AnalyticsSession {
  id: string;
  startedAt: number;
  endedAt: number;
  visits: SceneVisit[];
}

const STORAGE_KEY = 'archscape_analytics';
const MAX_SESSIONS = 50;

export function loadSessions(): AnalyticsSession[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}

export function saveSession(session: AnalyticsSession): void {
  const sessions = [session, ...loadSessions()].slice(0, MAX_SESSIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function clearAnalytics(): void {
  localStorage.removeItem(STORAGE_KEY);
}
