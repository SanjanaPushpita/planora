'use client';

import { useEffect } from 'react';

interface KeyboardOptions {
  onSearch?: () => void;
  onEscape?: () => void;
  onToggleSidebar?: () => void;
  onLearningSprint?: () => void;
  onQuickCapture?: () => void;
}

export function useKeyboard({ onSearch, onEscape, onToggleSidebar, onLearningSprint, onQuickCapture }: KeyboardOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + Space (Quick Capture)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.code === 'Space' || e.key === ' ' || e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        onQuickCapture?.();
        return;
      }

      // Cmd/Ctrl + Shift + L (Learning Sprint)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        onLearningSprint?.();
        return;
      }

      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onSearch?.();
      }

      // Escape
      if (e.key === 'Escape') {
        onEscape?.();
      }

      // Cmd/Ctrl + /
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        onToggleSidebar?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearch, onEscape, onToggleSidebar, onLearningSprint, onQuickCapture]);
}
