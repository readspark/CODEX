import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  GitBranch,
  Layers,
  Lock,
  Play,
  Star,
  Terminal,
  Workflow,
} from 'lucide-react';
import { CURRICULUM, MODULES } from '../data/curriculum';
import { CodexProgress } from '../types';
import { getNextAvailableIndex, isItemUnlocked } from '../utils/storage';

interface LearningPathProps {
  progress: CodexProgress;
  onSelectLevel: (index: number) => void;
}

const MODULE_ICONS = [Workflow, Layers, GitBranch, Terminal];

export const LearningPath: React.FC<LearningPathProps> = ({
  progress,
  onSelectLevel,
}) => {
  const nextIndex = getNextAvailableIndex(progress.done);
  const defaultExpandedMod = CURRICULUM[nextIndex]?.moduleIndex ?? 0;
  const [expanded, setExpanded] = useState<Record<number, boolean>>({
    [defaultExpandedMod]: true,
  });

  const toggleModule = (modIdx: number) => {
    setExpanded((prev) => ({ ...prev, [modIdx]: !prev[modIdx] }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#FFFFFF]">
          Learning Journey
        </h1>
        <p className="text-[#64748B] dark:text-[#F8FAFC]/80 text-base mt-1">
          32 hands-on levels and 4 module assessments across 4 progressive modules.
        </p>
      </div>

      <div className="space-y-4">
        {MODULES.map((mod, modIdx) => {
          const modItems = CURRICULUM.filter((c) => c.moduleIndex === modIdx);
          const completedCount = modItems.filter((c) => Boolean(progress.done[c.index])).length;
          const pct = Math.round((completedCount / modItems.length) * 100);
          const isOpen = Boolean(expanded[modIdx]);
          const ModIcon = MODULE_ICONS[modIdx] ?? Workflow;
          const isModuleComplete = completedCount === modItems.length;

          return (
            <section
              key={mod.id}
              aria-labelledby={`module-title-${mod.id}`}
              className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card shadow-xs overflow-hidden"
            >
              {/* Module Header */}
              <button
                type="button"
                onClick={() => toggleModule(modIdx)}
                aria-expanded={isOpen}
                className="w-full text-left p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 hover:bg-[#F8FAFC]/70 dark:hover:bg-[#FFFFFF]/5 transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div
                    className={`w-12 h-12 squircle-node flex items-center justify-center shrink-0 ${
                      isModuleComplete
                        ? 'bg-[#10B981] text-[#FFFFFF]'
                        : 'bg-[#312E81]/10 dark:bg-[#7C3AED]/20 text-[#312E81] dark:text-[#3B82F6]'
                    }`}
                  >
                    <ModIcon className="w-6 h-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#64748B] dark:text-[#F8FAFC]/75">
                      Module 0{mod.id} · {mod.focusLabel}
                    </div>
                    <h2
                      id={`module-title-${mod.id}`}
                      className="font-display text-lg sm:text-xl font-extrabold text-[#0F172A] dark:text-[#FFFFFF] mt-0.5"
                    >
                      {mod.title}
                    </h2>
                    <p className="text-sm text-[#64748B] dark:text-[#F8FAFC]/80 mt-0.5">
                      {mod.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-sm font-extrabold tabular-nums ${
                        isModuleComplete
                          ? 'text-[#10B981]'
                          : 'text-[#312E81] dark:text-[#3B82F6]'
                      }`}
                    >
                      {pct}%
                    </div>
                    <div className="text-xs text-[#64748B] dark:text-[#F8FAFC]/75 tabular-nums">
                      {completedCount} / {modItems.length} cleared
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-[#64748B] dark:text-[#F8FAFC]/75" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#64748B] dark:text-[#F8FAFC]/75" />
                  )}
                </div>
              </button>

              {/* Module Progress Bar */}
              <div className="px-5 sm:px-6 pb-4">
                <div className="h-2 w-full bg-[#F8FAFC] dark:bg-[#FFFFFF]/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isModuleComplete ? 'bg-[#10B981]' : 'bg-[#312E81] dark:bg-[#7C3AED]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Expandable Level List */}
              {isOpen && (
                <div className="border-t border-[#64748B]/25 p-4 sm:p-6 bg-[#F8FAFC] dark:bg-[#FFFFFF]/5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {modItems.map((item) => {
                      const stars = progress.done[item.index] ?? 0;
                      const isDone = stars > 0;
                      const unlocked = isItemUnlocked(item.index, progress.done);
                      const isCurrent = item.index === nextIndex && !isDone;
                      const isAssessment = item.type === 'a';

                      return (
                        <button
                          key={item.index}
                          type="button"
                          disabled={!unlocked}
                          onClick={() => onSelectLevel(item.index)}
                          className={`text-left p-4 squircle-btn border transition-all flex flex-col justify-between min-h-[118px] ${
                            !unlocked
                              ? 'bg-[#F8FAFC] dark:bg-[#0F172A]/60 border-[#64748B]/20 text-[#64748B] cursor-not-allowed'
                              : isCurrent
                              ? 'bg-[#FFFFFF] dark:bg-[#0F172A] border-2 border-[#7C3AED] dark:border-[#3B82F6] shadow-sm'
                              : isDone
                              ? 'bg-[#FFFFFF] dark:bg-[#0F172A] border-[#10B981]/55 hover:border-[#10B981]'
                              : 'bg-[#FFFFFF] dark:bg-[#0F172A] border-[#64748B]/25 hover:border-[#312E81]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-9 h-9 squircle-node flex items-center justify-center text-xs font-extrabold shrink-0 tabular-nums ${
                                  !unlocked
                                    ? 'bg-[#64748B]/20 text-[#64748B]'
                                    : isDone
                                    ? 'bg-[#10B981] text-[#FFFFFF]'
                                    : isCurrent
                                    ? 'bg-[#7C3AED] text-[#FFFFFF]'
                                    : isAssessment
                                    ? 'bg-[#312E81] text-[#FFFFFF]'
                                    : 'bg-[#3B82F6]/15 text-[#312E81] dark:text-[#3B82F6]'
                                }`}
                              >
                                {!unlocked ? (
                                  <Lock className="w-4 h-4" />
                                ) : isDone ? (
                                  <Check className="w-4 h-4" />
                                ) : isAssessment ? (
                                  <ClipboardCheck className="w-4 h-4" />
                                ) : (
                                  item.levelNumber
                                )}
                              </span>

                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-[#64748B] dark:text-[#F8FAFC]/75">
                                  {isAssessment
                                    ? 'Module Assessment'
                                    : `Level ${item.levelNumber} · ${item.pillar}`}
                                </div>
                                <div
                                  className={`font-display font-bold text-sm truncate ${
                                    unlocked
                                      ? 'text-[#0F172A] dark:text-[#FFFFFF]'
                                      : 'text-[#64748B]'
                                  }`}
                                >
                                  {item.title}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-[#64748B]/15 flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#64748B] dark:text-[#F8FAFC]/75">
                              {!unlocked
                                ? 'Locked'
                                : isDone
                                ? 'Completed'
                                : isCurrent
                                ? 'Up Next'
                                : 'Unlocked'}
                            </span>

                            {isDone ? (
                              <div className="flex items-center gap-0.5" aria-label={`${stars} of 3 stars`}>
                                {[1, 2, 3].map((n) => (
                                  <Star
                                    key={n}
                                    className={`w-3.5 h-3.5 ${
                                      n <= stars
                                        ? 'text-[#F59E0B] fill-[#F59E0B]'
                                        : 'text-[#64748B]/30'
                                    }`}
                                  />
                                ))}
                              </div>
                            ) : unlocked ? (
                              <span className="inline-flex items-center gap-1 font-bold text-[#312E81] dark:text-[#3B82F6]">
                                <Play className="w-3 h-3 fill-current" />
                                Start
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
