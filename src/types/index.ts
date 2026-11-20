export type Pillar = 'Algorithms' | 'Decomposition' | 'Patterns' | 'Abstraction' | 'Assessment';

export type ChallengeKind = 'o' | 'g' | 'm' | 'a';

export type RobotCmd = 'F' | 'L' | 'R';

export type ProgramItem =
  | { kind: 'cmd'; id: string; cmd: RobotCmd }
  | { kind: 'loop'; id: string; count: number; body: Array<{ id: string; cmd: RobotCmd }> };

export interface AssessmentQuestion {
  prompt: string;
  code?: string;
  options: string[];
  correctIndex: number;
  topic: Exclude<Pillar, 'Assessment'>;
  explanation: string;
}

export interface CurriculumItem {
  index: number;
  moduleIndex: number;
  levelNumber: number; // 1..32 for levels, 0 for assessments
  pillar: Pillar;
  title: string;
  type: ChallengeKind;
  concept: string;
  question: string;
  hint: string;
  nudgeHint?: string;
  // Ordering ('o')
  items?: string[];
  sequenceExplanation?: string;
  // Robot Grid ('g')
  map?: string[];
  maxBlocks?: number;
  parBlocks?: number;
  allowLoops?: boolean;
  startPos?: [number, number, number]; // [row, col, dir] 0=E,1=S,2=W,3=N
  // Multiple Choice ('m')
  code?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  optionFeedback?: string[];
  // Assessment ('a')
  questions?: AssessmentQuestion[];
}

export interface ModuleDefinition {
  id: number;
  title: string;
  description: string;
  focusLabel: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  pillar: Exclude<Pillar, 'Assessment'>;
  prompt: string;
  code?: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  iconName: 'compass' | 'bug' | 'repeat' | 'cpu' | 'code' | 'trophy';
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type MotionPreference = 'system' | 'reduced' | 'full';
export type TextSize = 'standard' | 'large' | 'xl';

export interface UserSettings {
  theme: ThemeMode;
  soundEnabled: boolean;
  motionPreference: MotionPreference;
  textSize: TextSize;
}

export interface CodexProgress {
  done: Record<number, number>; // index -> stars (1..3)
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  completedDailyDates: string[];
  unlockedAchievements: string[];
  settings: UserSettings;
}
