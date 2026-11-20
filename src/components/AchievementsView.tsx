import React from 'react';
import { Bug, Code2, Compass, Cpu, Repeat, Trophy } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/curriculum';
import { CodexProgress, Pillar } from '../types';
import { getAchievementProgress, getPillarStats } from '../utils/storage';

interface AchievementsViewProps {
  progress: CodexProgress;
}

function renderIcon(name: (typeof ACHIEVEMENTS)[number]['iconName']) {
  switch (name) {
    case 'compass':
      return <Compass className="w-4 h-4 sm:w-5 sm:h-5" />;
    case 'bug':
      return <Bug className="w-4 h-4 sm:w-5 sm:h-5" />;
    case 'repeat':
      return <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />;
    case 'cpu':
      return <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />;
    case 'code':
      return <Code2 className="w-4 h-4 sm:w-5 sm:h-5" />;
    case 'trophy':
      return <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />;
  }
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({ progress }) => {
  const achMap = getAchievementProgress(progress);
  const pillarStats = getPillarStats(progress.done);
  const unlockedCount = Object.values(achMap).filter((a) => a.unlocked).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#FFFFFF]">
          Achievements & Mastery
        </h1>
        <p className="text-[#64748B] dark:text-[#F8FAFC]/80 text-base mt-1 tabular-nums">
          {unlockedCount} of {ACHIEVEMENTS.length} badges unlocked through real milestones.
        </p>
      </div>

      {/* Compact 3x2 Achievement Grid (3 badges on row 1, 3 on row 2) */}
      <section
        aria-label="Unlockable badges"
        className="grid grid-cols-3 gap-2.5 sm:gap-3.5"
      >
        {ACHIEVEMENTS.map((ach) => {
          const status = achMap[ach.id];
          const pct = Math.round((status.current / status.target) * 100);
          return (
            <div
              key={ach.id}
              className={`squircle-card border p-3 sm:p-4 transition-all flex flex-col justify-between ${
                status.unlocked
                  ? 'bg-[#FFFFFF] dark:bg-[#0F172A] border-[#10B981] shadow-xs'
                  : 'bg-[#FFFFFF]/85 dark:bg-[#0F172A] border-[#64748B]/25 opacity-85'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 squircle-node flex items-center justify-center shrink-0 ${
                      status.unlocked
                        ? 'bg-[#10B981] text-[#FFFFFF]'
                        : 'bg-[#F8FAFC] dark:bg-[#FFFFFF]/10 text-[#64748B]'
                    }`}
                  >
                    {renderIcon(ach.iconName)}
                  </div>

                  <span
                    className={`text-[11px] font-bold tabular-nums ${
                      status.unlocked
                        ? 'text-[#10B981]'
                        : 'text-[#64748B] dark:text-[#F8FAFC]/70'
                    }`}
                  >
                    {status.unlocked ? 'Unlocked' : `${status.current}/${status.target}`}
                  </span>
                </div>

                <h2 className="font-display font-bold text-xs sm:text-sm text-[#0F172A] dark:text-[#FFFFFF] leading-snug">
                  {ach.title}
                </h2>
                <p className="hidden sm:block text-[11px] text-[#64748B] dark:text-[#F8FAFC]/75 mt-1 leading-snug">
                  {ach.description}
                </p>
              </div>

              <div className="mt-2.5 h-1.5 w-full bg-[#F8FAFC] dark:bg-[#FFFFFF]/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    status.unlocked
                      ? 'bg-[#10B981]'
                      : 'bg-[#312E81]/60 dark:bg-[#7C3AED]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* Computational Thinking Pillars */}
      <section
        aria-labelledby="pillars-heading"
        className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-6 shadow-xs"
      >
        <h2
          id="pillars-heading"
          className="font-display text-lg font-extrabold text-[#0F172A] dark:text-[#FFFFFF] mb-1"
        >
          Computational Thinking Pillars
        </h2>
        <p className="text-sm text-[#64748B] dark:text-[#F8FAFC]/80 mb-5">
          Live completion across the four core pillars of the CODEX curriculum.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.keys(pillarStats) as Array<Exclude<Pillar, 'Assessment'>>).map(
            (pillar) => {
              const { completed, total } = pillarStats[pillar];
              const pct = Math.round((completed / Math.max(1, total)) * 100);
              return (
                <div key={pillar} className="space-y-2">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-display font-bold text-[#0F172A] dark:text-[#FFFFFF]">
                      {pillar}
                    </span>
                    <span className="text-xs font-bold text-[#312E81] dark:text-[#3B82F6] tabular-nums">
                      {completed} / {total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#F8FAFC] dark:bg-[#FFFFFF]/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#312E81] dark:bg-[#7C3AED] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>
    </div>
  );
};
