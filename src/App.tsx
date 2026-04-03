import React, { useEffect } from 'react';
import { useTourStore } from './store/useTourStore';
import HomeScreen from './screens/HomeScreen';
import ProjectScreen from './screens/ProjectScreen';
import EditorScreen from './screens/EditorScreen';

export default function App() {
  const { currentScreen, openTour, togglePreviewMode } = useTourStore();

  // Handle share links: ?project=<id>&tour=<id>&mode=present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    const tourId    = params.get('tour');
    const mode      = params.get('mode');
    if (projectId && tourId) {
      openTour(projectId, tourId);
      if (mode === 'present') setTimeout(() => togglePreviewMode(), 150);
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (currentScreen === 'home')    return <HomeScreen />;
  if (currentScreen === 'project') return <ProjectScreen />;
  return <EditorScreen />;
}
