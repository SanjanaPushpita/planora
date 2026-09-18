'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { usePlanner } from '@/lib/storage';
import { Lock, ShieldCheck, User } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { profile, updateProfile, lock } = usePlanner();

  const [name, setName] = useState(profile.name || '');
  const [tagline, setTagline] = useState(profile.tagline || '');
  const [passcode, setPasscode] = useState(profile.passcode || '');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateProfile({
        name: name.trim() || 'Sophia',
        tagline: tagline.trim(),
        passcode: passcode.trim() || undefined,
      });
      setSuccessMessage('Profile and privacy preferences updated!');
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockNow = async () => {
    await lock();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Personal Journal Profile & Privacy" maxWidth="md">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl journal-paper-subtle">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              This Journal Belongs To
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Your personal identity in Planora
            </p>
          </div>
        </div>

        <Input
          label="Your Name / Signature"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sophia"
          required
        />

        <Input
          label="Personal Tagline / Motto"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="e.g. Consistent habits create a brighter you"
        />

        <div className="pt-2 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-[var(--text-secondary)]" />
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Privacy Passcode (Optional)
            </label>
          </div>
          <Input
            type="password"
            placeholder="Enter passcode to protect journal"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-normal">
            When set, your planner requires this passcode to open and can be locked with one click.
          </p>
        </div>

        {profile.passcode && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
            <span className="text-xs text-amber-800 dark:text-amber-200 font-medium">
              Journal is passcode protected
            </span>
            <button
              type="button"
              onClick={handleLockNow}
              className="text-xs px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
            >
              Lock Now
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
