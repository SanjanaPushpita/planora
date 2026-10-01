'use client';

import React, { useState, useEffect } from 'react';
import { ParagraphContent } from '@/lib/types';
import { RichTextEditor } from '../ui/RichTextEditor';

interface ParagraphBlockProps {
  content: ParagraphContent;
  onChange: (updated: ParagraphContent) => void;
}

export function ParagraphBlock({ content, onChange }: ParagraphBlockProps) {
  const [data, setData] = useState<ParagraphContent>(content || { text: '' });

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

  return (
    <div className="my-2">
      <RichTextEditor
        value={data.text || ''}
        onChange={handleChange}
        placeholder="Type notes, reflections, thoughts, or journal entries here... Select text or use Ctrl+B / Ctrl+I to format"
        minHeight="72px"
      />
    </div>
  );
}

