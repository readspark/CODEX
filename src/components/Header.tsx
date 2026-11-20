import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { CodexLogo } from './CodexLogo';

export type CodexView = 'dashboard' | 'path' | 'achievements' | 'settings' | 'play';

interface HeaderProps {
  currentView: CodexView;
  onNavigate: (view: CodexView) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const links: Array<{ label: string; view: CodexView }> = [
    { label: 'Dashboard', view: 'dashboard' },
    { label: 'Learning Path', view: 'path' },
    { label: 'Achievements', view: 'achievements' },
    { label: 'Settings', view: 'settings' },
  ];

  const handleNav = (view: CodexView) => {
    onNavigate(view);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 dark:bg-[#0F172A]/95 backdrop-blur-xs border-b border-[#64748B]/25">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Brand mark */}
        <button
          type="button"
          onClick={() => handleNav('dashboard')}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 rounded-xl focus-visible:outline-2"
          aria-label="CODEX Dashboard"
        >
          <CodexLogo size={32} />
          <span className="font-display text-xl font-extrabold tracking-tight text-[#0F172A] dark:text-[#FFFFFF]">
            CODEX
          </span>
        </button>

        {/* Single-line nav links */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#64748B] dark:text-[#F8FAFC]/80"
        >
          {links.map((item) => {
            const active = currentView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => handleNav(item.view)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  active
                    ? 'border-[#312E81] dark:border-[#3B82F6] text-[#312E81] dark:text-[#3B82F6]'
                    : 'border-transparent hover:text-[#0F172A] dark:hover:text-[#FFFFFF] hover:border-[#64748B]/40'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 squircle-btn border border-[#64748B]/25 text-[#0F172A] dark:text-[#FFFFFF] hover:bg-[#F8FAFC] dark:hover:bg-[#FFFFFF]/10"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#64748B]/25 bg-[#FFFFFF] dark:bg-[#0F172A] px-4 py-3 space-y-1">
          {links.map((item) => {
            const active = currentView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => handleNav(item.view)}
                className={`w-full text-left px-3.5 py-2.5 squircle-btn text-sm font-semibold min-h-[44px] flex items-center ${
                  active
                    ? 'bg-[#312E81]/10 dark:bg-[#7C3AED]/20 text-[#312E81] dark:text-[#3B82F6]'
                    : 'text-[#0F172A] dark:text-[#FFFFFF] hover:bg-[#F8FAFC] dark:hover:bg-[#FFFFFF]/10'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
