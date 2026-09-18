'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { usePlanner } from '@/lib/storage';
import { PageType } from '@/lib/types';
import { getTodayDateString } from '@/lib/utils';
import { 
  Sparkles, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  BookOpen, 
  Flame, 
  GraduationCap, 
  FileText, 
  Layout, 
  Sliders 
} from 'lucide-react';

interface NewPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: PageType;
}

interface TemplateOption {
  type: PageType;
  name: string;
  description: string;
  icon: string;
  IconComponent: React.ComponentType<{ className?: string }>;
}

const TEMPLATES: TemplateOption[] = [
  {
    type: 'daily',
    name: 'Daily Planner',
    description: 'Priorities, hourly schedule, meals, water, mood, sleep, and reflections',
    icon: '✨',
    IconComponent: Sparkles,
  },
  {
    type: 'habit',
    name: 'Habit Tracker',
    description: 'Monthly matrix (1..31 days) with custom habits, streaks, and completion %',
    icon: '🌿',
    IconComponent: Layout,
  },
  {
    type: 'study',
    name: 'Study Tracker',
    description: 'Course & topic logs, target vs actual hours, notes, and study grid',
    icon: '📚',
    IconComponent: GraduationCap,
  },
  {
    type: 'challenge',
    name: 'Challenge Tracker',
    description: '7, 21, 30, 60, 75, 100-day or custom challenge with numbered day cards',
    icon: '🌸',
    IconComponent: Flame,
  },
  {
    type: 'checklist',
    name: 'Checklist / To-Do',
    description: 'Clean reorderable task list with checkoffs and priorities',
    icon: '📝',
    IconComponent: CheckSquare,
  },
  {
    type: 'journal',
    name: 'Journal & Notes',
    description: 'Freeform aesthetic writing space for thoughts, reflections, and ideas',
    icon: '📖',
    IconComponent: BookOpen,
  },
  {
    type: 'monthly',
    name: 'Monthly Planner',
    description: 'Monthly focus, milestone checklist, and overview notes',
    icon: '🗓️',
    IconComponent: CalendarIcon,
  },
  {
    type: 'blank',
    name: 'Blank Canvas',
    description: 'Start with an empty page and add modular blocks as you go',
    icon: '📄',
    IconComponent: FileText,
  },
  {
    type: 'custom',
    name: 'Custom Tracker',
    description: 'Build your own custom tracker with flexible block tools',
    icon: '💡',
    IconComponent: Sliders,
  },
];

export function NewPageModal({ isOpen, onClose, defaultType }: NewPageModalProps) {
  const router = useRouter();
  const { createPage } = usePlanner();

  const [selectedType, setSelectedType] = useState<PageType>(defaultType || 'daily');
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('✨');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Challenge specific options
  const [challengeDays, setChallengeDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState<string>('30');
  const [challengeStartDate, setChallengeStartDate] = useState(getTodayDateString());

  // Daily specific options
  const [plannerDate, setPlannerDate] = useState(getTodayDateString());

  const handleTypeSelect = (template: TemplateOption) => {
    setSelectedType(template.type);
    setIcon(template.icon);
    if (!title || TEMPLATES.some(t => title.startsWith(t.name))) {
      if (template.type === 'daily') {
        setTitle(`Daily Planner - ${plannerDate}`);
      } else if (template.type === 'challenge') {
        setTitle('30-Day Challenge');
      } else {
        setTitle(template.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalTitle = title.trim() || `${TEMPLATES.find(t => t.type === selectedType)?.name || 'Untitled'}`;
      
      const metadata: Record<string, any> = {};
      if (selectedType === 'challenge') {
        metadata.totalDays = challengeDays === -1 ? (parseInt(customDays, 10) || 30) : challengeDays;
        metadata.startDate = challengeStartDate;
        metadata.title = finalTitle;
      }

      const newPage = await createPage({
        title: finalTitle,
        page_type: selectedType,
        icon,
        date: selectedType === 'daily' ? plannerDate : undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      onClose();
      // Reset form
      setTitle('');
      setIsSubmitting(false);
      router.push(`/pages/${newPage.id}`);
    } catch (err) {
      console.error('Failed to create page:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Page / Planner" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Selector Grid */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
            Select Template / Starting Point
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {TEMPLATES.map((tmpl) => {
              const isSelected = selectedType === tmpl.type;
              return (
                <button
                  key={tmpl.type}
                  type="button"
                  onClick={() => handleTypeSelect(tmpl)}
                  className={`flex flex-col items-start p-3 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-xs ring-1 ring-[var(--accent)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-paper)] hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{tmpl.icon}</span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {tmpl.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-tight">
                    {tmpl.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Page Title & Icon */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Icon
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={4}
              className="w-full text-center py-2 text-xl rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              title="Emoji or icon"
            />
          </div>
          <div className="sm:col-span-3">
            <Input
              label="Page Name (You can customize anytime)"
              placeholder="e.g. Daily Planner - Sept 18, MSc Study Tracker, Gym Routine..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Challenge Extra Options */}
        {selectedType === 'challenge' && (
          <div className="p-4 rounded-xl journal-paper-subtle space-y-3">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              Challenge Duration (Days)
            </label>
            <div className="flex flex-wrap gap-2">
              {[7, 21, 30, 60, 75, 100].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setChallengeDays(days)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                    challengeDays === days
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]'
                      : 'bg-[var(--bg-paper)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  {days} Days
                </button>
              ))}
              <button
                type="button"
                onClick={() => setChallengeDays(-1)}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                  challengeDays === -1
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]'
                    : 'bg-[var(--bg-paper)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)]'
                }`}
              >
                Custom
              </button>
            </div>
            {challengeDays === -1 && (
              <Input
                type="number"
                label="Custom Number of Days"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                min="1"
                max="365"
              />
            )}
            <Input
              type="date"
              label="Start Date"
              value={challengeStartDate}
              onChange={(e) => setChallengeStartDate(e.target.value)}
            />
          </div>
        )}

        {/* Daily Planner Date Option */}
        {selectedType === 'daily' && (
          <div className="p-3.5 rounded-xl journal-paper-subtle">
            <Input
              type="date"
              label="Planner Date"
              value={plannerDate}
              onChange={(e) => {
                setPlannerDate(e.target.value);
                if (!title || title.startsWith('Daily Planner')) {
                  setTitle(`Daily Planner - ${e.target.value}`);
                }
              }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Page'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
