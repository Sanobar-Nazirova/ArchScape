import React, { useState, useEffect } from 'react';
import { BarChart, X, Trash2 } from 'lucide-react';
import { loadSessions, clearAnalytics, AnalyticsSession } from '../../utils/analytics';

interface AnalyticsModalProps {
  onClose: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AnalyticsModal({ onClose }: AnalyticsModalProps) {
  const [sessions, setSessions] = useState<AnalyticsSession[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const handleClear = () => {
    if (window.confirm('Clear all analytics data? This cannot be undone.')) {
      clearAnalytics();
      setSessions([]);
    }
  };

  // Aggregate visits per scene per session
  function aggregateVisits(session: AnalyticsSession) {
    const map = new Map<string, { sceneName: string; totalMs: number; count: number }>();
    for (const visit of session.visits) {
      const existing = map.get(visit.sceneId);
      if (existing) {
        existing.totalMs += visit.durationMs;
        existing.count += 1;
      } else {
        map.set(visit.sceneId, { sceneName: visit.sceneName, totalMs: visit.durationMs, count: 1 });
      }
    }
    return Array.from(map.values());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div
        className="bg-nm-base border border-nm-border rounded-2xl flex flex-col shadow-2xl"
        style={{ width: 560, maxWidth: '95vw', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-nm-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <BarChart size={18} className="text-nm-accent" />
            <h2 className="text-white font-semibold text-base">Session Analytics</h2>
          </div>
          <button onClick={onClose} className="text-nm-muted hover:text-white transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <BarChart size={40} className="text-nm-muted/40" />
              <p className="text-nm-muted text-sm leading-relaxed max-w-xs">
                No preview sessions recorded yet. Enter preview mode to start tracking.
              </p>
            </div>
          ) : (
            sessions.map(session => {
              const totalMs = session.endedAt > 0 ? session.endedAt - session.startedAt : 0;
              const rows = aggregateVisits(session);
              return (
                <div key={session.id} className="rounded-xl border border-nm-border overflow-hidden">
                  {/* Session header */}
                  <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ background: 'var(--nm-surface)' }}
                  >
                    <span className="text-xs font-medium text-nm-text">{formatDateTime(session.startedAt)}</span>
                    {totalMs > 0 && (
                      <span className="text-[11px] text-nm-muted">
                        Total: {formatDuration(totalMs)}
                      </span>
                    )}
                  </div>

                  {/* Scene table */}
                  {rows.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-nm-border">
                          <th className="text-left px-4 py-2 text-nm-muted font-medium">Scene</th>
                          <th className="text-right px-4 py-2 text-nm-muted font-medium">Time Spent</th>
                          <th className="text-right px-4 py-2 text-nm-muted font-medium">Visits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} className="border-b border-nm-border/50 last:border-0">
                            <td className="px-4 py-2 text-nm-text truncate max-w-[220px]">{row.sceneName}</td>
                            <td className="px-4 py-2 text-nm-muted text-right">{formatDuration(row.totalMs)}</td>
                            <td className="px-4 py-2 text-nm-muted text-right">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="px-4 py-3 text-[11px] text-nm-muted italic">No scene visits recorded.</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {sessions.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-nm-border flex-shrink-0">
            <span className="text-[11px] text-nm-muted">{sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded</span>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
              Clear all data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
