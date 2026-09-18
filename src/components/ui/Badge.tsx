'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'muted';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variants = {
    default: 'bg-[var(--bg-paper-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)]',
    accent: 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium border border-[var(--border-strong)]',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    muted: 'bg-black/5 dark:bg-white/5 text-[var(--text-muted)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full tracking-wide',
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
