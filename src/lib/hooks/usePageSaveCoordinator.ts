'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PlannerPage, PageBlock, SaveState, PageDraft } from '../types';
import { draftStore } from '../storage/draft-store';
import { usePlanner } from '../storage';

interface SaveCoordinatorParams {
  initialPage: PlannerPage;
  initialBlocks: PageBlock[];
  onPersist: (page: PlannerPage, blocks: PageBlock[]) => Promise<void>;
}

export function usePageSaveCoordinator({
  initialPage,
  initialBlocks,
  onPersist,
}: SaveCoordinatorParams) {
  const { setSaveStatus: setGlobalSaveStatus } = usePlanner();

  // Primary active UI state
  const [page, setPage] = useState<PlannerPage>(initialPage);
  const [blocks, setBlocks] = useState<PageBlock[]>(initialBlocks);
  const [saveState, setSaveState] = useState<SaveState>('SAVED');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(new Date(initialPage.updated_at || Date.now()));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveredDraft, setRecoveredDraft] = useState<boolean>(false);

  // Mutable refs to prevent stale closures during async operations
  const pageRef = useRef<PlannerPage>(initialPage);
  const blocksRef = useRef<PageBlock[]>(initialBlocks);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const versionRef = useRef<number>(0);
  const isSavingRef = useRef<boolean>(false);
  const onPersistRef = useRef(onPersist);

  pageRef.current = page;
  blocksRef.current = blocks;
  onPersistRef.current = onPersist;

  // Sync global header status
  const updateStatus = useCallback((state: SaveState) => {
    setSaveState(state);
    if (state === 'SAVING') setGlobalSaveStatus('saving');
    else if (state === 'SAVED') setGlobalSaveStatus('saved');
    else if (state === 'ERROR') setGlobalSaveStatus('error');
    else setGlobalSaveStatus('idle');
  }, [setGlobalSaveStatus]);

  // Initial Check: Draft Recovery
  useEffect(() => {
    const pageId = initialPage.id;
    if (draftStore.hasNewerDraft(pageId, initialPage.updated_at)) {
      const draft = draftStore.getDraft(pageId);
      if (draft && draft.blocks && draft.blocks.length > 0) {
        console.log(`[Planora] Recovering newer local draft for page ${pageId}`);
        setPage((prev) => ({
          ...prev,
          title: draft.title || prev.title,
          icon: draft.icon || prev.icon,
          date: draft.date || prev.date,
        }));
        setBlocks(draft.blocks);
        pageRef.current = {
          ...pageRef.current,
          title: draft.title || pageRef.current.title,
          icon: draft.icon || pageRef.current.icon,
          date: draft.date || pageRef.current.date,
        };
        blocksRef.current = draft.blocks;
        setRecoveredDraft(true);
        setIsDirty(true);
        updateStatus('UNSAVED');
      }
    }
  }, [initialPage.id, initialPage.updated_at, updateStatus]);

  // Perform the actual persistent write
  const performSave = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Check offline status
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      // Keep in local draft
      draftStore.saveDraft({
        pageId: pageRef.current.id,
        title: pageRef.current.title,
        icon: pageRef.current.icon,
        date: pageRef.current.date,
        blocks: blocksRef.current,
        updatedAt: Date.now(),
        version: versionRef.current,
      });
      updateStatus('OFFLINE');
      return;
    }

    versionRef.current += 1;
    const currentVersion = versionRef.current;
    isSavingRef.current = true;
    updateStatus('SAVING');
    setErrorMessage(null);

    const snapshotPage = { ...pageRef.current, updated_at: new Date().toISOString() };
    const snapshotBlocks = [...blocksRef.current];

    try {
      await onPersistRef.current(snapshotPage, snapshotBlocks);

      // Race condition check: Only mark saved if no newer write started in between
      if (currentVersion === versionRef.current) {
        draftStore.clearDraft(snapshotPage.id);
        isSavingRef.current = false;
        setIsDirty(false);
        setLastSavedAt(new Date());
        updateStatus('SAVED');
      }
    } catch (err: any) {
      console.error('[Planora Save Error]', err);
      // If failed, retain content locally in draft store
      draftStore.saveDraft({
        pageId: snapshotPage.id,
        title: snapshotPage.title,
        icon: snapshotPage.icon,
        date: snapshotPage.date,
        blocks: snapshotBlocks,
        updatedAt: Date.now(),
        version: currentVersion,
      });

      if (currentVersion === versionRef.current) {
        isSavingRef.current = false;
        setErrorMessage(err?.message || 'Failed to save changes');
        updateStatus('ERROR');
      }
    }
  }, [updateStatus]);

  // Record a change (Keystroke, task toggle, block edit)
  const recordChange = useCallback((
    updatedPage?: Partial<PlannerPage>,
    updatedBlocks?: PageBlock[]
  ) => {
    const newPage = updatedPage ? { ...pageRef.current, ...updatedPage } : pageRef.current;
    const newBlocks = updatedBlocks ? updatedBlocks : blocksRef.current;

    // 1. Immediately update React state
    if (updatedPage) setPage(newPage);
    if (updatedBlocks) setBlocks(newBlocks);
    pageRef.current = newPage;
    blocksRef.current = newBlocks;

    // 2. LAYER 1: Instant Local Draft Backup (< 2ms synchronous write)
    versionRef.current += 1;
    draftStore.saveDraft({
      pageId: newPage.id,
      title: newPage.title,
      icon: newPage.icon,
      date: newPage.date,
      blocks: newBlocks,
      updatedAt: Date.now(),
      version: versionRef.current,
    });

    setIsDirty(true);

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    updateStatus(isOnline ? 'UNSAVED' : 'OFFLINE');

    // 3. LAYER 2: Reset 800ms debounce timer for database save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, 800);
  }, [performSave, updateStatus]);

  // Manual save trigger (Save button or Ctrl+S)
  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await performSave();
  }, [performSave]);

  // Keyboard shortcut: Ctrl + S / Cmd + S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveNow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveNow]);

  // Browser close / tab refresh / beforeunload safety
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        // Ensure latest local draft is synchronously written
        draftStore.saveDraft({
          pageId: pageRef.current.id,
          title: pageRef.current.title,
          icon: pageRef.current.icon,
          date: pageRef.current.date,
          blocks: blocksRef.current,
          updatedAt: Date.now(),
          version: versionRef.current,
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Online / Offline network listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Planora] Network online detected');
      if (isDirty) {
        performSave();
      } else {
        updateStatus('SAVED');
      }
    };

    const handleOffline = () => {
      console.log('[Planora] Network offline detected');
      updateStatus('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isDirty, performSave, updateStatus]);

  // Flush pending save on unmount (e.g. user navigates to another page)
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (pageRef.current && isDirty) {
        // Synchronously safeguard local draft
        draftStore.saveDraft({
          pageId: pageRef.current.id,
          title: pageRef.current.title,
          icon: pageRef.current.icon,
          date: pageRef.current.date,
          blocks: blocksRef.current,
          updatedAt: Date.now(),
          version: versionRef.current,
        });
        // Also trigger async persist
        onPersistRef.current(pageRef.current, blocksRef.current).catch((err) => {
          console.error('[Planora Navigation Flush error]', err);
        });
      }
    };
  }, [isDirty]);

  const dismissRecoveredAlert = () => {
    setRecoveredDraft(false);
  };

  return {
    page,
    blocks,
    saveState,
    isDirty,
    lastSavedAt,
    errorMessage,
    recoveredDraft,
    recordChange,
    saveNow,
    dismissRecoveredAlert,
    setPage,
    setBlocks,
  };
}
