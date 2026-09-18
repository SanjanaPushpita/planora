'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-1';
    
    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5',
      icon: 'p-2 rounded-lg',
    };

    const variants = {
      primary: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] shadow-sm focus:ring-[var(--accent)]',
      secondary: 'bg-[var(--accent-soft)] hover:bg-[var(--border-strong)] text-[var(--text-primary)] focus:ring-[var(--border-strong)]',
      ghost: 'bg-transparent hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:ring-[var(--border-color)]',
      danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm focus:ring-red-400',
      outline: 'border border-[var(--border-strong)] bg-transparent hover:bg-[var(--bg-paper-hover)] text-[var(--text-primary)] focus:ring-[var(--border-strong)]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(base, sizes[size], variants[variant], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
