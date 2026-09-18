'use client';

import React, { useState } from 'react';
import { QuoteContent } from '@/lib/types';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { Quote } from 'lucide-react';

interface QuoteBlockProps {
  content: QuoteContent;
  onChange: (updated: QuoteContent) => void;
}

export function QuoteBlock({ content, onChange }: QuoteBlockProps) {
  const [data, setData] = useState<QuoteContent>(
    content || {
      text: 'Consistent habits create a brighter you.',
      author: 'Daily Reflection',
    }
  );

  useAutosave(data, (latest) => {
    onChange(latest);
  });

  return (
    <div className="my-3 p-4 sm:p-5 rounded-2xl bg-[var(--accent-soft)]/50 border border-[var(--border-color)] relative">
      <Quote className="w-6 h-6 text-[var(--accent)] opacity-40 mb-2" />
      <textarea
        value={data.text}
        onChange={(e) => setData((prev) => ({ ...prev, text: e.target.value }))}
        placeholder="Inspirational quote or personal mantra..."
        rows={2}
        className="w-full font-serif-aesthetic italic text-base sm:text-lg text-[var(--text-primary)] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded p-1 resize-none"
      />
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-[var(--text-muted)]">—</span>
        <input
          type="text"
          value={data.author || ''}
          onChange={(e) => setData((prev) => ({ ...prev, author: e.target.value }))}
          placeholder="Author / Source..."
          className="text-xs font-medium text-[var(--text-secondary)] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded px-1.5 py-0.5"
        />
      </div>
    </div>
  );
}
