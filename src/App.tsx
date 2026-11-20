import { useEffect, useState } from 'react';
import { Award, X, Zap } from 'lucide-react';
import { ACHIEVEMENTS, CURRICULUM } from './data/curriculum';
import { CodexProgress, UserSettings } from './types';
import {
  computeNextStreak,
  evaluateAchievements,
  getNextAvailableIndex,
  loadProgress,
  resetAllProgress,
  saveProgress,
} from './utils/storage';
import { playUnlock } from './utils/sound';
import { AchievementsView } from './components/AchievementsView';
import { Dashboard } from './components/Dashboard';
import { CodexView, Header } from './components/Header';
import { LearningPath } from './components/LearningPath';
import { LevelPlayer } from './components/LevelPlayer';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [progress, setProgress] = useState<CodexProgress>(() => loadProgress());
  const [view, setView] = useState<CodexView>('dashboard');
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    getNextAvailableIndex(loadProgress().done)
  );
  const [toast, setToast] = useState<{
    xp?: number;
    badgeTitle?: string;
  } | null>(null);

  // Persist progress whenever it changes
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  // Apply theme ('light' | 'dark' | 'system')
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const mode = progress.settings.theme;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const useDark = mode === 'dark' || (mode === 'system' && prefersDark);
      root.classList.toggle('dark', useDark);
    };
    applyTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', applyTheme);
    return () => mq.removeEventListener('change', applyTheme);
  }, [progress.settings.theme]);

  // Apply text size and motion preference
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.textSize = progress.settings.textSize;
    root.classList.toggle(
      'reduce-motion',
      progress.settings.motionPreference === 'reduced'
    );
    root.classList.toggle(
      'force-motion',
      progress.settings.motionPreference === 'full'
    );
  }, [progress.settings.textSize, progress.settings.motionPreference]);

  // Auto-dismiss subtle celebration toast
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const openLevel = (index: number) => {
    setActiveIndex(index);
    setView('play');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCompleteItem = (
    index: number,
    stars: 1 | 2 | 3,
    xpGain: number
  ) => {
    setProgress((prev) => {
      const prevStars = prev.done[index] ?? 0;
      const streakUpdate = computeNextStreak(prev);
      const nextProgress: CodexProgress = {
        ...prev,
        done: {
          ...prev.done,
          [index]: Math.max(prevStars, stars),
        },
        xp: prev.xp + xpGain,
        streak: streakUpdate.streak,
        lastActiveDate: streakUpdate.lastActiveDate,
      };
      const nextUnlocked = evaluateAchievements(nextProgress);
      const newlyUnlocked = nextUnlocked.filter(
        (id) => !prev.unlockedAchievements.includes(id)
      );
      nextProgress.unlockedAchievements = nextUnlocked;

      if (newlyUnlocked.length > 0) {
        const badge = ACHIEVEMENTS.find((a) => a.id === newlyUnlocked[0]);
        playUnlock(prev.settings.soundEnabled);
        setToast({
          xp: xpGain > 0 ? xpGain : undefined,
          badgeTitle: badge?.title,
        });
      } else if (xpGain > 0) {
        setToast({ xp: xpGain });
      }

      return nextProgress;
    });
  };

  const handleUpdateSettings = (patch: Partial<UserSettings>) => {
    setProgress((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...patch,
      },
    }));
  };

  const handleResetProgress = () => {
    const fresh = resetAllProgress(progress.settings);
    setProgress(fresh);
    setActiveIndex(0);
    setView('dashboard');
  };

  const activeItem = CURRICULUM[activeIndex] ?? CURRICULUM[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#FFFFFF]">
      <Header
        currentView={view}
        onNavigate={(nextView) => {
          setView(nextView);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <main className="flex-1">
        {view === 'dashboard' && (
          <Dashboard
            progress={progress}
            onPlayLevel={openLevel}
          />
        )}

        {view === 'path' && (
          <LearningPath progress={progress} onSelectLevel={openLevel} />
        )}

        {view === 'achievements' && <AchievementsView progress={progress} />}

        {view === 'settings' && (
          <SettingsView
            settings={progress.settings}
            onUpdateSettings={handleUpdateSettings}
            onResetProgress={handleResetProgress}
          />
        )}

        {view === 'play' && (
          <LevelPlayer
            item={activeItem}
            progress={progress}
            onCompleteItem={handleCompleteItem}
            onGoToIndex={openLevel}
            onBackToPath={() => setView('path')}
            onBackToDashboard={() => setView('dashboard')}
          />
        )}
      </main>

      {/* Subtle XP / Achievement Unlock Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-40 bg-[#0F172A] text-[#FFFFFF] border border-[#312E81] dark:border-[#7C3AED] squircle-card px-4 py-3 shadow-xl flex items-center gap-3 max-w-xs"
        >
          <div className="w-9 h-9 squircle-node bg-[#312E81] text-[#3B82F6] flex items-center justify-center shrink-0">
            {toast.badgeTitle ? (
              <Award className="w-5 h-5 text-[#F59E0B]" />
            ) : (
              <Zap className="w-5 h-5 text-[#10B981]" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-xs">
            {toast.badgeTitle && (
              <div className="font-display font-extrabold text-[#F59E0B]">
                Badge Unlocked: {toast.badgeTitle}
              </div>
            )}
            {toast.xp && (
              <div className="font-bold text-[#FFFFFF] tabular-nums">
                +{toast.xp} XP added to your profile
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="text-[#64748B] hover:text-[#FFFFFF]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
