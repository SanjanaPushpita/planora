'use client';

import React, { useState } from 'react';
import { WaterTrackerContent } from '@/lib/types';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { Droplet, Plus, Minus } from 'lucide-react';

interface WaterTrackerBlockProps {
  content: WaterTrackerContent;
  onChange: (updatedContent: WaterTrackerContent) => void;
}

export function WaterTrackerBlock({ content, onChange }: WaterTrackerBlockProps) {
  const [data, setData] = useState<WaterTrackerContent>(
    content || {
      date: new Date().toISOString().split('T')[0],
      targetGlasses: 8,
      consumedGlasses: 0,
    }
  );

  useAutosave(data, (latest) => {
    onChange(latest);
  });

  const target = Math.max(1, data.targetGlasses || 8);
  const consumed = Math.max(0, data.consumedGlasses || 0);

  const handleToggleGlass = (index: number) => {
    const newConsumed = index + 1 === consumed ? index : index + 1;
    setData((prev) => ({ ...prev, consumedGlasses: newConsumed }));
  };

  const glasses = Array.from({ length: target }, (_, i) => i);

  return (
    <div className="journal-paper p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Label & Stats */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
          <Droplet className="w-5 h-5 fill-current" />
        </div>
        <div>
          <h4 className="font-serif-aesthetic text-sm sm:text-base font-semibold text-[var(--text-primary)]">
            Daily Water Hydration
          </h4>
          <p className="text-xs text-[var(--text-secondary)]">
            {consumed} of {target} glasses ({consumed * 250}ml / {target * 250}ml)
          </p>
        </div>
      </div>

      {/* Interactive Water Drops / Glasses */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {glasses.map((i) => {
          const isFilled = i < consumed;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleToggleGlass(i)}
              className={`p-2 rounded-xl border transition-all duration-150 active:scale-90 ${
                isFilled
                  ? 'bg-cyan-500 border-cyan-500 text-white shadow-xs'
                  : 'bg-[var(--bg-paper-subtle)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-cyan-400'
              }`}
              title={`Glass ${i + 1}: ${isFilled ? 'Drank' : 'Click to log'}`}
            >
              <Droplet className={`w-4 h-4 ${isFilled ? 'fill-white' : ''}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
