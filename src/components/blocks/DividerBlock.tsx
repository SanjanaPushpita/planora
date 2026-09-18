'use client';

import React from 'react';
import { Heart, Sparkles, Minus } from 'lucide-react';

interface DividerBlockProps {
  content?: { style?: 'heart' | 'leaf' | 'line' };
  onChange?: (updated: { style?: 'heart' | 'leaf' | 'line' }) => void;
}

export function DividerBlock({ content, onChange }: DividerBlockProps) {
  const style = content?.style || 'heart';

  const toggleStyle = () => {
    if (!onChange) return;
    const nextStyle = style === 'heart' ? 'leaf' : style === 'leaf' ? 'line' : 'heart';
    onChange({ style: nextStyle });
  };

  return (
    <div
      onClick={toggleStyle}
      className="my-6 flex items-center justify-center gap-3 text-[var(--border-strong)] cursor-pointer group select-none py-1"
      title="Click to cycle divider style (heart / leaf / line)"
    >
      <span className="w-16 sm:w-24 h-px bg-[var(--border-color)] group-hover:bg-[var(--accent)] transition-colors" />
      {style === 'heart' && (
        <Heart className="w-3.5 h-3.5 text-[var(--accent)] fill-[var(--accent)] group-hover:scale-125 transition-transform" />
      )}
      {style === 'leaf' && (
        <span className="text-sm group-hover:scale-125 transition-transform">🌿</span>
      )}
      {style === 'line' && (
        <span className="w-2 h-2 rounded-full bg-[var(--accent)] group-hover:scale-125 transition-transform" />
      )}
      <span className="w-16 sm:w-24 h-px bg-[var(--border-color)] group-hover:bg-[var(--accent)] transition-colors" />
    </div>
  );
}
