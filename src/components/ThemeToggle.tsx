import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTourStore } from '../store/useTourStore';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTourStore();
  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-9 h-9 flex items-center justify-center rounded-nm-sm text-nm-muted hover:text-nm-text transition-all ${className}`}
      style={{ boxShadow: '3px 3px 8px var(--sh-d), -2px -2px 5px var(--sh-l)' }}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
