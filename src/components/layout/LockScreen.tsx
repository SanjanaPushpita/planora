'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/storage';
import { Button } from '../ui/Button';
import { Lock, Heart, KeyRound, Sparkles } from 'lucide-react';

export function LockScreen() {
  const { profile, unlock } = usePlanner();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;
    setIsUnlocking(true);
    setError(false);

    const success = await unlock(passcode);
    if (!success) {
      setError(true);
      setIsUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-main)]">
      {/* Aesthetic Paper Cover Frame inspired by reference image 2 */}
      <div className="relative w-full max-w-md p-8 sm:p-12 journal-paper border-2 border-[var(--border-strong)] text-center shadow-2xl space-y-6">
        {/* Subtle decorative inner border */}
        <div className="absolute inset-3 border border-[var(--border-color)] rounded-xl pointer-events-none" />

        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1">
            PRIVATE DIGITAL PLANNER
          </p>
          <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            This Journal Belongs To
          </h2>
          <div className="mt-3 text-lg font-serif-aesthetic italic text-[var(--accent)]">
            {profile.name}
          </div>

          {/* Heart / Botanical divider inspired by Reference 2 */}
          <div className="flex items-center justify-center gap-3 my-4 text-[var(--text-muted)]">
            <span className="w-12 h-px bg-[var(--border-strong)]" />
            <Heart className="w-3.5 h-3.5 text-[var(--accent)] fill-[var(--accent)]" />
            <span className="w-12 h-px bg-[var(--border-strong)]" />
          </div>

          <p className="text-xs text-[var(--text-secondary)]">
            {profile.tagline || 'Please enter your passcode to unlock your sanctuary'}
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4 max-w-xs mx-auto pt-2">
          <div className="relative">
            <input
              type="password"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(false);
              }}
              placeholder="Enter passcode"
              autoFocus
              className="w-full text-center px-4 py-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] text-lg tracking-widest focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium">
              Incorrect passcode. Please try again.
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5"
            disabled={isUnlocking || !passcode}
          >
            <KeyRound className="w-4 h-4 mr-2" />
            {isUnlocking ? 'Unlocking...' : 'Open Journal'}
          </Button>
        </form>
      </div>
    </div>
  );
}
