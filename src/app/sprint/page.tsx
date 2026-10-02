'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { 
  LearningSprint, 
  LearningSource, 
  LearningWord, 
  LearningDifficulty 
} from '@/lib/types';
import { 
  LEARNING_CATEGORIES, 
  LearningCategory, 
  CATEGORY_ICONS, 
  CuratedTopic, 
  CURATED_TOPICS, 
  getRandomTopic, 
  getDailyCuriosityTopic 
} from '@/lib/learning-topics';
import { generateId, formatDate, formatDuration, getTodayDateString } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { 
  Sparkles, 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Plus, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  RotateCcw, 
  BookOpen, 
  Lightbulb, 
  HelpCircle, 
  Flame, 
  Trash2, 
  Star, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  X, 
  SlidersHorizontal,
  Bookmark,
  Share2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';

const SPRINT_STORAGE_KEY = 'planora_active_learning_sprint';
const SEEN_TOPICS_KEY = 'planora_learning_seen_topics';

function LearningSprintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    learningSprints, 
    saveLearningSprint, 
    deleteLearningSprint, 
    updateLearningSprint, 
    learningSaveStatus,
    saveVocabularyItem 
  } = usePlanner();

  // Mode: 'setup' | 'active' | 'completed_summary'
  const [mode, setMode] = useState<'setup' | 'active' | 'completed_summary'>('setup');

  // Setup state
  const [selectedCategory, setSelectedCategory] = useState<string>('Surprise Me');
  const [selectedDifficulty, setSelectedDifficulty] = useState<LearningDifficulty>('mixed');
  const [currentTopic, setCurrentTopic] = useState<CuratedTopic>(() => getRandomTopic());
  const [isCustomTopicModalOpen, setIsCustomTopicModalOpen] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [customCategoryInput, setCustomCategoryInput] = useState('General Knowledge');
  const [sprintDurationMinutes, setSprintDurationMinutes] = useState<number>(15);
  const [customDurationInput, setCustomDurationInput] = useState('15');
  const [isCustomDurationModalOpen, setIsCustomDurationModalOpen] = useState(false);

  // Active Sprint state
  const [sprintId, setSprintId] = useState<string>('');
  const [sprintTopic, setSprintTopic] = useState<string>('');
  const [sprintCategory, setSprintCategory] = useState<string>('General Knowledge');
  const [sprintDifficulty, setSprintDifficulty] = useState<LearningDifficulty>('medium');
  const [targetDurationSeconds, setTargetDurationSeconds] = useState<number>(900);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [startedAtIso, setStartedAtIso] = useState<string>('');
  
  // Research workspace state
  const [keyQuestions, setKeyQuestions] = useState<string[]>(['', '']);
  const [notes, setNotes] = useState<string>('');
  const [sources, setSources] = useState<LearningSource[]>([]);
  const [keyPoint1, setKeyPoint1] = useState<string>('');
  const [keyPoint2, setKeyPoint2] = useState<string>('');
  const [keyPoint3, setKeyPoint3] = useState<string>('');
  const [newWords, setNewWords] = useState<LearningWord[]>([]);
  const [confusions, setConfusions] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [explainItBack, setExplainItBack] = useState<string>('');
  const [isFocusRecallMode, setIsFocusRecallMode] = useState<boolean>(false);

  // Modals & temporary inputs
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceNote, setNewSourceNote] = useState('');
  
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
  const [newWordText, setNewWordText] = useState('');
  const [newWordMeaning, setNewWordMeaning] = useState('');
  const [newWordExample, setNewWordExample] = useState('');

  const [isFinishEarlyConfirmOpen, setIsFinishEarlyConfirmOpen] = useState(false);
  const [completedSprint, setCompletedSprint] = useState<LearningSprint | null>(null);
  const [hasShownTimeUpPrompt, setHasShownTimeUpPrompt] = useState(false);
  const [vocabSavedNotifs, setVocabSavedNotifs] = useState<Record<string, boolean>>({});

  // 1. Check URL query parameters for direct launch (e.g. from Dashboard)
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    const categoryParam = searchParams.get('category');
    const durationParam = searchParams.get('duration');

    if (topicParam && mode === 'setup') {
      const found = CURATED_TOPICS.find(t => t.topic.toLowerCase() === topicParam.toLowerCase());
      if (found) {
        setCurrentTopic(found);
      } else {
        setCurrentTopic({
          id: `custom-${generateId()}`,
          topic: topicParam,
          category: categoryParam || 'General Knowledge',
          difficulty: 'medium',
          description: 'Custom topic selected for learning sprint.',
          starterQuestions: ['What are the fundamental principles of this topic?', 'How does it work in practice?'],
          suggestedSearchQueries: [topicParam],
        });
      }
      if (categoryParam) setSelectedCategory(categoryParam);
      if (durationParam) {
        const mins = parseInt(durationParam, 10);
        if (mins > 0) setSprintDurationMinutes(mins);
      }
    }
  }, [searchParams, mode]);

  // 2. Recover active sprint from localStorage if present
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SPRINT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sprintId && parsed.status === 'in_progress') {
          setSprintId(parsed.sprintId);
          setSprintTopic(parsed.topic);
          setSprintCategory(parsed.category);
          setSprintDifficulty(parsed.difficulty || 'medium');
          setTargetDurationSeconds(parsed.targetDurationSeconds || 900);
          setStartedAtIso(parsed.startedAt || new Date().toISOString());
          setKeyQuestions(parsed.keyQuestions || ['', '']);
          setNotes(parsed.notes || '');
          setSources(parsed.sources || []);
          setKeyPoint1(parsed.keyPoints?.[0] || '');
          setKeyPoint2(parsed.keyPoints?.[1] || '');
          setKeyPoint3(parsed.keyPoints?.[2] || '');
          setNewWords(parsed.newWords || []);
          setConfusions(parsed.confusions || '');
          setExplanation(parsed.explanation || '');
          setExplainItBack(parsed.explainItBack || '');

          setIsTimerRunning(Boolean(parsed.isTimerRunning));
          setIsTimerPaused(Boolean(parsed.isTimerPaused));

          if (parsed.isTimerPaused) {
            setElapsedSeconds(parsed.accumulatedSeconds || 0);
          } else if (parsed.isTimerRunning) {
            const now = Date.now();
            const startedAt = parsed.timerStartedAt || now;
            const diffSec = Math.floor((now - startedAt) / 1000);
            setElapsedSeconds((parsed.accumulatedSeconds || 0) + Math.max(0, diffSec));
          } else {
            setElapsedSeconds(parsed.accumulatedSeconds || 0);
          }

          setMode('active');
        }
      }
    } catch (e) {
      console.error('Error recovering active sprint:', e);
    }
  }, []);

  // 3. Interval timer tick using wall-clock time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (mode === 'active' && isTimerRunning && !isTimerPaused) {
      interval = setInterval(() => {
        try {
          const saved = localStorage.getItem(SPRINT_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            const now = Date.now();
            const startedAt = parsed.timerStartedAt || now;
            const diffSec = Math.floor((now - startedAt) / 1000);
            setElapsedSeconds((parsed.accumulatedSeconds || 0) + Math.max(0, diffSec));
          } else {
            setElapsedSeconds(prev => prev + 1);
          }
        } catch {
          setElapsedSeconds(prev => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, isTimerRunning, isTimerPaused]);

  // 4. Persist active sprint snapshot to localStorage
  const syncActiveSprintDraft = (overrides?: Record<string, any>) => {
    if (mode !== 'active' && !overrides) return;
    try {
      const state = {
        sprintId,
        topic: sprintTopic,
        category: sprintCategory,
        difficulty: sprintDifficulty,
        status: 'in_progress',
        targetDurationSeconds,
        startedAt: startedAtIso,
        keyQuestions,
        notes,
        sources,
        keyPoints: [keyPoint1, keyPoint2, keyPoint3].filter(Boolean),
        newWords,
        confusions,
        explanation,
        explainItBack,
        isTimerRunning,
        isTimerPaused,
        accumulatedSeconds: elapsedSeconds,
        timerStartedAt: Date.now(),
        ...overrides,
      };
      localStorage.setItem(SPRINT_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error syncing sprint draft:', e);
    }
  };

  useEffect(() => {
    if (mode === 'active') {
      syncActiveSprintDraft();
    }
  }, [
    mode, 
    sprintId, 
    sprintTopic, 
    sprintCategory, 
    sprintDifficulty, 
    targetDurationSeconds, 
    startedAtIso, 
    keyQuestions, 
    notes, 
    sources, 
    keyPoint1, 
    keyPoint2, 
    keyPoint3, 
    newWords, 
    confusions, 
    explanation, 
    explainItBack
  ]);

  // 5. Pick next random topic with no-repeat tracking
  const handleGetAnotherTopic = () => {
    try {
      const seenRaw = localStorage.getItem(SEEN_TOPICS_KEY);
      const seenIds: string[] = seenRaw ? JSON.parse(seenRaw) : [];
      
      const next = getRandomTopic({
        category: selectedCategory,
        difficulty: selectedDifficulty,
        excludeIds: [...seenIds, currentTopic.id],
      });

      setCurrentTopic(next);

      // Save to seen list (keep last 30)
      const updatedSeen = [...seenIds.filter(id => id !== next.id), next.id].slice(-30);
      localStorage.setItem(SEEN_TOPICS_KEY, JSON.stringify(updatedSeen));
    } catch {
      setCurrentTopic(getRandomTopic({ category: selectedCategory, difficulty: selectedDifficulty }));
    }
  };

  // 6. Start Learning Sprint
  const handleStartSprint = (customTopicObj?: CuratedTopic) => {
    const topicObj = customTopicObj || currentTopic;
    const newId = generateId();
    const nowIso = new Date().toISOString();
    const durationSec = sprintDurationMinutes * 60;

    setSprintId(newId);
    setSprintTopic(topicObj.topic);
    setSprintCategory(topicObj.category);
    setSprintDifficulty(topicObj.difficulty || 'medium');
    setTargetDurationSeconds(durationSec);
    setElapsedSeconds(0);
    setStartedAtIso(nowIso);
    setIsTimerRunning(true);
    setIsTimerPaused(false);
    setHasShownTimeUpPrompt(false);

    // Populate starter questions if available
    if (topicObj.starterQuestions && topicObj.starterQuestions.length > 0) {
      setKeyQuestions([...topicObj.starterQuestions]);
    } else {
      setKeyQuestions(['What is the core idea?', 'Why does this matter?']);
    }

    setNotes('');
    setSources([]);
    setKeyPoint1('');
    setKeyPoint2('');
    setKeyPoint3('');
    setNewWords([]);
    setConfusions('');
    setExplanation('');
    setExplainItBack('');
    setIsFocusRecallMode(false);

    setMode('active');

    // Save active state to storage
    syncActiveSprintDraft({
      sprintId: newId,
      topic: topicObj.topic,
      category: topicObj.category,
      difficulty: topicObj.difficulty || 'medium',
      status: 'in_progress',
      targetDurationSeconds: durationSec,
      startedAt: nowIso,
      isTimerRunning: true,
      isTimerPaused: false,
      accumulatedSeconds: 0,
      timerStartedAt: Date.now(),
    });
  };

  // Timer controls
  const handlePauseTimer = () => {
    setIsTimerPaused(true);
    syncActiveSprintDraft({
      isTimerRunning: true,
      isTimerPaused: true,
      accumulatedSeconds: elapsedSeconds,
      timerStartedAt: null,
    });
  };

  const handleResumeTimer = () => {
    setIsTimerPaused(false);
    syncActiveSprintDraft({
      isTimerRunning: true,
      isTimerPaused: false,
      accumulatedSeconds: elapsedSeconds,
      timerStartedAt: Date.now(),
    });
  };

  const handleAddFiveMinutes = () => {
    setTargetDurationSeconds(prev => prev + 300);
    setHasShownTimeUpPrompt(false);
    syncActiveSprintDraft({
      targetDurationSeconds: targetDurationSeconds + 300,
    });
  };

  // 7. Complete Learning Sprint
  const handleCompleteSprint = async () => {
    const finalKeyPoints = [keyPoint1, keyPoint2, keyPoint3].filter(p => p.trim().length > 0);
    const completedAt = new Date().toISOString();

    const sprintRecord: LearningSprint = {
      id: sprintId,
      topic: sprintTopic,
      category: sprintCategory,
      difficulty: sprintDifficulty,
      status: 'completed',
      target_duration_seconds: targetDurationSeconds,
      actual_duration_seconds: Math.max(1, elapsedSeconds),
      started_at: startedAtIso || new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      completed_at: completedAt,
      notes: notes || '<p>Sprint completed.</p>',
      key_questions: keyQuestions.filter(q => q.trim().length > 0),
      key_points: finalKeyPoints,
      new_words: newWords,
      confusions: confusions.trim() || undefined,
      explanation: explanation.trim() || undefined,
      explain_it_back: explainItBack.trim() || undefined,
      sources: sources,
      created_at: startedAtIso || completedAt,
      updated_at: completedAt,
    };

    try {
      await saveLearningSprint(sprintRecord);
    } catch (e) {
      console.error('Error saving learning sprint:', e);
    }

    // Clean up active sprint from localStorage
    localStorage.removeItem(SPRINT_STORAGE_KEY);

    setCompletedSprint(sprintRecord);
    setMode('completed_summary');
    setIsFinishEarlyConfirmOpen(false);
  };

  // Add Source handler
  const handleSaveSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceTitle.trim() || !newSourceUrl.trim()) return;

    let formattedUrl = newSourceUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const sourceObj: LearningSource = {
      id: generateId(),
      sprint_id: sprintId,
      title: newSourceTitle.trim(),
      url: formattedUrl,
      note: newSourceNote.trim() || undefined,
    };

    setSources(prev => [...prev, sourceObj]);
    setNewSourceTitle('');
    setNewSourceUrl('');
    setNewSourceNote('');
    setIsAddSourceModalOpen(false);
  };

  // Add Word handler
  const handleSaveWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordText.trim() || !newWordMeaning.trim()) return;

    const wordObj: LearningWord = {
      word: newWordText.trim(),
      meaning: newWordMeaning.trim(),
      example: newWordExample.trim() || undefined,
    };

    setNewWords(prev => [...prev, wordObj]);
    setNewWordText('');
    setNewWordMeaning('');
    setNewWordExample('');
    setIsAddWordModalOpen(false);
  };

  // Save single word to vocabulary vault
  const handleSaveWordToVocabulary = async (w: LearningWord) => {
    try {
      await saveVocabularyItem({
        id: `voc-${w.word.toLowerCase().replace(/\s+/g, '-')}`,
        source_sprint_id: sprintId,
        word: w.word,
        meaning: w.meaning,
        example: w.example,
        category: sprintCategory,
        tags: [sprintCategory.toLowerCase().replace(/\s+/g, '-')],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setVocabSavedNotifs(prev => ({ ...prev, [w.word]: true }));
      setTimeout(() => {
        setVocabSavedNotifs(prev => ({ ...prev, [w.word]: false }));
      }, 2500);
    } catch (e) {
      console.error('Error saving vocabulary item:', e);
    }
  };

  // Quick Web Search button handler (opens clean search in new tab)
  const handleQuickWebSearch = () => {
    const query = currentTopic?.suggestedSearchQueries?.[0] || sprintTopic;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Learning statistics calculations
  const stats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let weekCount = 0;
    let monthCount = 0;
    let totalMinutes = 0;
    const topicsSet = new Set<string>();
    const categoryCounts: Record<string, number> = {};

    for (const s of learningSprints) {
      const sDate = new Date(s.created_at);
      if (sDate >= startOfWeek) weekCount++;
      if (sDate >= startOfMonth) monthCount++;

      const mins = Math.round(s.actual_duration_seconds / 60);
      totalMinutes += mins;
      topicsSet.add(s.topic.toLowerCase().trim());

      const cat = s.category || 'General Knowledge';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    let topCategory = 'General Knowledge';
    let topCatCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > topCatCount) {
        topCatCount = count;
        topCategory = cat;
      }
    }

    return {
      weekCount,
      monthCount,
      totalMinutes,
      totalHoursStr: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      topicsCount: topicsSet.size,
      topCategory,
      totalSprints: learningSprints.length,
    };
  }, [learningSprints]);

  // Timer math
  const remainingSec = Math.max(0, targetDurationSeconds - elapsedSeconds);
  const isTimeUp = elapsedSeconds >= targetDurationSeconds;

  // -------------------------------------------------------------
  // RENDER: 1. SETUP VIEW
  // -------------------------------------------------------------
  if (mode === 'setup') {
    return (
      <div className="space-y-8 max-w-4xl mx-auto pb-16">
        {/* Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-lg shadow-xs">
                💡
              </span>
              <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                Learning Sprint
              </h2>
            </div>
            <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)] mt-1">
              Pick a topic, start the clock, and learn something new in 15 minutes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/vault')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] transition-colors shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Open Knowledge Vault</span>
            </button>
          </div>
        </div>

        {/* Category Chips Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Choose a Category
            </span>
            {/* Difficulty Selector */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] text-[var(--text-muted)] mr-1">Difficulty:</span>
              {(['mixed', 'easy', 'medium', 'advanced'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => {
                    setSelectedDifficulty(d);
                    const next = getRandomTopic({ category: selectedCategory, difficulty: d });
                    setCurrentTopic(next);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] capitalize transition-colors ${
                    selectedDifficulty === d
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-semibold shadow-2xs'
                      : 'bg-[var(--bg-paper-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
            {LEARNING_CATEGORIES.map(cat => {
              const icon = CATEGORY_ICONS[cat] || '💡';
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    const next = getRandomTopic({ category: cat, difficulty: selectedDifficulty });
                    setCurrentTopic(next);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs transition-all ${
                    isSelected
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-medium shadow-xs scale-102'
                      : 'bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Topic Selection Card */}
        <div className="journal-paper p-6 sm:p-8 rounded-3xl border border-[var(--border-strong)] shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              <span>{CATEGORY_ICONS[currentTopic.category] || '💡'}</span>
              <span>{currentTopic.category}</span>
              <span className="px-2 py-0.2 rounded-full text-[10px] bg-[var(--accent-soft)] text-[var(--accent)] capitalize font-semibold border border-[var(--accent)]/30">
                {currentTopic.difficulty}
              </span>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGetAnotherTopic}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border-color)]"
                title="Get another topic"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Another Topic</span>
              </button>

              <button
                onClick={() => setIsCustomTopicModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border-color)]"
                title="Type your own topic"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Custom Topic</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 text-center sm:text-left py-2">
            <h3 className="font-serif-aesthetic text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-snug">
              &ldquo;{currentTopic.topic}&rdquo;
            </h3>
            <p className="text-sm text-[var(--text-secondary)] font-serif-aesthetic italic max-w-2xl">
              {currentTopic.description}
            </p>
          </div>

          {/* Starter Questions Teaser */}
          {currentTopic.starterQuestions && currentTopic.starterQuestions.length > 0 && (
            <div className="p-4 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)]/80 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Guiding Questions to Explore:</span>
              </div>
              <ul className="space-y-1 text-xs text-[var(--text-secondary)] list-disc list-inside">
                {currentTopic.starterQuestions.map((q, idx) => (
                  <li key={idx} className="font-serif-aesthetic">{q}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sprint Length Selector */}
          <div className="pt-2 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Sprint Length:
              </span>
              <div className="flex items-center gap-1">
                {[10, 15, 20, 30].map(m => (
                  <button
                    key={m}
                    onClick={() => setSprintDurationMinutes(m)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                      sprintDurationMinutes === m
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs font-semibold'
                        : 'bg-[var(--bg-paper-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)]'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
                <button
                  onClick={() => setIsCustomDurationModalOpen(true)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
                    ![10, 15, 20, 30].includes(sprintDurationMinutes)
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-semibold'
                      : 'bg-[var(--bg-paper-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)]'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Launch Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleGetAnotherTopic}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-colors border border-[var(--border-color)]"
              >
                Surprise Me Again
              </button>

              <button
                onClick={() => handleStartSprint()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-sm font-semibold shadow-xs transition-transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start {sprintDurationMinutes}-Min Sprint</span>
              </button>
            </div>
          </div>
        </div>

        {/* Learning Statistics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl journal-paper-subtle text-center space-y-0.5">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">This Week</div>
            <div className="font-serif-aesthetic text-xl font-bold text-[var(--text-primary)]">
              {stats.weekCount} sprints
            </div>
          </div>
          <div className="p-3.5 rounded-2xl journal-paper-subtle text-center space-y-0.5">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">This Month</div>
            <div className="font-serif-aesthetic text-xl font-bold text-[var(--text-primary)]">
              {stats.monthCount} sprints
            </div>
          </div>
          <div className="p-3.5 rounded-2xl journal-paper-subtle text-center space-y-0.5">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Time Learned</div>
            <div className="font-serif-aesthetic text-xl font-bold text-[var(--accent)]">
              {stats.totalHoursStr}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl journal-paper-subtle text-center space-y-0.5">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Topics Explored</div>
            <div className="font-serif-aesthetic text-xl font-bold text-[var(--text-primary)]">
              {stats.topicsCount}
            </div>
          </div>
        </div>

        {/* Recent Sprint History */}
        {learningSprints.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Recent Learning Sprints</span>
              </span>
              <button
                onClick={() => router.push('/vault')}
                className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium"
              >
                <span>View in Vault</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {learningSprints.slice(0, 4).map(sprint => (
                <div
                  key={sprint.id}
                  className="p-4 rounded-2xl journal-paper border border-[var(--border-color)] hover:border-[var(--accent)]/50 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span className="flex items-center gap-1 text-[var(--accent)] font-semibold">
                        <span>{CATEGORY_ICONS[sprint.category] || '💡'}</span>
                        <span>{sprint.category}</span>
                      </span>
                      <span>{formatDate(sprint.created_at, { month: 'short', day: 'numeric' })}</span>
                    </div>

                    <h4 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                      {sprint.topic}
                    </h4>

                    {sprint.explanation && (
                      <p className="text-xs text-[var(--text-secondary)] italic font-serif-aesthetic line-clamp-2">
                        &ldquo;{sprint.explanation}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border-color)]/60">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {Math.round(sprint.actual_duration_seconds / 60)} min spent
                    </span>
                    <button
                      onClick={() => router.push(`/vault?id=know-sprint-${sprint.id}`)}
                      className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                    >
                      <span>Read notes</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Topic Modal */}
        {isCustomTopicModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!customTopicInput.trim()) return;
                const customObj: CuratedTopic = {
                  id: `custom-${generateId()}`,
                  topic: customTopicInput.trim(),
                  category: customCategoryInput,
                  difficulty: 'medium',
                  description: 'Custom research sprint topic chosen by user.',
                  starterQuestions: ['What are the core fundamentals?', 'What are real-world use cases?'],
                  suggestedSearchQueries: [customTopicInput.trim()],
                };
                setIsCustomTopicModalOpen(false);
                handleStartSprint(customObj);
              }}
              className="w-full max-w-md p-6 rounded-3xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[var(--accent)]" />
                  <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
                    Choose a Topic Myself
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomTopicModalOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  What topic do you want to research?
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Explain Kubernetes Architecture, History of Dhaka Muslin..."
                  value={customTopicInput}
                  onChange={e => setCustomTopicInput(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  Category
                </label>
                <select
                  value={customCategoryInput}
                  onChange={e => setCustomCategoryInput(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                >
                  {LEARNING_CATEGORIES.filter(c => c !== 'Surprise Me').map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsCustomTopicModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
                >
                  Start Sprint with Topic
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Custom Duration Modal */}
        {isCustomDurationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)]">
                  Set Custom Sprint Duration
                </h3>
                <button
                  onClick={() => setIsCustomDurationModalOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-[var(--text-secondary)]">
                  Duration in Minutes (5 to 120):
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={customDurationInput}
                  onChange={e => setCustomDurationInput(e.target.value)}
                  className="w-full text-center text-xl font-bold p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCustomDurationModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const mins = Math.max(5, Math.min(120, parseInt(customDurationInput, 10) || 15));
                    setSprintDurationMinutes(mins);
                    setIsCustomDurationModalOpen(false);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: 2. ACTIVE RESEARCH WORKSPACE
  // -------------------------------------------------------------
  if (mode === 'active') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-20">
        {/* Sticky Active Sprint Top Bar */}
        <div className="sticky top-14 z-30 p-4 rounded-2xl bg-[var(--bg-paper)]/95 backdrop-blur-md border border-[var(--border-strong)] shadow-md space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30">
                  {sprintCategory}
                </span>
                <span className="text-xs text-[var(--text-muted)] capitalize">
                  {sprintDifficulty} difficulty
                </span>
                {learningSaveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Autosaving draft...</span>
                  </span>
                )}
                {learningSaveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Draft saved ✓</span>
                  </span>
                )}
              </div>
              <h2 className="font-serif-aesthetic text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-1 line-clamp-1">
                {sprintTopic}
              </h2>
            </div>

            {/* Quick External Web Search Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleQuickWebSearch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] transition-colors shadow-2xs"
                title="Search this topic on Google in a new tab"
              >
                <Search className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Search This Topic</span>
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
              </button>

              <button
                type="button"
                onClick={() => setIsFinishEarlyConfirmOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Finish & Save</span>
              </button>
            </div>
          </div>

          {/* Timer Display & Controls Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-[var(--bg-paper-subtle)] p-3 rounded-xl border border-[var(--border-color)]">
            <div className="text-center sm:text-left text-xs text-[var(--text-muted)] font-medium">
              Target: <strong className="text-[var(--text-primary)]">{formatDuration(targetDurationSeconds)}</strong>
            </div>

            <div className="text-center space-y-0.5">
              <div className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-bold">
                {isTimeUp ? 'Sprint Time Reached!' : 'Remaining Time'}
              </div>
              <div className={`font-mono text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isTimeUp ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : 'text-[var(--text-primary)]'
              }`}>
                {isTimeUp ? `+${formatDuration(elapsedSeconds - targetDurationSeconds)}` : formatDuration(remainingSec)}
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-2">
              {!isTimerPaused ? (
                <button
                  type="button"
                  onClick={handlePauseTimer}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium shadow-2xs"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResumeTimer}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-2xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleAddFiveMinutes}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-paper)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Add 5 minutes to sprint"
              >
                +5m
              </button>
            </div>
          </div>

          {/* Time's Up Banner */}
          {isTimeUp && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex flex-wrap items-center justify-between gap-2 text-emerald-800 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Sprint Time Complete!</strong> Finish your reflection notes at your own pace.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCompleteSprint}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
                >
                  Complete Sprint
                </button>
                <button
                  type="button"
                  onClick={handleAddFiveMinutes}
                  className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-black/30 border border-emerald-300 text-xs"
                >
                  +5 Minutes
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 1. Key Questions Section */}
        <div className="journal-paper p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[var(--accent)]" />
              <span>What am I trying to understand? (Key Questions)</span>
            </span>
            <button
              type="button"
              onClick={() => setKeyQuestions(prev => [...prev, ''])}
              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>

          <div className="space-y-2">
            {keyQuestions.map((q, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--accent)] w-5 text-right">{idx + 1}.</span>
                <input
                  type="text"
                  value={q}
                  onChange={e => {
                    const next = [...keyQuestions];
                    next[idx] = e.target.value;
                    setKeyQuestions(next);
                  }}
                  placeholder="e.g. How does this mechanism operate step-by-step?"
                  className="flex-1 text-xs p-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                {keyQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setKeyQuestions(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 text-[var(--text-muted)] hover:text-red-500 rounded-lg"
                    title="Remove question"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2. Research Notes Workspace */}
        <div className="journal-paper p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[var(--accent)]" />
              <span>Research Notes (Rich Text)</span>
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              Use Ctrl+B for bold, Ctrl+I for italic, Bullet lists supported
            </span>
          </div>

          <RichTextEditor
            value={notes}
            onChange={setNotes}
            placeholder="Type your structured research notes, synthesis, findings, and diagrams here..."
            minHeight="180px"
          />
        </div>

        {/* 3. Useful Links & Sources */}
        <div className="journal-paper p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <ExternalLink className="w-4 h-4 text-[var(--accent)]" />
              <span>Useful Sources & Links ({sources.length})</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAddSourceModalOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Source</span>
            </button>
          </div>

          {sources.length === 0 ? (
            <div className="p-4 rounded-xl bg-[var(--bg-paper-subtle)] text-center text-xs text-[var(--text-muted)] italic">
              No sources added yet. Click &ldquo;+ Add Source&rdquo; to save articles or reference links.
            </div>
          ) : (
            <div className="space-y-2">
              {sources.map(src => (
                <div
                  key={src.id}
                  className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 truncate">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[var(--accent)] hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{src.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    {src.note && (
                      <p className="text-[11px] text-[var(--text-secondary)] italic truncate">
                        &ldquo;{src.note}&rdquo;
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSources(prev => prev.filter(s => s.id !== src.id))}
                    className="p-1 text-[var(--text-muted)] hover:text-red-500 rounded"
                    title="Remove source"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. What I Learned & Reflection Section */}
        <div className="journal-paper p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] space-y-5">
          <div className="border-b border-[var(--border-color)] pb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span>Synthesis: What I Learned</span>
            </span>

            {/* Active Recall Focus Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsFocusRecallMode(!isFocusRecallMode)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-colors border ${
                isFocusRecallMode
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]'
                  : 'bg-[var(--bg-paper-subtle)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
              }`}
            >
              {isFocusRecallMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isFocusRecallMode ? 'Recall Mode Active (Notes Hidden)' : 'Explain It Back Focus Mode'}</span>
            </button>
          </div>

          {/* Active Recall text area */}
          {isFocusRecallMode && (
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  🧠 Active Recall: Explain It Back
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300">
                  Without peeking at notes, test your memory
                </span>
              </div>
              <textarea
                rows={4}
                value={explainItBack}
                onChange={e => setExplainItBack(e.target.value)}
                placeholder="Without looking at your notes, explain how this topic works in your own words..."
                className="w-full text-xs p-3 rounded-xl bg-[var(--bg-paper)] border border-amber-300 dark:border-amber-700 text-[var(--text-primary)] focus:outline-none"
              />
            </div>
          )}

          {/* Three Key Points */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">
              Three Key Takeaways
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={keyPoint1}
                onChange={e => setKeyPoint1(e.target.value)}
                placeholder="1. First key takeaway..."
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <input
                type="text"
                value={keyPoint2}
                onChange={e => setKeyPoint2(e.target.value)}
                placeholder="2. Second key takeaway..."
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <input
                type="text"
                value={keyPoint3}
                onChange={e => setKeyPoint3(e.target.value)}
                placeholder="3. Third key takeaway..."
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* New Words / Concepts */}
          <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                New Words & Concepts
              </label>
              <button
                type="button"
                onClick={() => setIsAddWordModalOpen(true)}
                className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Term</span>
              </button>
            </div>

            {newWords.length === 0 ? (
              <div className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] text-center text-xs text-[var(--text-muted)] italic">
                No new terms logged yet. Click &ldquo;+ Add Term&rdquo; to capture vocabulary.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {newWords.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs space-y-1 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-primary)]">{w.word}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSaveWordToVocabulary(w)}
                          className="px-2 py-0.5 rounded text-[10px] bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                          title="Save to long-term vocabulary vault"
                        >
                          {vocabSavedNotifs[w.word] ? 'Saved ✓' : '+ Vault'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewWords(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-[var(--text-muted)] hover:text-red-500 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">{w.meaning}</p>
                    {w.example && (
                      <p className="text-[10px] text-[var(--text-muted)] italic">Ex: {w.example}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* One-Sentence Explanation (The Feynman Prompt) */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">
              One-Sentence Explanation (Teach it to a 10-year-old)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="Explain this topic in one simple sentence as if you were teaching someone else..."
              className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-serif-aesthetic"
            />
          </div>

          {/* What Still Confuses Me */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">
              What Still Confuses Me? (Unresolved Questions)
            </label>
            <input
              type="text"
              value={confusions}
              onChange={e => setConfusions(e.target.value)}
              placeholder="e.g. Need to read more about how quantum entanglement plays into this..."
              className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Bottom Finish Sprint Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-sm">
          <div className="text-xs text-[var(--text-muted)]">
            Total Research Time:{' '}
            <strong className="text-[var(--text-primary)] font-bold font-mono text-sm">
              {formatDuration(elapsedSeconds)}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFinishEarlyConfirmOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)]"
            >
              Finish Early
            </button>

            <button
              type="button"
              onClick={handleCompleteSprint}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Sprint & Save to Vault</span>
            </button>
          </div>
        </div>

        {/* Add Source Modal */}
        {isAddSourceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <form
              onSubmit={handleSaveSource}
              className="w-full max-w-md p-6 rounded-3xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-[var(--accent)]" />
                  <span>Add Reference Source</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddSourceModalOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Source Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NASA GPS Overview / Stanford Encyclopedia"
                  value={newSourceTitle}
                  onChange={e => setNewSourceTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">URL Link</label>
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={newSourceUrl}
                  onChange={e => setNewSourceUrl(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Great explanation of atomic clocks and trilateration"
                  value={newSourceNote}
                  onChange={e => setNewSourceNote(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsAddSourceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
                >
                  Add Source
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Word Modal */}
        {isAddWordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <form
              onSubmit={handleSaveWord}
              className="w-full max-w-md p-6 rounded-3xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <span>Add New Word / Concept</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddWordModalOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Word / Concept</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trilateration"
                  value={newWordText}
                  onChange={e => setNewWordText(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Meaning / Definition</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Determining location by calculating distance from multiple known spheres."
                  value={newWordMeaning}
                  onChange={e => setNewWordMeaning(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Example / Context (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. GPS requires 4 satellites for exact 3D trilateration."
                  value={newWordExample}
                  onChange={e => setNewWordExample(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsAddWordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
                >
                  Save Term
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Finish Early Confirmation Modal */}
        {isFinishEarlyConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xl space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)]">
                  Finish this learning sprint?
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                All your research notes, key takeaways, and sources will be permanently saved to your Knowledge Vault.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFinishEarlyConfirmOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
                >
                  Keep Researching
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSprint}
                  className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  Yes, Complete & Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: 3. COMPLETED SPRINT SUMMARY
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-16 animate-in zoom-in-95 duration-200">
      <div className="p-8 rounded-3xl journal-paper border border-[var(--border-strong)] shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto shadow-xs animate-bounce">
          ✨
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Saved to Knowledge Vault ✓</span>
          </span>
          <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            {completedSprint?.topic || sprintTopic}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] font-serif-aesthetic italic">
            Completed on {formatDate(new Date())} • {Math.round((completedSprint?.actual_duration_seconds || elapsedSeconds) / 60)} minutes of focused research
          </p>
        </div>

        {completedSprint?.explanation && (
          <div className="p-4 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-serif-aesthetic italic text-left">
            &ldquo;{completedSprint.explanation}&rdquo;
          </div>
        )}

        {/* Key Takeaways */}
        {completedSprint?.key_points && completedSprint.key_points.length > 0 && (
          <div className="text-left p-4 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Key Takeaways
            </div>
            <ul className="space-y-1 text-xs text-[var(--text-secondary)] list-disc list-inside">
              {completedSprint.key_points.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-[var(--border-color)]">
          <button
            onClick={() => setMode('setup')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Another Sprint</span>
          </button>

          <button
            onClick={() => router.push(`/vault?id=know-sprint-${completedSprint?.id || sprintId}`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] shadow-2xs"
          >
            <BookOpen className="w-4 h-4 text-[var(--accent)]" />
            <span>Open in Knowledge Vault</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LearningSprintPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center text-xs text-[var(--text-muted)]">
        Opening Learning Sprint...
      </div>
    }>
      <LearningSprintContent />
    </Suspense>
  );
}
