import { CURRICULUM } from '../data/curriculum';
import { CodexProgress, Pillar, UserSettings } from '../types';

const CODEX_STORAGE_KEY = 'codex_v1';
const LEGACY_STORAGE_KEY = 'cs2';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  soundEnabled: true,
  motionPreference: 'system',
  textSize: 'standard',
};

export const DEFAULT_PROGRESS: CodexProgress = {
  done: {},
  xp: 0,
  streak: 0,
  lastActiveDate: null,
  completedDailyDates: [],
  unlockedAchievements: [],
  settings: { ...DEFAULT_SETTINGS },
};

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayKey(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getAchievementProgress(progress: CodexProgress): Record<
  string,
  { unlocked: boolean; current: number; target: number }
> {
  const done = progress.done;
  const totalDone = Object.keys(done).filter((k) => Boolean(done[Number(k)])).length;

  const bugIndices = [6, 31];
  const bugDone = bugIndices.filter((i) => Boolean(done[i])).length;

  const loopIndices = CURRICULUM.filter((c) => c.type === 'g' && c.allowLoops).map(
    (c) => c.index
  );
  const loopDone = loopIndices.filter((i) => Boolean(done[i])).length;

  const mod3Indices = CURRICULUM.filter((c) => c.moduleIndex === 2).map((c) => c.index);
  const mod3Done = mod3Indices.filter((i) => Boolean(done[i])).length;

  const mod4Indices = CURRICULUM.filter((c) => c.moduleIndex === 3).map((c) => c.index);
  const mod4Done = mod4Indices.filter((i) => Boolean(done[i])).length;

  return {
    first_steps: {
      unlocked: totalDone >= 1,
      current: Math.min(1, totalDone),
      target: 1,
    },
    bug_hunter: {
      unlocked: bugDone === bugIndices.length,
      current: bugDone,
      target: bugIndices.length,
    },
    loop_master: {
      unlocked: loopDone === loopIndices.length,
      current: loopDone,
      target: loopIndices.length,
    },
    logic_legend: {
      unlocked: mod3Done === mod3Indices.length,
      current: mod3Done,
      target: mod3Indices.length,
    },
    python_explorer: {
      unlocked: mod4Done === mod4Indices.length,
      current: mod4Done,
      target: mod4Indices.length,
    },
    codex_champion: {
      unlocked: totalDone === CURRICULUM.length,
      current: totalDone,
      target: CURRICULUM.length,
    },
  };
}

export function evaluateAchievements(progress: CodexProgress): string[] {
  const map = getAchievementProgress(progress);
  const merged = new Set(progress.unlockedAchievements);
  for (const [id, status] of Object.entries(map)) {
    if (status.unlocked) {
      merged.add(id);
    }
  }
  return Array.from(merged);
}

export function loadProgress(): CodexProgress {
  try {
    const rawCodex = localStorage.getItem(CODEX_STORAGE_KEY);
    if (rawCodex) {
      const parsed = JSON.parse(rawCodex) as Partial<CodexProgress>;
      const base: CodexProgress = {
        ...DEFAULT_PROGRESS,
        ...parsed,
        done: parsed.done ?? {},
        completedDailyDates: parsed.completedDailyDates ?? [],
        unlockedAchievements: parsed.unlockedAchievements ?? [],
        settings: {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings ?? {}),
        },
      };
      base.unlockedAchievements = evaluateAchievements(base);
      return base;
    }

    // Safe migration from legacy CodeSprout ("cs2") storage
    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawLegacy) {
      const legacy = JSON.parse(rawLegacy) as { done?: Record<number, number>; xp?: number };
      if (legacy && typeof legacy === 'object' && legacy.done) {
        const migrated: CodexProgress = {
          ...DEFAULT_PROGRESS,
          done: legacy.done,
          xp: typeof legacy.xp === 'number' ? legacy.xp : 0,
        };
        migrated.unlockedAchievements = evaluateAchievements(migrated);
        saveProgress(migrated);
        return migrated;
      }
    }
  } catch {
    // Fallback cleanly if storage is unavailable
  }
  return { ...DEFAULT_PROGRESS, settings: { ...DEFAULT_SETTINGS } };
}

export function saveProgress(progress: CodexProgress): void {
  try {
    localStorage.setItem(CODEX_STORAGE_KEY, JSON.stringify(progress));
    // Keep legacy key synced so no progress is ever lost across views
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ done: progress.done, xp: progress.xp })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function resetAllProgress(keepSettings?: UserSettings): CodexProgress {
  const fresh: CodexProgress = {
    ...DEFAULT_PROGRESS,
    settings: keepSettings ? { ...keepSettings } : { ...DEFAULT_SETTINGS },
  };
  saveProgress(fresh);
  return fresh;
}

export function computeNextStreak(progress: CodexProgress): {
  streak: number;
  lastActiveDate: string;
} {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  if (progress.lastActiveDate === today) {
    return { streak: Math.max(1, progress.streak), lastActiveDate: today };
  }
  if (progress.lastActiveDate === yesterday) {
    return { streak: progress.streak + 1, lastActiveDate: today };
  }
  return { streak: 1, lastActiveDate: today };
}

export function isItemUnlocked(index: number, done: Record<number, number>): boolean {
  if (index === 0) return true;
  return Boolean(done[index - 1]);
}

export function getNextAvailableIndex(done: Record<number, number>): number {
  const idx = CURRICULUM.findIndex((_, i) => !done[i]);
  return idx === -1 ? 0 : idx;
}

export function getPillarStats(
  done: Record<number, number>
): Record<Exclude<Pillar, 'Assessment'>, { completed: number; total: number }> {
  const stats: Record<Exclude<Pillar, 'Assessment'>, { completed: number; total: number }> = {
    Algorithms: { completed: 0, total: 0 },
    Decomposition: { completed: 0, total: 0 },
    Patterns: { completed: 0, total: 0 },
    Abstraction: { completed: 0, total: 0 },
  };

  for (const item of CURRICULUM) {
    if (item.pillar === 'Assessment') continue;
    stats[item.pillar].total += 1;
    if (done[item.index]) {
      stats[item.pillar].completed += 1;
    }
  }
  return stats;
}
