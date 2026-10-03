'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Planora Error Boundary caught an error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 journal-paper border-2 border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 rounded-2xl max-w-xl mx-auto text-center space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 stroke-[2]" />
          </div>

          <div className="space-y-1">
            <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
              {this.props.fallbackTitle || 'Something interrupted this view'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {this.props.fallbackMessage || 'A temporary issue occurred while rendering this section. Your underlying data is safe and protected.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold transition-transform hover:scale-[1.02]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>

            <a
              href="/"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Return to Dashboard</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
