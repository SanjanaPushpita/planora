'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';
import { sanitizeHtml } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  compact?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write thoughts, reflections, or notes here...',
  className = '',
  minHeight = '60px',
  compact = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromPropRef = useRef(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
  });
  const [isFocused, setIsFocused] = useState(false);

  // Sync prop value into editor DOM if changed externally
  useEffect(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    const sanitizedVal = sanitizeHtml(value || '');

    // Avoid overwriting if currently focused and DOM already matches
    if (currentHtml !== sanitizedVal && !isUpdatingFromPropRef.current) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = sanitizedVal;
      }
    }
    isUpdatingFromPropRef.current = false;
  }, [value]);

  // Check active formatting state based on current cursor selection
  const updateActiveFormats = useCallback(() => {
    if (typeof document === 'undefined') return;
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        unorderedList: document.queryCommandState('insertUnorderedList'),
        orderedList: document.queryCommandState('insertOrderedList'),
      });
    } catch {
      // queryCommandState might fail in non-editable states
    }
  }, []);

  const handleInput = () => {
    if (!editorRef.current) return;
    isUpdatingFromPropRef.current = true;
    const raw = editorRef.current.innerHTML;
    // Check if effectively empty (<p><br></p> or <br> or whitespace)
    const textContent = editorRef.current.textContent || '';
    if (!textContent.trim() && (raw === '<br>' || raw === '<p><br></p>' || raw === '<div><br></div>')) {
      onChange('');
    } else {
      const sanitized = sanitizeHtml(raw);
      onChange(sanitized);
    }
    updateActiveFormats();
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleInput();
    updateActiveFormats();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    if (modKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        executeCommand('bold');
      } else if (key === 'i') {
        e.preventDefault();
        executeCommand('italic');
      } else if (key === 'u') {
        e.preventDefault();
        executeCommand('underline');
      }
      // Note: Ctrl/Cmd + S is purposely NOT intercepted so that Planora's global Save continues to work!
    }
  };

  // Check if editor has text or content
  const isEmpty = !value || value.trim() === '' || value === '<p><br></p>' || value === '<br>';

  return (
    <div className={`relative flex flex-col rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper-subtle)] transition-colors focus-within:border-[var(--accent)] ${className}`}>
      {/* Compact Formatting Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-[var(--border-color)]/60 bg-[var(--bg-paper)]/70 rounded-t-xl select-none">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('bold');
          }}
          className={`p-1 rounded-md text-xs transition-colors ${
            activeFormats.bold
              ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs font-bold'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('italic');
          }}
          className={`p-1 rounded-md text-xs transition-colors ${
            activeFormats.italic
              ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs italic'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('underline');
          }}
          className={`p-1 rounded-md text-xs transition-colors ${
            activeFormats.underline
              ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs underline'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
          }`}
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <div className="h-3 w-px bg-[var(--border-color)] mx-1" />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('insertUnorderedList');
          }}
          className={`p-1 rounded-md text-xs transition-colors ${
            activeFormats.unorderedList
              ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
          }`}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('insertOrderedList');
          }}
          className={`p-1 rounded-md text-xs transition-colors ${
            activeFormats.orderedList
              ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editable Content Area */}
      <div className="relative flex-1 p-2.5">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onFocus={() => {
            setIsFocused(true);
            updateActiveFormats();
          }}
          onBlur={() => {
            setIsFocused(false);
            handleInput();
          }}
          style={{ minHeight }}
          className="rich-text-content outline-none text-xs sm:text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap break-words"
        />

        {isEmpty && !isFocused && (
          <div
            onClick={() => editorRef.current?.focus()}
            className="absolute top-2.5 left-2.5 text-xs sm:text-sm text-[var(--text-muted)] pointer-events-none italic select-none"
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
