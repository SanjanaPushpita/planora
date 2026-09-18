'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePlanner } from '../storage';

export function useAutosave<T>(
  data: T,
  onSave: (data: T) => Promise<void> | void,
  delay: number = 600
) {
  const { setSaveStatus } = usePlanner();
  const latestDataRef = useRef<T>(data);
  const isInitialMount = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  latestDataRef.current = data;

  const save = useCallback(async () => {
    setSaveStatus('saving');
    try {
      await onSave(latestDataRef.current);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1800);
    } catch (e) {
      console.error('Autosave error:', e);
      setSaveStatus('error');
    }
  }, [onSave, setSaveStatus]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setSaveStatus('saving');
    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, save, setSaveStatus]);

  // Flush on unmount to prevent losing data when switching pages
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        onSave(latestDataRef.current);
      }
    };
  }, [onSave]);
}
