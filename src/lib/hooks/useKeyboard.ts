'use client';

import { useEffect } from 'react';

interface KeyboardOptions {
  onSearch?: () => void;
  onEscape?: () => void;
  onToggleSidebar?: () => void;
}

export function useKeyboard({ onSearch, onEscape, onToggleSidebar }: KeyboardOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [onSearch, onEscape, onToggleSidebar]);
}
