import React, { useEffect, useState } from 'react';
import { useTourStore } from './store/useTourStore';
import HomeScreen from './screens/HomeScreen';
import ProjectScreen from './screens/ProjectScreen';
import EditorScreen from './screens/EditorScreen';
import ResumeScreen from './screens/ResumeScreen';

export default function App() {
  const { currentScreen, openTour, togglePreviewMode } = useTourStore();
  const [showResume, setShowResume] = useState(
    () => new URLSearchParams(window.location.search).get('page') === 'resume',
  );

  // Handle share links: ?project=<id>&tour=<id>&mode=present
  // Handle resume page: ?page=resume
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page      = params.get('page');
    const projectId = params.get('project');
    const tourId    = params.get('tour');
    const mode      = params.get('mode');

    if (page === 'resume') {
      setShowResume(true);
      return;
    }

    if (projectId && tourId) {
      openTour(projectId, tourId);
      if (mode === 'present') setTimeout(() => togglePreviewMode(), 150);
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (showResume)                  return <ResumeScreen />;
  if (currentScreen === 'home')    return <HomeScreen />;
  if (currentScreen === 'project') return <ProjectScreen />;
  return <EditorScreen />;
}
