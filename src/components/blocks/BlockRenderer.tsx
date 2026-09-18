'use client';

import React from 'react';
import { PageBlock, BlockType } from '@/lib/types';
import { HeadingBlock } from './HeadingBlock';
import { ParagraphBlock } from './ParagraphBlock';
import { ChecklistBlock } from './ChecklistBlock';
import { ScheduleBlock } from './ScheduleBlock';
import { HabitGridBlock } from './HabitGridBlock';
import { StudyLogBlock } from './StudyLogBlock';
import { ChallengeBlock } from './ChallengeBlock';
import { WaterTrackerBlock } from './WaterTrackerBlock';
import { MoodSleepBlock } from './MoodSleepBlock';
import { MealPlannerBlock } from './MealPlannerBlock';
import { WinsReflectionBlock } from './WinsReflectionBlock';
import { QuoteBlock } from './QuoteBlock';
import { DividerBlock } from './DividerBlock';
import { ChevronUp, ChevronDown, Copy, Trash2, GripVertical } from 'lucide-react';

interface BlockRendererProps {
  block: PageBlock;
  index: number;
  totalBlocks: number;
  onUpdate: (updatedBlock: PageBlock) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onInsertBelow: (type: BlockType) => void;
}

export function BlockRenderer({
  block,
  index,
  totalBlocks,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: BlockRendererProps) {
  const handleContentChange = (newContent: any) => {
    onUpdate({
      ...block,
      content: newContent,
      updated_at: new Date().toISOString(),
    });
  };

  const renderContent = () => {
    switch (block.type) {
      case 'heading':
        return <HeadingBlock content={block.content as any} onChange={handleContentChange} />;
      case 'paragraph':
        return <ParagraphBlock content={block.content as any} onChange={handleContentChange} />;
      case 'checklist':
        return <ChecklistBlock content={block.content as any} onChange={handleContentChange} />;
      case 'schedule':
        return <ScheduleBlock content={block.content as any} onChange={handleContentChange} />;
      case 'habit_matrix':
        return <HabitGridBlock content={block.content as any} onChange={handleContentChange} />;
      case 'study_log':
        return <StudyLogBlock content={block.content as any} onChange={handleContentChange} />;
      case 'challenge_grid':
        return <ChallengeBlock content={block.content as any} onChange={handleContentChange} />;
      case 'water_tracker':
        return <WaterTrackerBlock content={block.content as any} onChange={handleContentChange} />;
      case 'mood_sleep':
        return <MoodSleepBlock content={block.content as any} onChange={handleContentChange} />;
      case 'meal_planner':
        return <MealPlannerBlock content={block.content as any} onChange={handleContentChange} />;
      case 'wins_reflection':
        return <WinsReflectionBlock content={block.content as any} onChange={handleContentChange} />;
      case 'quote':
        return <QuoteBlock content={block.content as any} onChange={handleContentChange} />;
      case 'divider':
        return <DividerBlock content={block.content as any} onChange={handleContentChange} />;
      default:
        return (
          <div className="p-4 rounded-xl journal-paper-subtle text-xs text-[var(--text-muted)]">
            Unsupported block type: {block.type}
          </div>
        );
    }
  };

  return (
    <div className="group relative rounded-2xl transition-all my-2">
      {/* Block Hover Action Controls */}
      <div className="absolute -top-3 right-3 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-[var(--bg-paper)] py-1 px-1.5 rounded-xl border border-[var(--border-strong)] shadow-md z-20 transition-opacity">
        {/* Drag handle icon */}
        <span className="p-1 text-[var(--text-muted)] cursor-grab">
          <GripVertical className="w-3.5 h-3.5" />
        </span>

        {/* Move Up */}
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] disabled:opacity-30 disabled:pointer-events-none"
          title="Move up"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        {/* Move Down */}
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === totalBlocks - 1}
          className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] disabled:opacity-30 disabled:pointer-events-none"
          title="Move down"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Duplicate */}
        <button
          type="button"
          onClick={onDuplicate}
          className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]"
          title="Duplicate block"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          title="Delete block"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Block Body */}
      {renderContent()}
    </div>
  );
}
