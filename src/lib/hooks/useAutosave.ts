'use client';

import { useEffect, useRef } from 'react';
import { usePlanner } from '../storage';

export function useAutosave<T>(
  data: T,
  onSave: (data: T) => Promise<void> | void,
  delay: number = 600
) {
  const { setSaveStatus } = usePlanner();
  const latestDataRef = useRef<T>(data);
  const onSaveRef = useRef(onSave);
  const prevSerializedRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);

  latestDataRef.current = data;
  onSaveRef.current = onSave;

  useEffect(() => {
    // Initial assignment
    if (data === null || data === undefined) return;
    
    let currentSerialized = '';
    try {
      currentSerialized = JSON.stringify(data);
    } catch {
      return;
    }

    if (prevSerializedRef.current === null) {
      prevSerializedRef.current = currentSerialized;
      return;
    }

    if (currentSerialized === prevSerializedRef.current) {
      return;
    }

    prevSerializedRef.current = currentSerialized;
    isDirtyRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSaveRef.current(latestDataRef.current);
        isDirtyRef.current = false;
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      } catch (e) {
        console.error('Autosave error:', e);
        setSaveStatus('error');
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, setSaveStatus]);

  // Flush on unmount only if changes were pending
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (isDirtyRef.current) {
        onSaveRef.current(latestDataRef.current);
        isDirtyRef.current = false;
      }
    };
  }, []);
}
