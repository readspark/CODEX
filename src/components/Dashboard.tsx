import React from 'react';
import { ArrowRight, Zap } from 'lucide-react';
import { CURRICULUM, MODULES } from '../data/curriculum';
import { CodexProgress } from '../types';
import { getNextAvailableIndex } from '../utils/storage';
import { playClick } from '../utils/sound';
import { CodexLogo } from './CodexLogo';

interface DashboardProps {
  progress: CodexProgress;
  onPlayLevel: (index: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  progress,
  onPlayLevel,
}) => {
  const totalItems = CURRICULUM.length;
  const completedCount = Object.keys(progress.done).filter((k) =>
    Boolean(progress.done[Number(k)])
  ).length;
  const overallPct = Math.round((completedCount / totalItems) * 100);

  const nextIdx = getNextAvailableIndex(progress.done);
  const nextItem = CURRICULUM[nextIdx] ?? CURRICULUM[0];
  const currentModule = MODULES[nextItem.moduleIndex] ?? MODULES[0];
  const modItems = CURRICULUM.filter((c) => c.moduleIndex === nextItem.moduleIndex);
  const modDone = modItems.filter((c) => Boolean(progress.done[c.index])).length;
  const modPct = Math.round((modDone / modItems.length) * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Welcome Hero Section */}
      <section className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-3">
              <CodexLogo size={42} />
              <div>
                <div className="font-display text-sm font-extrabold tracking-wide text-[#312E81] dark:text-[#3B82F6]">
                  CODEX
                </div>
                <div className="text-xs font-medium text-[#64748B] dark:text-[#F8FAFC]/75">
                  Where Curiosity Becomes Code.
                </div>
              </div>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#FFFFFF] text-balance leading-tight">
              {completedCount === 0
                ? 'Welcome to your interactive coding universe'
                : completedCount === totalItems
                ? 'Course Complete — You mastered every CODEX module!'
                : 'Pick up right where your curiosity left off'}
            </h1>

            <p className="text-[#64748B] dark:text-[#F8FAFC]/80 text-base leading-relaxed max-w-2xl">
              Explore computational thinking through tactile puzzles, visual robot programming, and real Python logic — one focused challenge at a time.
            </p>

            {/* Overall Progress Bar */}
            <div className="max-w-md space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#64748B] dark:text-[#F8FAFC]/80 tabular-nums">
                <span>Curriculum Progress</span>
                <span>
                  {completedCount} / {totalItems} complete ({overallPct}%)
                </span>
              </div>
              <div className="h-2.5 w-full bg-[#F8FAFC] dark:bg-[#FFFFFF]/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#312E81] dark:bg-[#7C3AED] transition-all duration-300"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>

            {/* Total XP Earned */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-[#312E81]/10 dark:bg-[#7C3AED]/20 border border-[#312E81]/25 dark:border-[#7C3AED]/40 squircle-btn min-h-[48px]">
                <Zap className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-xs font-bold text-[#64748B] dark:text-[#F8FAFC]/80">
                  Total XP Earned:
                </span>
                <span className="font-display text-lg font-extrabold text-[#312E81] dark:text-[#3B82F6] tabular-nums">
                  {progress.xp} XP
                </span>
              </div>
            </div>
          </div>

          {/* Highlighted Continue Learning Card */}
          <div className="lg:col-span-4 bg-[#FFFFFF] text-[#0F172A] squircle-card p-5 space-y-4 border border-[#64748B]/25 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#0F172A] font-semibold">
              <span>Continue Learning</span>
              <span className="tabular-nums text-[#0F172A]">{modPct}% Module</span>
            </div>

            <div>
              <div className="text-xs text-[#0F172A]">
                Module 0{currentModule.id} · {currentModule.title}
              </div>
              <div className="font-display text-lg font-extrabold text-[#0F172A] mt-1">
                {nextItem.type === 'a'
                  ? nextItem.title
                  : `Level ${nextItem.levelNumber}: ${nextItem.title}`}
              </div>
              <p className="text-xs text-[#0F172A] mt-1 line-clamp-2">
                {nextItem.concept}
              </p>
            </div>

            <div className="h-2 w-full bg-[#64748B]/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#10B981] transition-all duration-300"
                style={{ width: `${modPct}%` }}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                playClick(progress.settings.soundEnabled);
                onPlayLevel(nextIdx);
              }}
              className="w-full py-2.5 px-4 bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-[#FFFFFF] font-extrabold text-sm squircle-btn min-h-[44px] flex items-center justify-center gap-2 transition-colors"
            >
              <span>
                {nextItem.type === 'a'
                  ? 'Take Assessment'
                  : `Continue Level ${nextItem.levelNumber}`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
