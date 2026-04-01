import React from 'react';
import { useTourStore } from './store/useTourStore';
import HomeScreen from './screens/HomeScreen';
import ProjectScreen from './screens/ProjectScreen';
import EditorScreen from './screens/EditorScreen';

export default function App() {
  const currentScreen = useTourStore(s => s.currentScreen);
  if (currentScreen === 'home')    return <HomeScreen />;
  if (currentScreen === 'project') return <ProjectScreen />;
  return <EditorScreen />;
}
