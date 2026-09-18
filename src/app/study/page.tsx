'use client';

import React, { useState, useEffect } from 'react';
import { usePlanner } from '@/lib/storage';
import { PageBlock, StudySessionItem } from '@/lib/types';
import { StudyLogBlock } from '@/components/blocks/StudyLogBlock';
import { NewPageModal } from '@/components/modals/NewPageModal';
import { getTodayDateString, MONTH_ABBR, getDaysInMonth } from '@/lib/utils';
import { 
  GraduationCap, 
  Clock, 
  Flame, 
  Plus, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle,
  BookOpen
} from 'lucide-react';

export default function StudyHubPage() {
  const { storage, pages } = usePlanner();
  const [studyBlocks, setStudyBlocks] = useState<{ pageId: string; pageTitle: string; block: PageBlock<'study_log'> }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);

  // Focus Timer state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSubject, setTimerSubject] = useState('');

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      alert('Focus session completed! Amazing work!');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  useEffect(() => {
    async function loadStudyData() {
      const results: { pageId: string; pageTitle: string; block: PageBlock<'study_log'> }[] = [];
      for (const p of pages) {
        const blocks = await storage.getBlocksByPageId(p.id);
        const sb = blocks.filter((b): b is PageBlock<'study_log'> => b.type === 'study_log');
        for (const block of sb) {
          results.push({ pageId: p.id, pageTitle: p.title, block });
        }
      }
      setStudyBlocks(results);
      setLoading(false);
    }
    loadStudyData();
  }, [storage, pages]);

  // Aggregate all sessions across pages
  const allSessions: StudySessionItem[] = studyBlocks.flatMap((item) => item.block.content?.sessions || []);

  const todayStr = getTodayDateString();
  const todaySessions = allSessions.filter((s) => s.date === todayStr);
  const todayMinutes = todaySessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);

  // This month's sessions
  const currentMonthStr = todayStr.substring(0, 7); // 'YYYY-MM'
  const thisMonthSessions = allSessions.filter((s) => s.date.startsWith(currentMonthStr));
  const monthMinutes = thisMonthSessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);

  // Format timer
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Study & Research Sanctuary
            </h2>
          </div>
          <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)] mt-0.5">
            Log coursework, research papers, dissertation notes, and master your focus
          </p>
        </div>

        <button
          onClick={() => setIsNewPageModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Study Tracker</span>
        </button>
      </div>

      {/* Top Stats & Focus Timer Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Study Time */}
        <div className="journal-paper p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-semibold text-[var(--text-muted)] tracking-wider">
              Today&apos;s Study
            </span>
            <div className="font-serif-aesthetic text-2xl font-bold text-[var(--text-primary)]">
              {(todayMinutes / 60).toFixed(1)} hrs
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {todaySessions.length} sessions completed
            </p>
          </div>
        </div>

        {/* This Month's Total */}
        <div className="journal-paper p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase font-semibold text-[var(--text-muted)] tracking-wider">
              This Month
            </span>
            <div className="font-serif-aesthetic text-2xl font-bold text-[var(--text-primary)]">
              {(monthMinutes / 60).toFixed(1)} hrs
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {thisMonthSessions.length} deep focus logs
            </p>
          </div>
        </div>

        {/* Interactive Focus Timer */}
        <div className="journal-paper p-5 flex flex-col justify-between border-2 border-[var(--accent)]/30 bg-[var(--bg-paper-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Focus Stopwatch
            </span>
            <div className="flex gap-1">
              {[15, 25, 50].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(m * 60);
                  }}
                  className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent)]"
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="font-mono text-3xl font-bold text-[var(--accent)]">
              {timeFormatted}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="p-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] hover:scale-105 transition-transform"
                title={isTimerRunning ? 'Pause' : 'Start'}
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(25 * 60);
                }}
                className="p-2 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Yearly Study Heatmap inspired directly by Reference Image 3 */}
      <div className="journal-paper p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
          <div>
            <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>Yearly Study Heatmap Grid</span>
              <span className="text-sm">📖</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Visual duration tracker across all 12 months (Inspired by Reference 3)
            </p>
          </div>

          {/* Color Key matching Ref 3 */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-[var(--bg-paper-subtle)] border border-[var(--border-color)]" />
              0h
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-emerald-100 dark:bg-emerald-950 border border-emerald-300" />
              1h
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-emerald-300 dark:bg-emerald-800" />
              2-3h
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 text-white" />
              4h+
            </span>
          </div>
        </div>

        {/* 12 Months Heatmap Matrix */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-13 gap-1 text-center font-mono text-[10px] font-semibold text-[var(--text-muted)] pb-1 border-b border-[var(--border-color)]">
              <div className="w-6">Day</div>
              {MONTH_ABBR.map((m) => (
                <div key={m}>{m}</div>
              ))}
            </div>

            <div className="space-y-1 pt-1.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <div key={day} className="grid grid-cols-13 gap-1 items-center text-center font-mono text-[10px]">
                  <div className="w-6 text-[var(--text-muted)]">{day}</div>
                  {Array.from({ length: 12 }, (_, monthIdx) => {
                    const daysInM = getDaysInMonth(new Date().getFullYear(), monthIdx);
                    if (day > daysInM) {
                      return <div key={monthIdx} className="h-4 rounded-xs bg-black/5 dark:bg-white/5 opacity-20" />;
                    }

                    const mStr = String(monthIdx + 1).padStart(2, '0');
                    const dStr = String(day).padStart(2, '0');
                    const fullDateStr = `${new Date().getFullYear()}-${mStr}-${dStr}`;

                    const dateMinutes = allSessions
                      .filter((s) => s.date === fullDateStr)
                      .reduce((acc, s) => acc + (s.actualMinutes || 0), 0);

                    let cellBg = 'bg-[var(--bg-paper-subtle)] border border-[var(--border-color)]';
                    if (dateMinutes >= 240) cellBg = 'bg-emerald-600 text-white';
                    else if (dateMinutes >= 120) cellBg = 'bg-emerald-400 text-emerald-950';
                    else if (dateMinutes > 0) cellBg = 'bg-emerald-200 text-emerald-900';

                    return (
                      <div
                        key={monthIdx}
                        className={`h-4 rounded-xs transition-colors ${cellBg}`}
                        title={`${MONTH_ABBR[monthIdx]} ${day}: ${(dateMinutes / 60).toFixed(1)} hrs`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Study Log Block Renderers */}
      <div className="space-y-6">
        {studyBlocks.map(({ pageId, pageTitle, block }) => (
          <div key={block.id} className="space-y-2">
            <a
              href={`/pages/${pageId}`}
              className="font-serif-aesthetic text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors px-1 block"
            >
              From: {pageTitle} →
            </a>
            <StudyLogBlock
              content={block.content}
              onChange={async (updated) => {
                await storage.saveBlock({ ...block, content: updated });
                setStudyBlocks((prev) =>
                  prev.map((item) => (item.block.id === block.id ? { ...item, block: { ...block, content: updated } } : item))
                );
              }}
            />
          </div>
        ))}
      </div>

      <NewPageModal
        isOpen={isNewPageModalOpen}
        onClose={() => setIsNewPageModalOpen(false)}
        defaultType="study"
      />
    </div>
  );
}
