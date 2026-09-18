'use client';

import React, { useState } from 'react';
import { HeadingContent } from '@/lib/types';
import { useAutosave } from '@/lib/hooks/useAutosave';

interface HeadingBlockProps {
  content: HeadingContent;
  onChange: (updated: HeadingContent) => void;
}

export function HeadingBlock({ content, onChange }: HeadingBlockProps) {
  const [data, setData] = useState<HeadingContent>(content || { text: 'Heading', level: 2 });

  useAutosave(data, (latest) => {
    onChange(latest);
  });

  const levelStyles = {
    1: 'font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight',
    2: 'font-serif-aesthetic text-xl sm:text-2xl font-semibold',
    3: 'font-serif-aesthetic text-lg sm:text-xl font-medium',
  };

  return (
    <div className="group relative my-2">
      <input
        type="text"
        value={data.text}
        onChange={(e) => setData((prev) => ({ ...prev, text: e.target.value }))}
        placeholder="Heading..."
        className={`w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded px-1.5 py-1 text-[var(--text-primary)] ${
          levelStyles[data.level || 2]
        }`}
      />
      {/* Level Switcher on hover */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-[var(--bg-paper)] p-1 rounded-lg border border-[var(--border-color)] shadow-xs transition-opacity">
        {([1, 2, 3] as const).map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setData((prev) => ({ ...prev, level: lvl }))}
            className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
              data.level === lvl
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]'
            }`}
          >
            H{lvl}
          </button>
        ))}
      </div>
    </div>
  );
}
