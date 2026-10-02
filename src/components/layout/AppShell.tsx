'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { NewPageModal } from '../modals/NewPageModal';
import { AuthModal } from '../modals/AuthModal';
import { LockScreen } from './LockScreen';
import { useKeyboard } from '@/lib/hooks/useKeyboard';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLocked, isReady } = usePlanner();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Global hotkeys
  useKeyboard({
    onSearch: () => setIsSearchOpen(true),
    onEscape: () => {
      setIsSearchOpen(false);
      setIsNewPageModalOpen(false);
      setIsAuthModalOpen(false);
      setIsSidebarOpen(false);
    },
    onToggleSidebar: () => setIsSidebarOpen((prev) => !prev),
    onLearningSprint: () => router.push('/sprint'),
  });

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-serif-aesthetic font-bold text-xl animate-pulse">
            P
          </div>
          <p className="text-xs font-serif-aesthetic italic text-[var(--text-secondary)]">
            Opening your journal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Privacy Passcode Guard */}
      {isLocked && <LockScreen />}

      {/* Collapsible Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenNewPageModal={() => setIsNewPageModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNewPageModal={() => setIsNewPageModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenNewPageModal={() => {
          setIsSearchOpen(false);
          setIsNewPageModalOpen(true);
        }}
      />

      <NewPageModal
        isOpen={isNewPageModalOpen}
        onClose={() => setIsNewPageModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
