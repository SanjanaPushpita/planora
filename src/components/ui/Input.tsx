'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-all duration-150',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-100',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
