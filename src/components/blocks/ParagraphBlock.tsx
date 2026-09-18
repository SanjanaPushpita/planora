'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ParagraphContent } from '@/lib/types';

interface ParagraphBlockProps {
  content: ParagraphContent;
  onChange: (updated: ParagraphContent) => void;
}

export function ParagraphBlock({ content, onChange }: ParagraphBlockProps) {
  const [data, setData] = useState<ParagraphContent>(content || { text: '' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (content) {
      setData(content);
    }
  }, [content]);

  const handleChange = (text: string) => {
    const next = { text };
    setData(next);
    onChange(next);
  };

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(60, textareaRef.current.scrollHeight)}px`;
    }
  }, [data.text]);

  return (
    <div className="my-2">
      <textarea
        ref={textareaRef}
        value={data.text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Type notes, journal entries, bullet thoughts, or ideas here..."
        className="w-full text-sm leading-relaxed text-[var(--text-primary)] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded p-2 resize-none placeholder-[var(--text-muted)]"
        rows={2}
      />
    </div>
  );
}
