'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { DiseaseProfile, DiseaseStudySession, DiseaseReviewStatus } from '@/lib/types';
import { ExternalDisease } from '@/lib/disease/types';
import { BODY_SYSTEMS, DISEASE_TYPES } from '@/lib/disease/disease-categories';
import {
  fetchDiseaseSearch,
  fetchDiseaseDetails,
  fetchRandomDisease,
} from '@/lib/disease/client';
import { generateId, formatDate } from '@/lib/utils';
import {
  Stethoscope,
  Sparkles,
  Search,
  RotateCcw,
  BookOpen,
  Bookmark,
  Check,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  ExternalLink,
  Info,
  AlertCircle,
  HelpCircle,
  Flame,
  Award,
  Layers,
  ChevronDown,
  ChevronRight,
  Filter,
  X,
  FileText,
  Star,
  Zap,
  ArrowRight,
  Dna,
  Heart,
  Brain,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

const RECENT_DISCOVERY_KEY = 'planora_recent_disease_discoveries';
const STUDY_DRAFT_KEY = 'planora_active_disease_study_draft';
const MAX_RECENT_DISCOVERIES = 50;

export default function DiseaseLabPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    diseaseProfiles,
    diseaseSessions,
    saveDiseaseProfile,
    updateDiseaseProfile,
    saveDiseaseStudySession,
    updateDiseaseStudySession,
    diseaseSaveStatus,
    isReady,
  } = usePlanner();

  // Active view: 'discover' | 'saved'
  const [activeTab, setActiveTab] = useState<'discover' | 'saved'>('discover');

  // Filter selections
  const [selectedBodySystems, setSelectedBodySystems] = useState<string[]>([]);
  const [selectedDiseaseTypes, setSelectedDiseaseTypes] = useState<string[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExternalDisease[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Discovery / Random state
  const [currentDisease, setCurrentDisease] = useState<ExternalDisease | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<{ type: string; message: string } | null>(null);
  const [discoveryStatusText, setDiscoveryStatusText] = useState<string>('');
  const [recentDiscoveries, setRecentDiscoveries] = useState<string[]>([]);

  // Study Mode & Timer State
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [studyProfileId, setStudyProfileId] = useState<string | null>(null);
  const [studySessionId, setStudySessionId] = useState<string | null>(null);
  const [targetDurationSeconds, setTargetDurationSeconds] = useState<number>(1200); // 20m default
  const [startedAtIso, setStartedAtIso] = useState<string>('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [pausedAtEpoch, setPausedAtEpoch] = useState<number | null>(null);
  const [totalPausedMs, setTotalPausedMs] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Study Notes
  const [studyOverview, setStudyOverview] = useState('');
  const [keyFact1, setKeyFact1] = useState('');
  const [keyFact2, setKeyFact2] = useState('');
  const [keyFact3, setKeyFact3] = useState('');
  const [studyExplanation, setStudyExplanation] = useState('');
  const [studyReviewStatus, setStudyReviewStatus] = useState<DiseaseReviewStatus>('learning');
  const [activePromptTab, setActivePromptTab] = useState<'overview' | 'systems' | 'clinical' | 'management'>('overview');

  // Saved Studies Filters
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  const [savedStatusFilter, setSavedStatusFilter] = useState<string>('all');
  const [savedSystemFilter, setSavedSystemFilter] = useState<string>('all');

  // Ref to prevent race conditions in searches & random calls
  const searchRequestIdRef = useRef(0);
  const discoveryRequestIdRef = useRef(0);

  // 1. Load recent discovery exclusions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_DISCOVERY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentDiscoveries(parsed);
        }
      }
    } catch {
      // Storage unavailable or invalid
    }
  }, []);

  // 2. Load active study draft from localStorage
  useEffect(() => {
    try {
      const draftJson = localStorage.getItem(STUDY_DRAFT_KEY);
      if (draftJson) {
        const draft = JSON.parse(draftJson);
        if (draft.sessionId && draft.disease) {
          setCurrentDisease(draft.disease);
          setStudySessionId(draft.sessionId);
          setStudyProfileId(draft.profileId || null);
          setTargetDurationSeconds(draft.targetDurationSeconds || 1200);
          setStartedAtIso(draft.startedAtIso || new Date().toISOString());
          setIsTimerRunning(Boolean(draft.isTimerRunning));
          setIsTimerPaused(Boolean(draft.isTimerPaused));
          setPausedAtEpoch(draft.pausedAtEpoch || null);
          setTotalPausedMs(draft.totalPausedMs || 0);
          setStudyOverview(draft.studyOverview || '');
          setKeyFact1(draft.keyFact1 || '');
          setKeyFact2(draft.keyFact2 || '');
          setKeyFact3(draft.keyFact3 || '');
          setStudyExplanation(draft.studyExplanation || '');
          setStudyReviewStatus(draft.studyReviewStatus || 'learning');
          setIsStudyMode(true);
        }
      }
    } catch {
      // Ignore corrupted draft
    }
  }, []);

  // Track discovered disease in recent history to prevent immediate repeats
  const recordRecentDiscovery = useCallback((externalId: string) => {
    setRecentDiscoveries((prev) => {
      const updated = [externalId, ...prev.filter((id) => id !== externalId)].slice(0, MAX_RECENT_DISCOVERIES);
      try {
        localStorage.setItem(RECENT_DISCOVERY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Fetch full authoritative details for a selected disease
  const loadDiseaseDetails = useCallback(async (id: string) => {
    const currentReqId = ++discoveryRequestIdRef.current;
    setIsDiscovering(true);
    setDiscoveryError(null);
    setDiscoveryStatusText('Loading disease record & enrichment...');

    try {
      const res = await fetchDiseaseDetails(id, { enrich: true });
      if (discoveryRequestIdRef.current === currentReqId) {
        setIsDiscovering(false);
        if (res.ok && res.data) {
          setCurrentDisease(res.data);
          recordRecentDiscovery(res.data.externalId);
          setSearchQuery('');
          setSearchResults([]);
        } else {
          setDiscoveryError({
            type: res.error || 'LOAD_FAILED',
            message: res.message || 'Failed to retrieve authoritative disease details.',
          });
        }
      }
    } catch {
      if (discoveryRequestIdRef.current === currentReqId) {
        setIsDiscovering(false);
        setDiscoveryError({
          type: 'NETWORK_ERROR',
          message: 'Unable to connect to disease service.',
        });
      }
    }
  }, [recordRecentDiscovery]);

  // Open saved profile in study view
  const openSavedProfile = useCallback((profile: DiseaseProfile) => {
    const diseaseObj: ExternalDisease = {
      externalId: profile.do_id || profile.id,
      name: profile.name,
      synonyms: profile.synonyms || [],
      definition: profile.summary || '',
      bodySystems: (profile.body_systems || []) as any,
      diseaseTypes: (profile.disease_types || []) as any,
      source: 'Disease Ontology',
      sourceUrl: profile.sources?.[0]?.url || `https://disease-ontology.org/?id=${profile.do_id}`,
      medlinePlusSummary: profile.summary,
      medlinePlusUrl: profile.medline_plus_url,
      enrichmentStatus: profile.medline_plus_url ? 'enriched' : 'unmatched',
    };

    setCurrentDisease(diseaseObj);
    setStudyProfileId(profile.id);

    const existingSessions = diseaseSessions.filter((s) => s.disease_profile_id === profile.id);
    const lastSession = existingSessions[0];

    if (lastSession) {
      setStudyOverview(lastSession.notes || '');
      setKeyFact1(lastSession.key_facts?.[0] || '');
      setKeyFact2(lastSession.key_facts?.[1] || '');
      setKeyFact3(lastSession.key_facts?.[2] || '');
      setStudyExplanation(lastSession.explanation || '');
      setStudyReviewStatus(lastSession.review_status || profile.review_status || 'learning');
    }

    setActiveTab('discover');
  }, [diseaseSessions]);

  // 3. Handle URL query param (e.g. ?diseaseId=... or ?doid=...)
  useEffect(() => {
    const diseaseIdParam = searchParams.get('diseaseId');
    const doidParam = searchParams.get('doid');

    if (diseaseIdParam && diseaseProfiles.length > 0) {
      const found = diseaseProfiles.find((p) => p.id === diseaseIdParam);
      if (found) {
        openSavedProfile(found);
        return;
      }
    }

    if (doidParam && !currentDisease) {
      loadDiseaseDetails(doidParam);
    }
  }, [searchParams, diseaseProfiles, currentDisease, loadDiseaseDetails, openSavedProfile]);

  // 4. Timer interval with accurate timestamp calculation
  useEffect(() => {
    if (!isStudyMode || !isTimerRunning || isTimerPaused || !startedAtIso) return;

    const interval = setInterval(() => {
      const startMs = new Date(startedAtIso).getTime();
      const nowMs = Date.now();
      const activeMs = Math.max(0, nowMs - startMs - totalPausedMs);
      setElapsedSeconds(Math.floor(activeMs / 1000));
    }, 500);

    return () => clearInterval(interval);
  }, [isStudyMode, isTimerRunning, isTimerPaused, startedAtIso, totalPausedMs]);

  // 5. Persist study draft safely to localStorage
  useEffect(() => {
    if (isStudyMode && currentDisease && studySessionId) {
      const draft = {
        sessionId: studySessionId,
        profileId: studyProfileId,
        disease: currentDisease,
        targetDurationSeconds,
        startedAtIso,
        isTimerRunning,
        isTimerPaused,
        pausedAtEpoch,
        totalPausedMs,
        studyOverview,
        keyFact1,
        keyFact2,
        keyFact3,
        studyExplanation,
        studyReviewStatus,
      };
      try {
        localStorage.setItem(STUDY_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Local storage full
      }
    }
  }, [
    isStudyMode,
    currentDisease,
    studySessionId,
    studyProfileId,
    targetDurationSeconds,
    startedAtIso,
    isTimerRunning,
    isTimerPaused,
    pausedAtEpoch,
    totalPausedMs,
    studyOverview,
    keyFact1,
    keyFact2,
    keyFact3,
    studyExplanation,
    studyReviewStatus,
  ]);

  // Filter toggle helpers
  const toggleBodySystem = (sys: string) => {
    setSelectedBodySystems((prev) =>
      prev.includes(sys) ? prev.filter((s) => s !== sys) : [...prev, sys]
    );
  };

  const toggleDiseaseType = (type: string) => {
    setSelectedDiseaseTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedBodySystems([]);
    setSelectedDiseaseTypes([]);
  };

  // Perform disease search with debounced typing
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const currentReqId = ++searchRequestIdRef.current;
    setIsSearching(true);
    setSearchError(null);

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetchDiseaseSearch(trimmed, { limit: 10, signal: controller.signal });
        if (searchRequestIdRef.current === currentReqId) {
          if (res.ok && res.data) {
            setSearchResults(res.data.results);
          } else {
            setSearchResults([]);
            setSearchError(res.message || 'No matching diseases found');
          }
          setIsSearching(false);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && searchRequestIdRef.current === currentReqId) {
          setIsSearching(false);
          setSearchError('Search request failed. Please check network.');
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  // Discover a disease via Random Selection
  const handleDiscoverDisease = async () => {
    if (isStudyMode) {
      const confirmAbandon = window.confirm(
        'You have an active study session in progress. Discovering another disease will preserve your current study draft in storage. Continue?'
      );
      if (!confirmAbandon) return;
    }

    const currentReqId = ++discoveryRequestIdRef.current;
    setIsDiscovering(true);
    setDiscoveryError(null);
    setDiscoveryStatusText('Consulting Disease Ontology...');

    // Build exclusion list: recent discoveries + already studied/saved disease IDs
    const excludedSet = new Set<string>();
    for (const id of recentDiscoveries) excludedSet.add(id);
    for (const p of diseaseProfiles) {
      if (p.do_id) excludedSet.add(p.do_id);
    }

    try {
      // Simulate accessible progressive status text
      const progressTimer1 = setTimeout(() => {
        if (discoveryRequestIdRef.current === currentReqId) {
          setDiscoveryStatusText('Applying organ system & disease type filters...');
        }
      }, 300);

      const res = await fetchRandomDisease({
        bodySystems: selectedBodySystems.length > 0 ? selectedBodySystems : undefined,
        diseaseTypes: selectedDiseaseTypes.length > 0 ? selectedDiseaseTypes : undefined,
        excludedDiseaseIds: Array.from(excludedSet),
        refillBudget: 2,
        enrich: true,
      });

      clearTimeout(progressTimer1);

      if (discoveryRequestIdRef.current === currentReqId) {
        setIsDiscovering(false);
        if (res.ok && res.disease) {
          setCurrentDisease(res.disease);
          recordRecentDiscovery(res.disease.externalId);
          setIsStudyMode(false);
          setStudySessionId(null);
        } else {
          setDiscoveryError({
            type: res.error || 'DISCOVERY_EXHAUSTED',
            message: res.message || 'No unseen diseases could be discovered matching current criteria.',
          });
        }
      }
    } catch {
      if (discoveryRequestIdRef.current === currentReqId) {
        setIsDiscovering(false);
        setDiscoveryError({
          type: 'NETWORK_ERROR',
          message: 'Network error communicating with Disease Discovery engine.',
        });
      }
    }
  };

  // Save current disease to user's saved profiles
  const handleSaveDiseaseProfile = async () => {
    if (!currentDisease) return;

    // Check if profile already exists by DOID or Name
    const existing = diseaseProfiles.find(
      (p) => (currentDisease.externalId && p.do_id === currentDisease.externalId) || p.name.toLowerCase() === currentDisease.name.toLowerCase()
    );

    const now = new Date().toISOString();
    const profile: DiseaseProfile = {
      id: existing ? existing.id : generateId(),
      name: currentDisease.name,
      synonyms: currentDisease.synonyms || [],
      do_id: currentDisease.externalId,
      medline_plus_id: currentDisease.matchedTopicId,
      medline_plus_url: currentDisease.medlinePlusUrl,
      body_systems: currentDisease.bodySystems || [],
      disease_types: currentDisease.diseaseTypes || [],
      summary: currentDisease.medlinePlusSummary || currentDisease.definition || '',
      sources: [
        {
          title: currentDisease.source,
          url: currentDisease.sourceUrl || `https://disease-ontology.org/?id=${currentDisease.externalId}`,
          note: 'Authoritative ontology classification',
        },
        ...(currentDisease.medlinePlusUrl
          ? [
              {
                title: 'MedlinePlus Topic',
                url: currentDisease.medlinePlusUrl,
                note: 'Consumer health summary & genetics references',
              },
            ]
          : []),
      ],
      is_saved_for_later: true,
      review_status: existing?.review_status || 'learning',
      study_count: existing?.study_count || 0,
      last_studied_at: existing?.last_studied_at || null,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    try {
      const saved = await saveDiseaseProfile(profile);
      setStudyProfileId(saved.id);
    } catch (e) {
      console.error('Failed to save disease profile', e);
    }
  };

  // Launch Study Session
  const handleStartStudy = async () => {
    if (!currentDisease) return;

    // Ensure disease profile is created/saved
    let profileId = studyProfileId;
    const existing = diseaseProfiles.find(
      (p) => (currentDisease.externalId && p.do_id === currentDisease.externalId) || p.name.toLowerCase() === currentDisease.name.toLowerCase()
    );

    if (existing) {
      profileId = existing.id;
    } else {
      const now = new Date().toISOString();
      const newProf = await saveDiseaseProfile({
        id: generateId(),
        name: currentDisease.name,
        synonyms: currentDisease.synonyms || [],
        do_id: currentDisease.externalId,
        medline_plus_id: currentDisease.matchedTopicId,
        medline_plus_url: currentDisease.medlinePlusUrl,
        body_systems: currentDisease.bodySystems || [],
        disease_types: currentDisease.diseaseTypes || [],
        summary: currentDisease.medlinePlusSummary || currentDisease.definition || '',
        sources: [
          {
            title: currentDisease.source,
            url: currentDisease.sourceUrl || `https://disease-ontology.org/?id=${currentDisease.externalId}`,
          },
        ],
        is_saved_for_later: true,
        review_status: 'learning',
        study_count: 0,
        last_studied_at: null,
        created_at: now,
        updated_at: now,
      });
      profileId = newProf.id;
    }

    setStudyProfileId(profileId);

    // Initialize session state
    const newSessionId = generateId();
    setStudySessionId(newSessionId);
    setStartedAtIso(new Date().toISOString());
    setIsTimerRunning(true);
    setIsTimerPaused(false);
    setPausedAtEpoch(null);
    setTotalPausedMs(0);
    setElapsedSeconds(0);
    setIsStudyMode(true);
  };

  // Pause timer
  const handlePauseTimer = () => {
    if (!isTimerPaused) {
      setPausedAtEpoch(Date.now());
      setIsTimerPaused(true);
    }
  };

  // Resume timer
  const handleResumeTimer = () => {
    if (isTimerPaused && pausedAtEpoch) {
      const pausedDuration = Date.now() - pausedAtEpoch;
      setTotalPausedMs((prev) => prev + pausedDuration);
      setPausedAtEpoch(null);
      setIsTimerPaused(false);
    }
  };

  // Reset timer
  const handleResetTimer = () => {
    setStartedAtIso(new Date().toISOString());
    setPausedAtEpoch(null);
    setTotalPausedMs(0);
    setElapsedSeconds(0);
    setIsTimerPaused(false);
  };

  // Set random 15-20m duration
  const handleSetRandomTimer = () => {
    const minutes = Math.floor(Math.random() * 6) + 15; // 15 to 20
    setTargetDurationSeconds(minutes * 60);
    handleResetTimer();
  };

  // Save study session notes
  const handleSaveStudySession = async (isCompleted: boolean = false) => {
    if (!currentDisease || !studySessionId) return;

    const now = new Date().toISOString();
    const keyFacts = [keyFact1.trim(), keyFact2.trim(), keyFact3.trim()].filter(Boolean);

    const session: DiseaseStudySession = {
      id: studySessionId,
      disease_profile_id: studyProfileId || undefined,
      disease_name: currentDisease.name,
      do_id: currentDisease.externalId,
      body_systems: currentDisease.bodySystems || [],
      disease_types: currentDisease.diseaseTypes || [],
      target_duration_seconds: targetDurationSeconds,
      actual_duration_seconds: elapsedSeconds,
      started_at: startedAtIso || now,
      completed_at: isCompleted ? now : undefined,
      questions: [],
      notes: studyOverview,
      key_facts: keyFacts,
      explanation: studyExplanation,
      status: isCompleted ? 'completed' : 'in_progress',
      review_status: studyReviewStatus,
      created_at: now,
      updated_at: now,
    };

    try {
      await saveDiseaseStudySession(session);
      if (isCompleted) {
        // Clear active study draft
        localStorage.removeItem(STUDY_DRAFT_KEY);
        setIsStudyMode(false);
        setStudySessionId(null);
      }
    } catch (e) {
      console.error('Failed to save study session', e);
    }
  };

  // Filtered saved studies list
  const filteredSavedProfiles = useMemo(() => {
    return diseaseProfiles.filter((p) => {
      // Query filter
      if (savedSearchQuery.trim()) {
        const q = savedSearchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDoid = (p.do_id || '').toLowerCase().includes(q);
        const matchSys = (p.body_systems || []).some((s) => s.toLowerCase().includes(q));
        if (!matchName && !matchDoid && !matchSys) return false;
      }
      // Status filter
      if (savedStatusFilter !== 'all') {
        if (p.review_status !== savedStatusFilter) return false;
      }
      // Body system filter
      if (savedSystemFilter !== 'all') {
        if (!(p.body_systems || []).includes(savedSystemFilter)) return false;
      }
      return true;
    });
  }, [diseaseProfiles, savedSearchQuery, savedStatusFilter, savedSystemFilter]);

  // Format seconds into MM:SS
  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Check if current disease is already in user's saved profiles
  const isCurrentDiseaseSaved = useMemo(() => {
    if (!currentDisease) return false;
    return diseaseProfiles.some(
      (p) => (currentDisease.externalId && p.do_id === currentDisease.externalId) || p.name.toLowerCase() === currentDisease.name.toLowerCase()
    );
  }, [currentDisease, diseaseProfiles]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header Banner & Stats Bar                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[var(--bg-paper)]/85 backdrop-blur-xl border border-[var(--border-color)] shadow-glass">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif-aesthetic text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Disease Discovery Lab
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Ontology-grounded medicine discovery, active recall, and structured study studio
              </p>
            </div>
          </div>
        </div>

        {/* Persistence Status & Tabs */}
        <div className="flex items-center gap-2">
          {diseaseSaveStatus === 'saving' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-xs border border-[var(--accent)]/30 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          {diseaseSaveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </div>
          )}
          {diseaseSaveStatus === 'error' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs border border-rose-500/20">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Save error (retained locally)</span>
            </div>
          )}

          {/* Navigation Pill Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)]">
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'discover'
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Discover</span>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'saved'
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Studies</span>
              {diseaseProfiles.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">
                  {diseaseProfiles.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 2. DISCOVER VIEW                                              */}
      {/* ============================================================= */}
      {activeTab === 'discover' && (
        <div className="space-y-6">
          {/* Quick Search & Filter Trigger Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search Input with debounced autocomplete */}
            <div className="md:col-span-2 relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3.5 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search diseases by name, synonym, or DOID (e.g., asthma, alzheimer)..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] shadow-2xs transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {(isSearching || searchResults.length > 0 || searchError) && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-30 p-2 rounded-xl bg-[var(--bg-paper)]/95 backdrop-blur-xl border border-[var(--border-color)] shadow-xl max-h-72 overflow-y-auto">
                  {isSearching && (
                    <div className="flex items-center gap-2 p-3 text-xs text-[var(--text-muted)]">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                      <span>Searching Disease Ontology...</span>
                    </div>
                  )}
                  {searchError && !isSearching && (
                    <div className="p-3 text-xs text-rose-500 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{searchError}</span>
                    </div>
                  )}
                  {searchResults.map((disease) => (
                    <button
                      key={disease.externalId}
                      onClick={() => loadDiseaseDetails(disease.externalId)}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-[var(--bg-paper-hover)] transition-colors flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate">
                          {disease.name}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 truncate">
                          <span className="font-mono text-[10px] text-[var(--accent)] font-semibold">
                            {disease.externalId}
                          </span>
                          {disease.bodySystems?.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{disease.bodySystems.slice(0, 2).join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--bg-paper-subtle)] text-[var(--text-muted)] border border-[var(--border-color)] shrink-0">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Toggle Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilterDrawer((prev) => !prev)}
                className={`flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedBodySystems.length > 0 || selectedDiseaseTypes.length > 0
                    ? 'bg-[var(--accent-soft)] border-[var(--accent)]/40 text-[var(--text-primary)] font-semibold'
                    : 'bg-[var(--bg-paper)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>
                    Category Filters{' '}
                    {selectedBodySystems.length + selectedDiseaseTypes.length > 0 &&
                      `(${selectedBodySystems.length + selectedDiseaseTypes.length})`}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showFilterDrawer ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {(selectedBodySystems.length > 0 || selectedDiseaseTypes.length > 0) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-all"
                  title="Clear all active filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Expandable Category Filter Drawer */}
          {showFilterDrawer && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-paper)]/75 backdrop-blur-xl border border-[var(--border-color)] shadow-glass space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                    Filter Semantics
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Any selected system <span className="font-semibold text-[var(--accent)]">OR</span> any selected type, and{' '}
                    <span className="font-semibold text-[var(--accent)]">AND</span> across both groups.
                  </span>
                </div>
                <button
                  onClick={clearFilters}
                  className="text-xs text-[var(--accent)] hover:underline font-medium"
                >
                  Reset to Any
                </button>
              </div>

              {/* 16 Body Systems */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                  Body Systems ({BODY_SYSTEMS.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {BODY_SYSTEMS.map((system) => {
                    const active = selectedBodySystems.includes(system);
                    return (
                      <button
                        key={system}
                        onClick={() => toggleBodySystem(system)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          active
                            ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] font-semibold shadow-2xs'
                            : 'bg-[var(--bg-paper-subtle)]/60 text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)]'
                        }`}
                      >
                        {system}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 12 Disease Types */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                  Disease Types ({DISEASE_TYPES.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DISEASE_TYPES.map((type) => {
                    const active = selectedDiseaseTypes.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleDiseaseType(type)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          active
                            ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] font-semibold shadow-2xs'
                            : 'bg-[var(--bg-paper-subtle)]/60 text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)]'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Random Discovery Action Hero */}
          <div className="p-6 sm:p-8 rounded-3xl bg-radial from-[var(--accent-soft)]/40 via-[var(--bg-paper)]/90 to-[var(--bg-paper)]/75 backdrop-blur-2xl border border-[var(--accent)]/20 shadow-glass text-center space-y-4">
            <div className="max-w-md mx-auto space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="font-serif-aesthetic text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                {currentDisease ? 'Explore Another Disease' : 'Discover an Authoritative Disease'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Samples authoritatively from Disease Ontology with repeat prevention, category alignment, and optional MedlinePlus enrichment.
              </p>
            </div>

            {/* Discover Trigger Button */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                onClick={handleDiscoverDisease}
                disabled={isDiscovering}
                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{discoveryStatusText || 'Exploring ontology...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{currentDisease ? 'Discover Another Disease' : 'Discover a Disease'}</span>
                  </>
                )}
              </button>

              {currentDisease && !isStudyMode && (
                <button
                  onClick={handleStartStudy}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] text-[var(--text-primary)] font-semibold text-sm border border-[var(--border-color)] transition-all shadow-2xs"
                >
                  <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                  <span>Start Study Session</span>
                </button>
              )}
            </div>

            {/* Discovery Errors / Exhaustion Notice */}
            {discoveryError && (
              <div className="max-w-lg mx-auto p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-left space-y-2 animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 block">
                      {discoveryError.type === 'NO_UNSEEN_DISEASE'
                        ? 'Candidate Pool Exhausted'
                        : discoveryError.type === 'EMPTY_CANDIDATE_POOL'
                        ? 'No Candidates in Category'
                        : 'Discovery Notice'}
                    </span>
                    <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                      {discoveryError.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <button
                    onClick={clearFilters}
                    className="font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    Reset filters to Any
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => {
                      setRecentDiscoveries([]);
                      try {
                        localStorage.removeItem(RECENT_DISCOVERY_KEY);
                      } catch {}
                      handleDiscoverDisease();
                    }}
                    className="font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    Reset recent history
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* --------------------------------------------------------- */}
          {/* 3. DISEASE DETAIL VIEW & STUDY WORKFLOW                   */}
          {/* --------------------------------------------------------- */}
          {currentDisease && (
            <div className="space-y-6 animate-fade-in">
              {/* Detail Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-[var(--bg-paper)]/85 backdrop-blur-xl border border-[var(--border-color)] shadow-glass space-y-5">
                {/* Title & Identifiers */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[var(--border-color)] pb-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30">
                        {currentDisease.externalId}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-medium">
                        {currentDisease.source}
                      </span>
                      {currentDisease.enrichmentStatus === 'enriched' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          MedlinePlus Enriched
                        </span>
                      )}
                    </div>
                    <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                      {currentDisease.name}
                    </h2>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleSaveDiseaseProfile}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        isCurrentDiseaseSaved
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border-[var(--border-color)] text-[var(--text-primary)]'
                      }`}
                    >
                      {isCurrentDiseaseSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Saved in Studies</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Save Disease</span>
                        </>
                      )}
                    </button>

                    {!isStudyMode && (
                      <button
                        onClick={handleStartStudy}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Study</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Categorization Badges */}
                <div className="flex flex-wrap gap-2">
                  {(currentDisease.bodySystems || []).map((sys) => (
                    <span
                      key={sys}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-paper-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)] font-medium flex items-center gap-1"
                    >
                      <Heart className="w-3 h-3 text-[var(--accent)]" />
                      <span>{sys}</span>
                    </span>
                  ))}
                  {(currentDisease.diseaseTypes || []).map((type) => (
                    <span
                      key={type}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-paper-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)] font-medium flex items-center gap-1"
                    >
                      <Dna className="w-3 h-3 text-indigo-500" />
                      <span>{type}</span>
                    </span>
                  ))}
                </div>

                {/* Authoritative Definition */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] font-mono block">
                    Authoritative Ontology Definition
                  </span>
                  <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed italic bg-[var(--bg-paper-subtle)]/50 p-3 rounded-xl border border-[var(--border-color)]/60">
                    {currentDisease.definition || 'Authoritative definition not provided in source ontology.'}
                  </p>
                </div>

                {/* Synonyms */}
                {currentDisease.synonyms && currentDisease.synonyms.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] font-mono block">
                      Synonyms & Alternative Names
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentDisease.synonyms.map((syn) => (
                        <span
                          key={syn}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--bg-paper-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)]/60"
                        >
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attributed MedlinePlus Enrichment Box */}
                {currentDisease.medlinePlusSummary && (
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          MedlinePlus Consumer Health Summary
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono">
                          NLM Official
                        </span>
                      </div>
                      {currentDisease.medlinePlusUrl && (
                        <a
                          href={currentDisease.medlinePlusUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>View on MedlinePlus</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {currentDisease.medlinePlusSummary}
                    </p>
                  </div>
                )}

                {/* External Verification Links & Medical Disclaimer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border-color)]/60 text-xs text-[var(--text-muted)]">
                  <div className="flex items-center gap-3">
                    <a
                      href={`https://disease-ontology.org/?id=${currentDisease.externalId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>DO Official Record</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Educational tool for academic study. Not a clinical diagnosis service.</span>
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------- */}
              {/* STUDY SESSION STUDIO                                  */}
              {/* ----------------------------------------------------- */}
              {isStudyMode && (
                <div className="p-6 sm:p-7 rounded-3xl bg-[var(--bg-paper)]/95 backdrop-blur-xl border border-[var(--accent)]/30 shadow-glass space-y-6 animate-fade-in">
                  {/* Studio Header & Interactive Timer */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[var(--accent)] uppercase">
                          Study Studio Active
                        </span>
                        <span className="opacity-40">•</span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          Structured Active Recall
                        </span>
                      </div>
                      <h3 className="font-serif-aesthetic text-xl font-bold text-[var(--text-primary)]">
                        Deep Dive: {currentDisease.name}
                      </h3>
                    </div>

                    {/* Timer Controls */}
                    <div className="flex items-center gap-3 bg-[var(--bg-paper-subtle)] p-2 rounded-2xl border border-[var(--border-color)]">
                      <div className="text-center px-3">
                        <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">
                          Elapsed / Target
                        </span>
                        <div className="font-mono text-lg font-bold text-[var(--text-primary)] tracking-wider">
                          {formatTimer(elapsedSeconds)} / {formatTimer(targetDurationSeconds)}
                        </div>
                      </div>

                      {/* Timer Actions */}
                      <div className="flex items-center gap-1">
                        {isTimerPaused ? (
                          <button
                            onClick={handleResumeTimer}
                            className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                            title="Resume timer"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        ) : (
                          <button
                            onClick={handlePauseTimer}
                            className="p-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                            title="Pause timer"
                          >
                            <Pause className="w-4 h-4 fill-current" />
                          </button>
                        )}
                        <button
                          onClick={handleResetTimer}
                          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-colors"
                          title="Reset timer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Duration Presets */}
                      <div className="hidden sm:flex items-center gap-1 border-l border-[var(--border-color)] pl-2">
                        <button
                          onClick={() => setTargetDurationSeconds(900)}
                          className={`text-[10px] px-2 py-1 rounded-md font-semibold ${
                            targetDurationSeconds === 900
                              ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                              : 'text-[var(--text-muted)] hover:bg-[var(--bg-paper-hover)]'
                          }`}
                        >
                          15m
                        </button>
                        <button
                          onClick={() => setTargetDurationSeconds(1200)}
                          className={`text-[10px] px-2 py-1 rounded-md font-semibold ${
                            targetDurationSeconds === 1200
                              ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                              : 'text-[var(--text-muted)] hover:bg-[var(--bg-paper-hover)]'
                          }`}
                        >
                          20m
                        </button>
                        <button
                          onClick={handleSetRandomTimer}
                          className="text-[10px] px-2 py-1 rounded-md text-[var(--accent)] hover:bg-[var(--accent-soft)] font-semibold"
                          title="Random 15-20 min sprint"
                        >
                          Surprise
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Guided Research Prompts Accordion */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] font-mono block">
                      Topic-Specific Research Prompts (Tasks for Study)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => setActivePromptTab('overview')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          activePromptTab === 'overview'
                            ? 'bg-[var(--accent-soft)] border-[var(--accent)]/40 text-[var(--text-primary)] font-semibold'
                            : 'bg-[var(--bg-paper-subtle)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]'
                        }`}
                      >
                        <div className="text-xs font-semibold">1. Classification</div>
                        <div className="text-[10px] text-[var(--text-muted)] truncate">Ontology & Etiology</div>
                      </button>
                      <button
                        onClick={() => setActivePromptTab('systems')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          activePromptTab === 'systems'
                            ? 'bg-[var(--accent-soft)] border-[var(--accent)]/40 text-[var(--text-primary)] font-semibold'
                            : 'bg-[var(--bg-paper-subtle)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]'
                        }`}
                      >
                        <div className="text-xs font-semibold">2. Affected Systems</div>
                        <div className="text-[10px] text-[var(--text-muted)] truncate">Organs & Pathology</div>
                      </button>
                      <button
                        onClick={() => setActivePromptTab('clinical')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          activePromptTab === 'clinical'
                            ? 'bg-[var(--accent-soft)] border-[var(--accent)]/40 text-[var(--text-primary)] font-semibold'
                            : 'bg-[var(--bg-paper-subtle)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]'
                        }`}
                      >
                        <div className="text-xs font-semibold">3. Presentation</div>
                        <div className="text-[10px] text-[var(--text-muted)] truncate">Symptoms & Onset</div>
                      </button>
                      <button
                        onClick={() => setActivePromptTab('management')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          activePromptTab === 'management'
                            ? 'bg-[var(--accent-soft)] border-[var(--accent)]/40 text-[var(--text-primary)] font-semibold'
                            : 'bg-[var(--bg-paper-subtle)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]'
                        }`}
                      >
                        <div className="text-xs font-semibold">4. Management</div>
                        <div className="text-[10px] text-[var(--text-muted)] truncate">Interventions & Trials</div>
                      </button>
                    </div>

                    {/* Prompt Content */}
                    <div className="p-3.5 rounded-xl bg-[var(--bg-paper-subtle)]/70 border border-[var(--border-color)] text-xs text-[var(--text-secondary)] leading-relaxed">
                      {activePromptTab === 'overview' && (
                        <div>
                          <strong className="text-[var(--text-primary)]">Research Task:</strong> How is {currentDisease.name} defined and classified in Disease Ontology? What are its primary parent classifications and known subtypes?
                        </div>
                      )}
                      {activePromptTab === 'systems' && (
                        <div>
                          <strong className="text-[var(--text-primary)]">Research Task:</strong> Which specific organ systems (e.g., {currentDisease.bodySystems?.join(', ') || 'primary systems'}) are involved? What molecular or physiological mechanisms drive tissue dysfunction?
                        </div>
                      )}
                      {activePromptTab === 'clinical' && (
                        <div>
                          <strong className="text-[var(--text-primary)]">Research Task:</strong> What are the hallmark diagnostic indicators, typical patient presentations, and conditions that share similar symptoms (differential diagnosis)?
                        </div>
                      )}
                      {activePromptTab === 'management' && (
                        <div>
                          <strong className="text-[var(--text-primary)]">Research Task:</strong> What evidence-based clinical management strategies exist? What open questions or active clinical trials remain in the literature?
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Study Notes & 3 Key Active Recall Facts */}
                  <div className="space-y-4">
                    {/* General Study Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-primary)] block">
                        Study Overview & Pathophysiology Notes
                      </label>
                      <textarea
                        value={studyOverview}
                        onChange={(e) => setStudyOverview(e.target.value)}
                        placeholder="Synthesize your research findings, disease mechanism, and notes here..."
                        rows={4}
                        className="w-full p-3 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] leading-relaxed"
                      />
                    </div>

                    {/* 3 Key Active Recall Facts */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span>3 Key Facts (Active Recall Anchor)</span>
                      </label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={keyFact1}
                          onChange={(e) => setKeyFact1(e.target.value)}
                          placeholder="Fact 1: Key diagnostic or structural feature..."
                          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                        />
                        <input
                          type="text"
                          value={keyFact2}
                          onChange={(e) => setKeyFact2(e.target.value)}
                          placeholder="Fact 2: Hallmark clinical presentation or affected pathway..."
                          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                        />
                        <input
                          type="text"
                          value={keyFact3}
                          onChange={(e) => setKeyFact3(e.target.value)}
                          placeholder="Fact 3: Management approach or prognosis..."
                          className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    </div>

                    {/* In Your Own Words (Feynman Technique) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[var(--text-primary)] block">
                        Feynman Explanation (Explain Simply in Your Own Words)
                      </label>
                      <textarea
                        value={studyExplanation}
                        onChange={(e) => setStudyExplanation(e.target.value)}
                        placeholder="If you had to explain this condition to someone with no medical background in 2 sentences..."
                        rows={2}
                        className="w-full p-3 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] leading-relaxed"
                      />
                    </div>

                    {/* Confidence / Review Rating Selection */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border-color)]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--text-muted)]">
                          Retention Confidence:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setStudyReviewStatus('needs_review')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              studyReviewStatus === 'needs_review'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                : 'bg-[var(--bg-paper)] text-[var(--text-muted)] border-[var(--border-color)]'
                            }`}
                          >
                            Needs Review
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudyReviewStatus('learning')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              studyReviewStatus === 'learning'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-[var(--bg-paper)] text-[var(--text-muted)] border-[var(--border-color)]'
                            }`}
                          >
                            Learning
                          </button>
                          <button
                            type="button"
                            onClick={() => setStudyReviewStatus('comfortable')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              studyReviewStatus === 'comfortable'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-[var(--bg-paper)] text-[var(--text-muted)] border-[var(--border-color)]'
                            }`}
                          >
                            Comfortable
                          </button>
                        </div>
                      </div>

                      {/* Studio Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveStudySession(false)}
                          className="px-4 py-2 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] transition-all"
                        >
                          Save Notes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveStudySession(true)}
                          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete Session</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 4. SAVED STUDIES VIEW                                         */}
      {/* ============================================================= */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          {/* Saved Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--bg-paper)]/85 backdrop-blur-xl border border-[var(--border-color)] shadow-glass">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={savedSearchQuery}
                onChange={(e) => setSavedSearchQuery(e.target.value)}
                placeholder="Search your saved disease library by name, DOID, or organ..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <select
                value={savedStatusFilter}
                onChange={(e) => setSavedStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="needs_review">Needs Review</option>
                <option value="learning">Learning</option>
                <option value="comfortable">Comfortable</option>
              </select>

              {/* System Filter */}
              <select
                value={savedSystemFilter}
                onChange={(e) => setSavedSystemFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none"
              >
                <option value="all">All Systems</option>
                {BODY_SYSTEMS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Saved Profiles Grid */}
          {filteredSavedProfiles.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-[var(--bg-paper)]/60 border border-[var(--border-color)] space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--bg-paper-subtle)] text-[var(--text-muted)] flex items-center justify-center">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
                {diseaseProfiles.length === 0 ? 'No Saved Diseases Yet' : 'No Matches Found'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                {diseaseProfiles.length === 0
                  ? 'Explore the ontology in the Discover tab and save diseases to build your private research and spaced study portfolio.'
                  : 'Try broadening your search term or resetting status and body system filters.'}
              </p>
              {diseaseProfiles.length === 0 && (
                <button
                  onClick={() => setActiveTab('discover')}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
                >
                  Go to Discover
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSavedProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="p-5 rounded-2xl bg-[var(--bg-paper)]/85 backdrop-blur-xl border border-[var(--border-color)] shadow-glass hover:border-[var(--accent)]/40 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2.5">
                    {/* Header: DOID & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20">
                        {profile.do_id || 'DOID'}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          profile.review_status === 'comfortable'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : profile.review_status === 'needs_review'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {profile.review_status === 'comfortable'
                          ? 'Comfortable'
                          : profile.review_status === 'needs_review'
                          ? 'Needs Review'
                          : 'Learning'}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                      {profile.name}
                    </h3>

                    {/* Systems */}
                    {profile.body_systems && profile.body_systems.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {profile.body_systems.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-paper-subtle)] text-[var(--text-secondary)]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Summary Preview */}
                    {profile.summary && (
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {profile.summary}
                      </p>
                    )}
                  </div>

                  {/* Footer & Actions */}
                  <div className="pt-3 border-t border-[var(--border-color)]/60 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <div>
                      <span>{profile.study_count || 0} studies</span>
                      {profile.last_studied_at && (
                        <span className="block text-[10px] text-[var(--text-muted)]">
                          Last: {formatDate(profile.last_studied_at)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => openSavedProfile(profile)}
                      className="flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
                    >
                      <span>Study / Notes</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
