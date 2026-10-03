'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/storage';
import { Goal, GoalCategory, GoalPriority, GoalStatus } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { 
  Target, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Calendar as CalendarIcon, 
  Flag, 
  ChevronRight, 
  MoreVertical, 
  Star, 
  Archive, 
  Trash2, 
  Sparkles,
  TrendingUp,
  Award,
  BookOpen,
  ArrowUpRight
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

export function getDaysRemainingText(targetDateStr?: string | null): { text: string; isOverdue: boolean; isDueToday: boolean } {
  if (!targetDateStr) return { text: '', isOverdue: false, isDueToday: false };
  const target = new Date(`${targetDateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return { text: `${overdue} ${overdue === 1 ? 'day' : 'days'} overdue`, isOverdue: true, isDueToday: false };
  } else if (diffDays === 0) {
    return { text: 'Due today', isOverdue: false, isDueToday: true };
  } else {
    return { text: `${diffDays} ${diffDays === 1 ? 'day' : 'days'} remaining`, isOverdue: false, isDueToday: false };
  }
}

export default function GoalsPage() {
  const { 
    goals, 
    goalMilestones, 
    goalTasks,
    saveGoal, 
    updateGoal, 
    deleteGoal, 
    goalSaveStatus 
  } = usePlanner();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'active' | 'completed' | 'archived'>('active');
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);

  // New Goal Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<GoalCategory>('Personal');
  const [newPriority, setNewPriority] = useState<GoalPriority>('medium');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newWhy, setNewWhy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeGoals = goals.filter(g => !g.is_trash);

  // Filtered Goals
  const filteredGoals = activeGoals.filter(goal => {
    // Status tab filter
    if (selectedStatusTab === 'active' && (goal.is_archived || goal.status === 'completed')) return false;
    if (selectedStatusTab === 'completed' && goal.status !== 'completed') return false;
    if (selectedStatusTab === 'archived' && !goal.is_archived) return false;

    // Category filter
    if (selectedCategory !== 'All' && goal.category !== selectedCategory) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = goal.title.toLowerCase().includes(q);
      const matchDesc = (goal.description || '').toLowerCase().includes(q);
      const matchWhy = (goal.why_it_matters || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchWhy) return false;
    }

    return true;
  });

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const goalId = `goal-${Date.now()}`;
      const newGoal: Goal = {
        id: goalId,
        title: newTitle.trim(),
        description: newDesc.trim(),
        category: newCategory,
        priority: newPriority,
        status: 'not_started',
        start_date: newStartDate || null,
        target_date: newTargetDate || null,
        why_it_matters: newWhy.trim(),
        progress: 0,
        is_favorite: false,
        is_archived: false,
        is_trash: false,
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveGoal(newGoal);
      setShowNewGoalModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewWhy('');
      setNewTargetDate('');
    } catch (err) {
      console.error('Failed to create goal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center border border-[var(--border-strong)]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                Goals
              </h2>
              <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)]">
                Turn big goals into manageable steps.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowNewGoalModal(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Goal</span>
          </Button>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] self-start">
            <button
              onClick={() => setSelectedStatusTab('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedStatusTab === 'active'
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Active Goals ({activeGoals.filter(g => !g.is_archived && g.status !== 'completed').length})
            </button>
            <button
              onClick={() => setSelectedStatusTab('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedStatusTab === 'completed'
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Completed ({activeGoals.filter(g => g.status === 'completed').length})
            </button>
            <button
              onClick={() => setSelectedStatusTab('archived')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedStatusTab === 'archived'
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Archived ({activeGoals.filter(g => g.is_archived).length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search goals..."
              className="w-full pl-8.5 pr-3 py-1.5 rounded-xl text-xs bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-colors ${
              selectedCategory === 'All'
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold border border-[var(--border-strong)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-paper-hover)]'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold border border-[var(--border-strong)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-paper-hover)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals.map(goal => {
          const milestones = (goalMilestones || []).filter(m => m.goal_id === goal.id);
          const completedMilestones = milestones.filter(m => m.status === 'completed' || m.is_completed).length;
          const tasks = (goalTasks || []).filter(t => t.goal_id === goal.id);
          const completedTasks = tasks.filter(t => t.is_completed).length;

          // Dynamically calculate accurate progress
          let calculatedProgress = goal.progress;
          if (milestones.length > 0) {
            calculatedProgress = Math.round((completedMilestones / milestones.length) * 100);
          } else if (tasks.length > 0) {
            calculatedProgress = Math.round((completedTasks / tasks.length) * 100);
          }

          const daysInfo = getDaysRemainingText(goal.target_date);

          return (
            <div
              key={goal.id}
              className="journal-paper p-5 flex flex-col justify-between space-y-4 hover:border-[var(--border-strong)] transition-all group"
            >
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-strong)]">
                      {goal.category}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md capitalize ${
                      goal.priority === 'high' 
                        ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' 
                        : goal.priority === 'medium'
                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    }`}>
                      {goal.priority} priority
                    </span>
                    {goal.status === 'completed' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Completed ✓
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateGoal(goal.id, { is_favorite: !goal.is_favorite })}
                      className="p-1 rounded-lg text-[var(--text-muted)] hover:text-amber-500 transition-colors"
                      title={goal.is_favorite ? 'Favorited' : 'Favorite'}
                    >
                      <Star className={`w-4 h-4 ${goal.is_favorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500 transition-colors"
                      title="Move to Trash"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <a href={`/goals/${goal.id}`} className="block group-hover:text-[var(--accent)] transition-colors">
                  <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)] leading-snug">
                    {goal.title}
                  </h3>
                </a>

                {goal.description && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {goal.description}
                  </p>
                )}

                {goal.why_it_matters && (
                  <p className="text-[11px] text-[var(--text-muted)] italic line-clamp-1">
                    Why: {goal.why_it_matters}
                  </p>
                )}
              </div>

              {/* Progress & Milestones Bar */}
              <div className="space-y-2.5 pt-2 border-t border-[var(--border-color)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">
                    Progress: {calculatedProgress}%
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {milestones.length > 0 ? `${completedMilestones} of ${milestones.length} milestones` : `${completedTasks} of ${tasks.length} tasks`}
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full h-2 rounded-full bg-[var(--bg-paper-subtle)] overflow-hidden border border-[var(--border-color)]">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, calculatedProgress))}%` }}
                  />
                </div>

                {/* Days remaining & Link */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  {goal.target_date ? (
                    <span className={`flex items-center gap-1 font-medium ${
                      daysInfo.isOverdue 
                        ? 'text-red-600 dark:text-red-400' 
                        : daysInfo.isDueToday 
                        ? 'text-amber-600 dark:text-amber-400 font-semibold' 
                        : 'text-[var(--text-muted)]'
                    }`}>
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{daysInfo.text}</span>
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">No deadline set</span>
                  )}

                  <a
                    href={`/goals/${goal.id}`}
                    className="flex items-center gap-1 text-[var(--accent)] font-medium hover:underline text-xs"
                  >
                    <span>View Details</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}

        {filteredGoals.length === 0 && (
          <div className="col-span-full py-16 text-center journal-paper p-8 space-y-3">
            <Target className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
            <h4 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
              No goals found
            </h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              {searchQuery || selectedCategory !== 'All' 
                ? 'Try adjusting your search or category filter.' 
                : 'Create a big goal and break it down into milestones and tasks.'}
            </p>
            <Button size="sm" variant="primary" onClick={() => setShowNewGoalModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Create Your First Goal</span>
            </Button>
          </div>
        )}
      </div>

      {/* New Goal Modal */}
      {showNewGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg journal-paper p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif-aesthetic font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
                <Target className="w-5 h-5 text-[var(--accent)]" />
                <span>Create New Goal</span>
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setShowNewGoalModal(false)}>
                Cancel
              </Button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Submit Plant Disease Research Paper"
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="High-level overview of what success looks like..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as GoalCategory)}
                    className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as GoalPriority)}
                    className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Start Date</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={e => setNewStartDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">Target Date</label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={e => setNewTargetDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Why does this goal matter? (Optional)
                </label>
                <input
                  type="text"
                  value={newWhy}
                  onChange={e => setNewWhy(e.target.value)}
                  placeholder="Your deep motivation for completing this..."
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowNewGoalModal(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Goal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
