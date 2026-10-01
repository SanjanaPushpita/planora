'use client';

import React from 'react';
import Link from 'next/navigation';
import { usePathname } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { 
  Home, 
  Calendar, 
  Layout, 
  GraduationCap, 
  Flame, 
  BookOpen, 
  FileText, 
  Plus, 
  Star, 
  Trash2, 
  Settings, 
  ChevronRight,
  Heart,
  Footprints
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewPageModal: () => void;
}

export function Sidebar({ isOpen, onClose, onOpenNewPageModal }: SidebarProps) {
  const pathname = usePathname();
  const { pages, favorites, recentPages, trashPages, profile } = usePlanner();

  const mainNav = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Walk Tracker', href: '/walks', icon: Footprints },
    { name: 'Habit Hub', href: '/habits', icon: Layout },
    { name: 'Study Tracker', href: '/study', icon: GraduationCap },
    { name: 'Challenges', href: '/challenges', icon: Flame },
    { name: 'All Pages', href: '/pages', icon: FileText, count: pages.length },
  ];

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-40 w-64 flex flex-col bg-[var(--bg-paper)] border-r border-[var(--border-color)] transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand / Journal Belonging Banner */}
        <div className="p-4 border-b border-[var(--border-color)]">
          <a
            href="/"
            className="flex items-center gap-2.5 group"
            onClick={() => onClose()}
          >
            <div className="w-8 h-8 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-serif-aesthetic font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
              P
            </div>
            <div>
              <h1 className="font-serif-aesthetic text-base font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
                Planora
              </h1>
              <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <span>{profile.name}&apos;s Sanctuary</span>
                <Heart className="w-2.5 h-2.5 text-[var(--accent)] fill-[var(--accent)] opacity-70" />
              </p>
            </div>
          </a>
        </div>

        {/* Primary Action Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onClose();
              onOpenNewPageModal();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--border-strong)] text-[var(--text-primary)] font-medium text-xs border border-[var(--border-strong)] transition-all shadow-2xs group"
          >
            <Plus className="w-4 h-4 text-[var(--accent)] group-hover:rotate-90 transition-transform duration-200" />
            <span>New Page / Tracker</span>
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          {/* Main Views */}
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => onClose()}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        active ? 'bg-white/20 text-white' : 'bg-[var(--bg-paper-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>

          {/* Favorites */}
          {favorites.length > 0 && (
            <div>
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span>Favorites</span>
              </div>
              <div className="space-y-0.5">
                {favorites.map((fav) => (
                  <a
                    key={fav.id}
                    href={`/pages/${fav.id}`}
                    onClick={() => onClose()}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-colors truncate ${
                      pathname === `/pages/${fav.id}`
                        ? 'bg-[var(--accent-soft)] font-medium text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
                    }`}
                  >
                    <span className="text-sm shrink-0">{fav.icon}</span>
                    <span className="truncate">{fav.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Recent Pages */}
          {recentPages.length > 0 && (
            <div>
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                <span>Recent Pages</span>
                <a
                  href="/pages"
                  className="hover:text-[var(--accent)] text-[10px] lowercase"
                  onClick={() => onClose()}
                >
                  view all
                </a>
              </div>
              <div className="space-y-0.5">
                {recentPages.slice(0, 5).map((page) => (
                  <a
                    key={page.id}
                    href={`/pages/${page.id}`}
                    onClick={() => onClose()}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-colors truncate ${
                      pathname === `/pages/${page.id}`
                        ? 'bg-[var(--accent-soft)] font-medium text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
                    }`}
                  >
                    <span className="text-sm shrink-0">{page.icon}</span>
                    <span className="truncate">{page.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions: Settings & Trash */}
        <div className="p-3 border-t border-[var(--border-color)] space-y-1">
          <a
            href="/trash"
            onClick={() => onClose()}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              pathname === '/trash'
                ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Trash Bin</span>
            </div>
            {trashPages.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-semibold">
                {trashPages.length}
              </span>
            )}
          </a>

          <a
            href="/settings"
            onClick={() => onClose()}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              pathname === '/settings'
                ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
            }`}
          >
            <Settings className="w-4 h-4 text-[var(--text-muted)]" />
            <span>Settings & Backup</span>
          </a>
        </div>
      </aside>
    </>
  );
}
