'use client';

import React, { useState, useEffect, useMemo, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { 
  Goal, 
  GoalMilestone, 
  GoalTask, 
  GoalPriority, 
  GoalStatus, 
  GoalCategory 
} from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { getDaysRemainingText } from '../page';
import { 
  Target, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar as CalendarIcon, 
  ArrowLeft, 
  Trash2, 
  Archive, 
  Star, 
  Save, 
  Check, 
  AlertCircle, 
  Flag, 
  MoreVertical, 
  FileText, 
  BookOpen, 
  Sparkles,
  Award,
  Layers,
  CalendarCheck,
  Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const CATEGORIES: GoalCategory[] = [
  'Academic',
  'Research',
  'Career',
  'Personal',
  'Health',
  'Finance',
  'Learning',
  'Project',
];

export default function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const goalId = resolvedParams.id;
  const router = useRouter();

  const {
    goals,
    goalMilestones,
    goalTasks,
    saveGoal,
    updateGoal,
    deleteGoal,
    saveMilestone,
    updateMilestone,
    deleteMilestone,
    saveGoalTask,
    updateGoalTask,
    deleteGoalTask,
    focusSessions,
    researchPapers,
    pages,
    createPage,
    goalSaveStatus,
  } = usePlanner();

  const goal = useMemo(() => goals.find(g => g.id === goalId), [goals, goalId]);

  // Goal Milestones & Tasks for this Goal
  const milestones = useMemo(() => {
    return (goalMilestones || [])
      .filter(m => m.goal_id === goalId)
      .sort((a, b) => a.position - b.position);
  }, [goalMilestones, goalId]);

  const tasks = useMemo(() => {
    return (goalTasks || [])
      .filter(t => t.goal_id === goalId)
      .sort((a, b) => a.position - b.position);
  }, [goalTasks, goalId]);

  // Modals
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState<string | null>(null); // milestoneId or 'general'
  const [editingMilestone, setEditingMilestone] = useState<GoalMilestone | null>(null);

  // New Milestone Form
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msTargetDate, setMsTargetDate] = useState('');

  // New Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<GoalPriority>('medium');
  const [taskNotes, setTaskNotes] = useState('');

  // Goal Notes State with Debounced Autosave
  const [notesContent, setNotesContent] = useState(goal?.notes || '');
  const [isNotesDirty, setIsNotesDirty] = useState(false);

  useEffect(() => {
    if (goal) {
      setNotesContent(goal.notes || '');
    }
  }, [goal?.id, goal?.notes]);

  // Calculated Progress
  const calculatedProgress = useMemo(() => {
    if (milestones.length > 0) {
      const completedMs = milestones.filter(m => m.status === 'completed' || m.is_completed).length;
      return Math.round((completedMs / milestones.length) * 100);
    } else if (tasks.length > 0) {
      const completedT = tasks.filter(t => t.is_completed).length;
      return Math.round((completedT / tasks.length) * 100);
    }
    return goal?.progress || 0;
  }, [milestones, tasks, goal?.progress]);

  // Auto-sync progress to goal record if changed
  useEffect(() => {
    if (goal && goal.progress !== calculatedProgress) {
      updateGoal(goal.id, { progress: calculatedProgress });
    }
  }, [calculatedProgress, goal, updateGoal]);

  // Debounced Autosave for Notes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!isNotesDirty || !goal) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateGoal(goal.id, { notes: notesContent });
      setIsNotesDirty(false);
    }, 1500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [notesContent, isNotesDirty, goal, updateGoal]);

  const handleManualSaveNotes = async () => {
    if (!goal) return;
    await updateGoal(goal.id, { notes: notesContent });
    setIsNotesDirty(false);
  };

  // Milestone Actions
  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msTitle.trim() || !goal) return;

    if (editingMilestone) {
      await updateMilestone(editingMilestone.id, {
        title: msTitle.trim(),
        description: msDesc.trim(),
        target_date: msTargetDate || null,
      });
      setEditingMilestone(null);
    } else {
      const newMilestone: GoalMilestone = {
        id: `ms-${Date.now()}`,
        goal_id: goal.id,
        title: msTitle.trim(),
        description: msDesc.trim(),
        target_date: msTargetDate || null,
        status: 'pending',
        is_completed: false,
        position: milestones.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await saveMilestone(newMilestone);
    }

    setShowAddMilestoneModal(false);
    setMsTitle('');
    setMsDesc('');
    setMsTargetDate('');
  };

  const handleToggleMilestone = async (m: GoalMilestone) => {
    const isNowCompleted = !(m.status === 'completed' || m.is_completed);
    await updateMilestone(m.id, {
      status: isNowCompleted ? 'completed' : 'pending',
      is_completed: isNowCompleted,
    });
  };

  // Task Actions
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !goal) return;

    const milestoneId = showAddTaskModal === 'general' ? null : showAddTaskModal;
    const newTask: GoalTask = {
      id: `gtask-${Date.now()}`,
      goal_id: goal.id,
      milestone_id: milestoneId,
      title: taskTitle.trim(),
      is_completed: false,
      due_date: taskDueDate || null,
      priority: taskPriority,
      notes: taskNotes.trim(),
      position: tasks.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveGoalTask(newTask);
    setShowAddTaskModal(null);
    setTaskTitle('');
    setTaskDueDate('');
    setTaskNotes('');
  };

  const handleToggleTask = async (t: GoalTask) => {
    await updateGoalTask(t.id, { is_completed: !t.is_completed });
  };

  // Schedule task in today's daily planner
  const handleScheduleForToday = async (t: GoalTask) => {
    const todayStr = new Date().toISOString().split('T')[0];
    await updateGoalTask(t.id, { daily_planner_date: todayStr });

    // Check if today's planner page exists, or create one with a checklist block
    let todayPage = pages.find(p => p.date === todayStr && !p.is_deleted);
    if (!todayPage) {
      todayPage = await createPage({
        title: `Daily Planner • ${formatDate(new Date(), { month: 'short', day: 'numeric' })}`,
        page_type: 'daily',
        icon: '☀️',
        date: todayStr,
      });
    }
  };

  // Related Data
  const relatedFocus = useMemo(() => {
    return (focusSessions || []).filter(fs => fs.related_goal_id === goalId);
  }, [focusSessions, goalId]);

  const relatedFocusSeconds = relatedFocus.reduce((acc, fs) => acc + (fs.actual_duration_seconds || 0), 0);

  const relatedPapers = useMemo(() => {
    return (researchPapers || []).filter(p => !p.is_trash && ((p as any).related_goal_id === goalId || p.tags?.includes(goal?.title?.toLowerCase() || '')));
  }, [researchPapers, goalId, goal?.title]);

  if (!goal) {
    return (
      <div className="py-20 text-center journal-paper max-w-md mx-auto p-8 space-y-4">
        <Target className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
        <h3 className="font-serif-aesthetic font-bold text-lg text-[var(--text-primary)]">
          Goal Not Found
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          This goal may have been moved to Trash or permanently deleted.
        </p>
        <Button size="sm" variant="primary" onClick={() => router.push('/goals')}>
          Back to Goals
        </Button>
      </div>
    );
  }

  const daysInfo = getDaysRemainingText(goal.target_date);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-24">
      {/* Back button & Action controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <button
          onClick={() => router.push('/goals')}
          className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Goals</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Selector */}
          <select
            value={goal.status}
            onChange={e => updateGoal(goal.id, { status: e.target.value as GoalStatus })}
            className="text-xs py-1 px-2.5 rounded-lg bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] font-medium text-[var(--text-primary)]"
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed ✓</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateGoal(goal.id, { is_favorite: !goal.is_favorite })}
            title={goal.is_favorite ? 'Favorited' : 'Favorite'}
          >
            <Star className={`w-4 h-4 ${goal.is_favorite ? 'text-amber-500 fill-amber-500' : ''}`} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateGoal(goal.id, { is_archived: !goal.is_archived })}
            title={goal.is_archived ? 'Unarchive' : 'Archive'}
          >
            <Archive className="w-4 h-4" />
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              await deleteGoal(goal.id);
              router.push('/goals');
            }}
            title="Move to Trash"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            <span>Trash</span>
          </Button>
        </div>
      </div>

      {/* Goal Header Card */}
      <div className="journal-paper p-6 space-y-5 shadow-xs">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-strong)]">
              {goal.category}
            </span>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md capitalize ${
              goal.priority === 'high' 
                ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' 
                : goal.priority === 'medium'
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
            }`}>
              {goal.priority} priority
            </span>
            {goal.target_date && (
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-md flex items-center gap-1 ${
                daysInfo.isOverdue 
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' 
                  : daysInfo.isDueToday 
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-semibold' 
                  : 'bg-[var(--bg-paper-subtle)] text-[var(--text-secondary)]'
              }`}>
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{daysInfo.text} ({formatDate(goal.target_date, { month: 'short', day: 'numeric', year: 'numeric' })})</span>
              </span>
            )}
          </div>

          <h1 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold text-[var(--text-primary)] leading-tight">
            {goal.title}
          </h1>

          {goal.description && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {goal.description}
            </p>
          )}

          {goal.why_it_matters && (
            <div className="p-3 rounded-xl bg-[var(--accent-soft)]/50 border border-[var(--border-strong)] text-xs text-[var(--text-primary)] flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[var(--accent)]">Why this matters: </span>
                <span className="italic">{goal.why_it_matters}</span>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar & Details */}
        <div className="space-y-2 pt-4 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[var(--text-primary)]">
              Overall Progress: {calculatedProgress}%
            </span>
            <span className="text-[var(--text-muted)] font-normal">
              {milestones.length > 0 
                ? `${milestones.filter(m => m.status === 'completed' || m.is_completed).length} of ${milestones.length} milestones complete`
                : `${tasks.filter(t => t.is_completed).length} of ${tasks.length} tasks complete`}
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-[var(--bg-paper-subtle)] overflow-hidden border border-[var(--border-color)]">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, calculatedProgress))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Milestones & Breakdown Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
              Milestones & Tasks
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingMilestone(null);
                setMsTitle('');
                setMsDesc('');
                setMsTargetDate('');
                setShowAddMilestoneModal(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Milestone</span>
            </Button>
          </div>
        </div>

        {/* Milestones List */}
        <div className="space-y-4">
          {milestones.map((m, idx) => {
            const milestoneTasks = tasks.filter(t => t.milestone_id === m.id);
            const isCompleted = m.status === 'completed' || m.is_completed;
            const msDaysInfo = getDaysRemainingText(m.target_date);

            return (
              <div
                key={m.id}
                className={`journal-paper p-5 space-y-4 transition-all border ${
                  isCompleted ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/10' : 'border-[var(--border-color)]'
                }`}
              >
                {/* Milestone Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleMilestone(m)}
                      className="mt-0.5 shrink-0 text-[var(--text-muted)] hover:text-emerald-600 transition-colors"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-[var(--accent)]">
                          Milestone {idx + 1}
                        </span>
                        {m.target_date && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-paper-subtle)] text-[var(--text-muted)] flex items-center gap-1 font-medium">
                            <CalendarIcon className="w-3 h-3" />
                            <span>{msDaysInfo.text || formatDate(m.target_date, { month: 'short', day: 'numeric' })}</span>
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                            Completed
                          </span>
                        )}
                      </div>

                      <h4 className={`font-serif-aesthetic font-semibold text-sm sm:text-base text-[var(--text-primary)] mt-0.5 ${
                        isCompleted ? 'line-through opacity-70' : ''
                      }`}>
                        {m.title}
                      </h4>

                      {m.description && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                          {m.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingMilestone(m);
                        setMsTitle(m.title);
                        setMsDesc(m.description || '');
                        setMsTargetDate(m.target_date || '');
                        setShowAddMilestoneModal(true);
                      }}
                      className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      title="Edit Milestone"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteMilestone(m.id)}
                      className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500"
                      title="Delete Milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtasks under this Milestone */}
                <div className="pl-8 space-y-2 pt-2 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span className="font-medium text-[11px]">Tasks ({milestoneTasks.filter(t => t.is_completed).length}/{milestoneTasks.length})</span>
                    <button
                      onClick={() => {
                        setShowAddTaskModal(m.id);
                        setTaskTitle('');
                        setTaskDueDate('');
                        setTaskNotes('');
                      }}
                      className="text-[11px] text-[var(--accent)] font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Task</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {milestoneTasks.map(task => (
                      <div
                        key={task.id}
                        className="p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] flex items-center justify-between gap-3 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => handleToggleTask(task)}
                            className="shrink-0 text-[var(--text-muted)] hover:text-emerald-600"
                          >
                            {task.is_completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                          <span className={`truncate font-medium text-[var(--text-primary)] ${
                            task.is_completed ? 'line-through opacity-60' : ''
                          }`}>
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {task.daily_planner_date ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-medium flex items-center gap-1">
                              <CalendarCheck className="w-3 h-3" />
                              <span>Scheduled {task.daily_planner_date}</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleScheduleForToday(task)}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-paper)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] text-[var(--text-secondary)] border border-[var(--border-color)] transition-colors"
                              title="Schedule in Daily Planner"
                            >
                              + Schedule Today
                            </button>
                          )}

                          <button
                            onClick={() => deleteGoalTask(task.id)}
                            className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-500"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {milestoneTasks.length === 0 && (
                      <p className="text-[11px] text-[var(--text-muted)] italic py-1">
                        No tasks yet. Click &quot;Add Task&quot; to break this milestone down into actionable steps.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {milestones.length === 0 && (
            <div className="journal-paper p-8 text-center space-y-3">
              <Flag className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
              <h4 className="font-serif-aesthetic font-semibold text-sm text-[var(--text-primary)]">
                No milestones added yet
              </h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Break this goal into 3 to 5 clear milestones to make steady progress.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingMilestone(null);
                  setMsTitle('');
                  setMsDesc('');
                  setMsTargetDate('');
                  setShowAddMilestoneModal(true);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Add First Milestone</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION: Rich Text Goal Notes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
              Goal Notes & Plan
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--text-muted)]">
              {isNotesDirty ? 'Unsaved notes...' : 'Notes saved ✓'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleManualSaveNotes}
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              <span>Save Notes</span>
            </Button>
          </div>
        </div>

        <div className="journal-paper p-4 space-y-2">
          <textarea
            value={notesContent}
            onChange={e => {
              setNotesContent(e.target.value);
              setIsNotesDirty(true);
            }}
            placeholder="Write your detailed strategy, observations, ideas, and notes for this goal..."
            rows={6}
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden leading-relaxed resize-y font-sans"
          />
        </div>
      </div>

      {/* SECTION: Connected Integrations (Focus & Papers) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Connected Focus Work */}
        <div className="journal-paper p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <h4 className="font-serif-aesthetic font-bold text-sm text-[var(--text-primary)]">
                Logged Focus Time
              </h4>
            </div>
            <span className="text-xs font-semibold text-[var(--accent)]">
              {Math.floor(relatedFocusSeconds / 3600)}h {Math.round((relatedFocusSeconds % 3600) / 60)}m
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)]">
            {relatedFocus.length > 0 
              ? `${relatedFocus.length} deep work focus sessions logged for this goal.`
              : 'Select this goal when starting a Focus Session to link your deep work here.'}
          </p>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/focus?goalId=${goal.id}`)}
          >
            Start Focus Session for this Goal →
          </Button>
        </div>

        {/* Connected Research Papers */}
        <div className="journal-paper p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-500" />
              <h4 className="font-serif-aesthetic font-bold text-sm text-[var(--text-primary)]">
                Related Research Papers
              </h4>
            </div>
            <span className="text-xs font-semibold text-[var(--accent)]">
              {relatedPapers.length} papers
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)]">
            {relatedPapers.length > 0 
              ? relatedPapers.map(p => p.title).slice(0, 2).join(', ')
              : 'Add research papers connected to this milestone or academic thesis.'}
          </p>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push('/papers')}
          >
            View Research Paper Tracker →
          </Button>
        </div>
      </div>

      {/* Add / Edit Milestone Modal */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md journal-paper p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif-aesthetic font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Flag className="w-4 h-4 text-[var(--accent)]" />
                <span>{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</span>
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setShowAddMilestoneModal(false)}>
                Cancel
              </Button>
            </div>

            <form onSubmit={handleSaveMilestone} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Milestone Title *
                </label>
                <input
                  type="text"
                  required
                  value={msTitle}
                  onChange={e => setMsTitle(e.target.value)}
                  placeholder="e.g. Finalize Dataset & Annotations"
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Description (Optional)
                </label>
                <textarea
                  value={msDesc}
                  onChange={e => setMsDesc(e.target.value)}
                  placeholder="What needs to be delivered for this milestone..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={msTargetDate}
                  onChange={e => setMsTargetDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddMilestoneModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  {editingMilestone ? 'Update Milestone' : 'Add Milestone'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md journal-paper p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif-aesthetic font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                <span>Add Task to Milestone</span>
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setShowAddTaskModal(null)}>
                Cancel
              </Button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="e.g. Complete YOLO model training experiments"
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={e => setTaskDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as GoalPriority)}
                    className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Notes / Links (Optional)
                </label>
                <textarea
                  value={taskNotes}
                  onChange={e => setTaskNotes(e.target.value)}
                  placeholder="Additional details..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddTaskModal(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Add Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
