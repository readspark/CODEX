import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  Minus,
  Pause,
  Play,
  Plus,
  Redo2,
  Repeat,
  RotateCcw,
  SkipForward,
  Star,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { CurriculumItem, ProgramItem, RobotCmd } from '../types';
import { playClick, playError, playStep, playSuccess } from '../utils/sound';

const DR = [0, 1, 0, -1];
const DC = [1, 0, -1, 0];
const DIR_NAMES = ['East (Right)', 'South (Down)', 'West (Left)', 'North (Up)'];
const CMD_LABELS: Record<RobotCmd, string> = {
  F: 'Move',
  L: 'Turn Left',
  R: 'Turn Right',
};

interface FlattenedStep {
  cmd: RobotCmd;
  blockId: string;
  innerId?: string;
  loopPass?: number;
  loopTotal?: number;
}

interface SimFrame {
  row: number;
  col: number;
  dir: number;
  stepNum: number;
  blockId?: string;
  innerId?: string;
  logText: string;
}

interface SimTrace {
  frames: SimFrame[];
  errorMsg: string | null;
  reachedGoal: boolean;
}

interface RobotPlaygroundProps {
  level: CurriculumItem;
  soundEnabled: boolean;
  onSuccess: (stars: 1 | 2 | 3, explanation: string, isPar: boolean) => void;
  onAttemptFail: () => void;
  triesCount: number;
  isSolved: boolean;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function countBlocks(prog: ProgramItem[]): number {
  return prog.reduce(
    (sum, item) => sum + (item.kind === 'loop' ? 1 + item.body.length : 1),
    0
  );
}

function flattenProgram(prog: ProgramItem[]): FlattenedStep[] {
  const out: FlattenedStep[] = [];
  for (const item of prog) {
    if (item.kind === 'cmd') {
      out.push({ cmd: item.cmd, blockId: item.id });
    } else {
      for (let pass = 1; pass <= item.count; pass++) {
        for (const inner of item.body) {
          out.push({
            cmd: inner.cmd,
            blockId: item.id,
            innerId: inner.id,
            loopPass: pass,
            loopTotal: item.count,
          });
        }
      }
    }
  }
  return out;
}

function simulateProgram(
  map: string[],
  start: [number, number, number],
  steps: FlattenedStep[]
): SimTrace {
  let [r, c, d] = start;
  const frames: SimFrame[] = [
    {
      row: r,
      col: c,
      dir: d,
      stepNum: 0,
      logText: `Start at Row ${r + 1}, Col ${c + 1} facing ${DIR_NAMES[d]}.`,
    },
  ];

  let errorMsg: string | null = null;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const stepNum = i + 1;
    const loopInfo =
      s.loopPass !== undefined ? ` (Loop ${s.loopPass}/${s.loopTotal})` : '';

    if (s.cmd === 'L') {
      d = (d + 3) % 4;
      frames.push({
        row: r,
        col: c,
        dir: d,
        stepNum,
        blockId: s.blockId,
        innerId: s.innerId,
        logText: `Step ${stepNum}: Turn Left${loopInfo} — now facing ${DIR_NAMES[d]}.`,
      });
    } else if (s.cmd === 'R') {
      d = (d + 1) % 4;
      frames.push({
        row: r,
        col: c,
        dir: d,
        stepNum,
        blockId: s.blockId,
        innerId: s.innerId,
        logText: `Step ${stepNum}: Turn Right${loopInfo} — now facing ${DIR_NAMES[d]}.`,
      });
    } else {
      const nr = r + DR[d];
      const nc = c + DC[d];
      const rowStr = map[nr];
      const cell = rowStr ? rowStr[nc] : undefined;

      if (cell === undefined) {
        errorMsg = `Step ${stepNum}${loopInfo}: The robot tried to move ${DIR_NAMES[d]} off the edge of the board from Row ${r + 1}, Col ${c + 1}. Add a turn or remove an extra Move.`;
        frames.push({
          row: r,
          col: c,
          dir: d,
          stepNum,
          blockId: s.blockId,
          innerId: s.innerId,
          logText: `Step ${stepNum}: Blocked at grid boundary facing ${DIR_NAMES[d]}.`,
        });
        break;
      }
      if (cell === '#') {
        errorMsg = `Step ${stepNum}${loopInfo}: The robot bumped into a wall at Row ${nr + 1}, Col ${nc + 1} while moving ${DIR_NAMES[d]}. Turn before reaching that wall!`;
        frames.push({
          row: r,
          col: c,
          dir: d,
          stepNum,
          blockId: s.blockId,
          innerId: s.innerId,
          logText: `Step ${stepNum}: Hit wall at Row ${nr + 1}, Col ${nc + 1}.`,
        });
        break;
      }

      r = nr;
      c = nc;
      frames.push({
        row: r,
        col: c,
        dir: d,
        stepNum,
        blockId: s.blockId,
        innerId: s.innerId,
        logText: `Step ${stepNum}: Moved ${DIR_NAMES[d]} to Row ${r + 1}, Col ${c + 1}${loopInfo}.`,
      });
    }
  }

  const last = frames[frames.length - 1];
  const reachedGoal = !errorMsg && map[last.row]?.[last.col] === 'G';

  return { frames, errorMsg, reachedGoal };
}

export const RobotPlayground: React.FC<RobotPlaygroundProps> = ({
  level,
  soundEnabled,
  onSuccess,
  onAttemptFail,
  triesCount,
  isSolved,
}) => {
  const map = level.map ?? ['S...G'];
  const startPos: [number, number, number] = level.startPos ?? [0, 0, 0];
  const maxBlocks = level.maxBlocks ?? 8;
  const parBlocks = level.parBlocks ?? maxBlocks;

  const [program, setProgram] = useState<ProgramItem[]>([]);
  const [undoStack, setUndoStack] = useState<ProgramItem[][]>([]);
  const [redoStack, setRedoStack] = useState<ProgramItem[][]>([]);
  const [activeLoopId, setActiveLoopId] = useState<string | null>(null);

  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [execStatus, setExecStatus] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');
  const [trace, setTrace] = useState<SimTrace | null>(null);
  const [frameCursor, setFrameCursor] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{
    kind: 'error' | 'info' | 'success';
    text: string;
  } | null>(null);

  const timerRef = useRef<number | null>(null);

  // Reset workspace when changing level
  useEffect(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setProgram([]);
    setUndoStack([]);
    setRedoStack([]);
    setActiveLoopId(null);
    setExecStatus('idle');
    setTrace(null);
    setFrameCursor(0);
    setStatusMessage(null);
  }, [level.index]);

  const blocksUsed = useMemo(() => countBlocks(program), [program]);

  const currentFrame: SimFrame = useMemo(() => {
    if (trace && trace.frames[frameCursor]) {
      return trace.frames[frameCursor];
    }
    return {
      row: startPos[0],
      col: startPos[1],
      dir: startPos[2],
      stepNum: 0,
      logText: `Ready at Row ${startPos[0] + 1}, Col ${startPos[1] + 1}.`,
    };
  }, [trace, frameCursor, startPos]);

  const historyLogs = useMemo(() => {
    if (!trace) return [];
    return trace.frames.slice(0, frameCursor + 1).map((f) => f.logText);
  }, [trace, frameCursor]);

  const commitProgram = (next: ProgramItem[]) => {
    setUndoStack((u) => [...u.slice(-24), program]);
    setRedoStack([]);
    setProgram(next);
    // Reset any stale playback state on edit
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setExecStatus('idle');
    setTrace(null);
    setFrameCursor(0);
    setStatusMessage(null);
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || execStatus === 'running') return;
    playClick(soundEnabled);
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, program]);
    setProgram(prev);
    if (activeLoopId && !prev.some((i) => i.id === activeLoopId)) {
      setActiveLoopId(null);
    }
    setTrace(null);
    setFrameCursor(0);
    setExecStatus('idle');
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || execStatus === 'running') return;
    playClick(soundEnabled);
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, program]);
    setProgram(next);
    setTrace(null);
    setFrameCursor(0);
    setExecStatus('idle');
  };

  const addCmd = (cmd: RobotCmd) => {
    if (execStatus === 'running') return;
    if (blocksUsed >= maxBlocks) {
      playError(soundEnabled);
      setStatusMessage({
        kind: 'info',
        text: `Block limit reached (${maxBlocks}/${maxBlocks}). ${
          level.allowLoops
            ? 'Try grouping repeated moves inside a Loop block!'
            : 'Remove an unnecessary block to make room.'
        }`,
      });
      return;
    }
    playClick(soundEnabled);
    const newCmd = { id: makeId(), cmd };
    if (activeLoopId) {
      const targetExists = program.some((i) => i.id === activeLoopId && i.kind === 'loop');
      if (targetExists) {
        commitProgram(
          program.map((item) =>
            item.id === activeLoopId && item.kind === 'loop'
              ? { ...item, body: [...item.body, newCmd] }
              : item
          )
        );
        return;
      }
    }
    commitProgram([...program, { kind: 'cmd', id: newCmd.id, cmd }]);
  };

  const addLoop = (count = 3) => {
    if (execStatus === 'running') return;
    if (blocksUsed >= maxBlocks) {
      playError(soundEnabled);
      setStatusMessage({
        kind: 'info',
        text: `Block limit reached (${maxBlocks}/${maxBlocks}). Remove a block first.`,
      });
      return;
    }
    playClick(soundEnabled);
    const loopId = makeId();
    commitProgram([...program, { kind: 'loop', id: loopId, count, body: [] }]);
    setActiveLoopId(loopId);
  };

  const removeTopItem = (id: string) => {
    if (execStatus === 'running') return;
    playClick(soundEnabled);
    if (activeLoopId === id) setActiveLoopId(null);
    commitProgram(program.filter((i) => i.id !== id));
  };

  const removeLoopInner = (loopId: string, innerId: string) => {
    if (execStatus === 'running') return;
    playClick(soundEnabled);
    commitProgram(
      program.map((item) =>
        item.id === loopId && item.kind === 'loop'
          ? { ...item, body: item.body.filter((b) => b.id !== innerId) }
          : item
      )
    );
  };

  const updateLoopCount = (loopId: string, delta: number) => {
    if (execStatus === 'running') return;
    playClick(soundEnabled);
    commitProgram(
      program.map((item) =>
        item.id === loopId && item.kind === 'loop'
          ? { ...item, count: Math.min(8, Math.max(2, item.count + delta)) }
          : item
      )
    );
  };

  const moveTopItem = (idx: number, dir: -1 | 1) => {
    if (execStatus === 'running') return;
    const to = idx + dir;
    if (to < 0 || to >= program.length) return;
    playClick(soundEnabled);
    const next = [...program];
    const [picked] = next.splice(idx, 1);
    next.splice(to, 0, picked);
    commitProgram(next);
  };

  const handleClear = () => {
    if (execStatus === 'running' || program.length === 0) return;
    playClick(soundEnabled);
    setActiveLoopId(null);
    commitProgram([]);
  };

  const finalizeRun = (sim: SimTrace) => {
    setExecStatus('done');
    if (sim.reachedGoal) {
      playSuccess(soundEnabled);
      const stars = Math.max(1, 3 - triesCount) as 1 | 2 | 3;
      const isPar = blocksUsed <= parBlocks;
      const totalStepsExecuted = sim.frames.length - 1;
      const loopCount = program.filter((p) => p.kind === 'loop').length;
      const whyWorked = isPar
        ? `Your program ran ${totalStepsExecuted} robot steps using only ${blocksUsed} blocks${
            loopCount > 0 ? ` (with ${loopCount} loop${loopCount > 1 ? 's' : ''} compressing repetition)` : ''
          } and landed right on the star!`
        : `Your robot reached the star in ${totalStepsExecuted} steps! You used ${blocksUsed} blocks — try trimming it down to ${parBlocks} blocks for peak efficiency.`;
      setStatusMessage({ kind: 'success', text: whyWorked });
      onSuccess(stars, whyWorked, isPar);
    } else {
      playError(soundEnabled);
      onAttemptFail();
      const err =
        sim.errorMsg ??
        `The robot finished all ${sim.frames.length - 1} steps at Row ${
          sim.frames[sim.frames.length - 1].row + 1
        }, Col ${sim.frames[sim.frames.length - 1].col + 1}, short of the star target. Add more moves or check your turns!`;
      setStatusMessage({ kind: 'error', text: err });
    }
  };

  // Playback ticker
  useEffect(() => {
    if (execStatus !== 'running' || !trace) return;

    if (frameCursor >= trace.frames.length - 1) {
      finalizeRun(trace);
      return;
    }

    const baseDelay = speed === 2 ? 160 : speed === 0.5 ? 620 : 320;
    timerRef.current = window.setTimeout(() => {
      playStep(soundEnabled);
      setFrameCursor((prev) => prev + 1);
    }, baseDelay);

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [execStatus, frameCursor, trace, speed, soundEnabled]);

  const startOrResumeRun = () => {
    if (isSolved && execStatus === 'done') {
      // Allow re-watching animation
      setFrameCursor(0);
      setExecStatus('running');
      return;
    }
    if (execStatus === 'paused' && trace) {
      setExecStatus('running');
      return;
    }
    const flat = flattenProgram(program);
    if (flat.length === 0) {
      playError(soundEnabled);
      setStatusMessage({
        kind: 'info',
        text: 'Your program has no executable commands yet. Add Move, Turn Left, or Turn Right blocks!',
      });
      return;
    }
    const sim = simulateProgram(map, startPos, flat);
    setTrace(sim);
    setFrameCursor(0);
    setStatusMessage(null);
    setExecStatus('running');
  };

  const pauseRun = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setExecStatus('paused');
  };

  const stepForward = () => {
    const activeTrace =
      trace ??
      (() => {
        const flat = flattenProgram(program);
        if (flat.length === 0) return null;
        return simulateProgram(map, startPos, flat);
      })();

    if (!activeTrace) {
      playError(soundEnabled);
      setStatusMessage({
        kind: 'info',
        text: 'Add at least one command before stepping through.',
      });
      return;
    }

    if (!trace) {
      setTrace(activeTrace);
      setFrameCursor(0);
      setExecStatus('paused');
      setStatusMessage(null);
      if (activeTrace.frames.length > 1) {
        playStep(soundEnabled);
        setFrameCursor(1);
        if (1 >= activeTrace.frames.length - 1) {
          finalizeRun(activeTrace);
        }
      }
      return;
    }

    if (frameCursor < activeTrace.frames.length - 1) {
      playStep(soundEnabled);
      const nextCursor = frameCursor + 1;
      setFrameCursor(nextCursor);
      setExecStatus('paused');
      if (nextCursor >= activeTrace.frames.length - 1) {
        finalizeRun(activeTrace);
      }
    }
  };

  const resetSimulation = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setExecStatus('idle');
    setFrameCursor(0);
    setTrace(null);
    setStatusMessage(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Interactive Grid & Execution Controls */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3 text-xs font-semibold text-[#64748B] dark:text-[#F8FAFC]/80">
            <span>Facing: {DIR_NAMES[currentFrame.dir]}</span>
            <span className="tabular-nums">
              Blocks: {blocksUsed} / {maxBlocks} (Par {parBlocks})
            </span>
          </div>

          {/* Grid Board */}
          <div
            className="grid gap-1.5 max-w-[320px] mx-auto bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 p-2.5 squircle-card border border-[#64748B]/25"
            style={{ gridTemplateColumns: `repeat(${map[0].length}, minmax(0, 1fr))` }}
            role="grid"
            aria-label="Robot navigation grid"
          >
            {map.map((rowStr, r) =>
              [...rowStr].map((ch, c) => {
                const isBot = currentFrame.row === r && currentFrame.col === c;
                const isWall = ch === '#';
                const isGoal = ch === 'G';

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`aspect-square squircle-tile flex items-center justify-center border transition-colors ${
                      isWall
                        ? 'bg-[#0F172A] dark:bg-[#64748B]/40 border-[#0F172A] dark:border-[#64748B]/60'
                        : isGoal
                        ? 'bg-[#F59E0B]/20 border-[#F59E0B]'
                        : 'bg-[#FFFFFF] dark:bg-[#0F172A] border-[#64748B]/25'
                    }`}
                  >
                    {isBot ? (
                      <div
                        className="w-[78%] h-[78%] squircle-node bg-[#312E81] text-[#FFFFFF] flex items-center justify-center shadow-sm transition-transform duration-200"
                        style={{ transform: `rotate(${currentFrame.dir * 90}deg)` }}
                        aria-label={`Robot facing ${DIR_NAMES[currentFrame.dir]}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M20 12L5 4L8.5 12L5 20L20 12Z" fill="#F59E0B" />
                        </svg>
                      </div>
                    ) : isGoal ? (
                      <Star className="w-5 h-5 text-[#F59E0B] fill-[#F59E0B]" aria-label="Target star" />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {/* Playback Controls */}
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {execStatus === 'running' ? (
                <button
                  type="button"
                  onClick={pauseRun}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-[#0F172A] font-bold text-sm squircle-btn min-h-[44px]"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startOrResumeRun}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#312E81] hover:bg-[#7C3AED] text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px] transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {execStatus === 'paused' ? 'Resume' : 'Run'}
                </button>
              )}

              <button
                type="button"
                disabled={execStatus === 'running'}
                onClick={stepForward}
                title="Execute one step at a time"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#FFFFFF]/5 hover:bg-[#F8FAFC] dark:hover:bg-[#FFFFFF]/10 border border-[#64748B]/25 text-[#0F172A] dark:text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px] disabled:opacity-45"
              >
                <SkipForward className="w-4 h-4" />
                Step
              </button>

              <button
                type="button"
                onClick={resetSimulation}
                aria-label="Reset robot to start"
                className="inline-flex items-center justify-center px-3 py-2.5 bg-[#FFFFFF] dark:bg-[#FFFFFF]/5 hover:bg-[#F8FAFC] dark:hover:bg-[#FFFFFF]/10 border border-[#64748B]/25 text-[#0F172A] dark:text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[#64748B] dark:text-[#F8FAFC]/75">
                Execution Speed
              </span>
              <div className="flex items-center gap-1 p-1 bg-[#F8FAFC] dark:bg-[#FFFFFF]/10 squircle-btn">
                {([0.5, 1, 2] as const).map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSpeed(sp)}
                    className={`px-2.5 py-1 text-xs font-bold squircle-btn transition-colors ${
                      speed === sp
                        ? 'bg-[#FFFFFF] dark:bg-[#312E81] text-[#0F172A] dark:text-[#FFFFFF] shadow-xs'
                        : 'text-[#64748B] dark:text-[#F8FAFC]/75'
                    }`}
                  >
                    {sp}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            className={`squircle-card border p-4 text-sm leading-relaxed ${
              statusMessage.kind === 'success'
                ? 'bg-[#10B981]/15 border-[#10B981] text-[#0F172A] dark:text-[#FFFFFF]'
                : statusMessage.kind === 'error'
                ? 'bg-[#EF4444]/15 border-[#EF4444] text-[#0F172A] dark:text-[#FFFFFF]'
                : 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#0F172A] dark:text-[#FFFFFF]'
            }`}
          >
            <div className="font-bold mb-1">
              {statusMessage.kind === 'success'
                ? 'Destination Reached!'
                : statusMessage.kind === 'error'
                ? 'Obstacle Encountered'
                : 'Workspace Note'}
            </div>
            <p>{statusMessage.text}</p>
          </div>
        )}
      </div>

      {/* Right: Command Palette, Program Sequence & Execution History */}
      <div className="lg:col-span-7 space-y-4">
        {/* Command Palette */}
        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#64748B] dark:text-[#F8FAFC]/80 uppercase tracking-wide">
              {activeLoopId ? 'Adding Inside Selected Loop' : 'Command Palette'}
            </span>
            {activeLoopId && (
              <button
                type="button"
                onClick={() => setActiveLoopId(null)}
                className="text-xs font-bold text-[#7C3AED] dark:text-[#3B82F6] hover:underline"
              >
                Done editing loop
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={execStatus === 'running'}
              onClick={() => addCmd('F')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#312E81] hover:bg-[#312E81]/90 text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px] disabled:opacity-50"
            >
              <ArrowUp className="w-4 h-4" />
              Move
            </button>
            <button
              type="button"
              disabled={execStatus === 'running'}
              onClick={() => addCmd('L')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#0F172A] dark:bg-[#FFFFFF]/15 hover:opacity-90 text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px] disabled:opacity-50"
            >
              <CornerUpLeft className="w-4 h-4" />
              Turn Left
            </button>
            <button
              type="button"
              disabled={execStatus === 'running'}
              onClick={() => addCmd('R')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#0F172A] dark:bg-[#FFFFFF]/15 hover:opacity-90 text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px] disabled:opacity-50"
            >
              <CornerUpRight className="w-4 h-4" />
              Turn Right
            </button>

            {level.allowLoops && (
              <button
                type="button"
                disabled={execStatus === 'running'}
                onClick={() => addLoop(3)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px] disabled:opacity-50"
              >
                <Repeat className="w-4 h-4" />
                Add Loop
              </button>
            )}
          </div>
        </div>

        {/* Program Sequence Canvas */}
        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-display font-bold text-base text-[#0F172A] dark:text-[#FFFFFF]">
              Your Program
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={undoStack.length === 0 || execStatus === 'running'}
                onClick={handleUndo}
                aria-label="Undo last edit"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold border border-[#64748B]/25 squircle-btn text-[#0F172A] dark:text-[#FFFFFF] hover:bg-[#F8FAFC] dark:hover:bg-[#FFFFFF]/10 disabled:opacity-40 min-h-[36px]"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </button>
              <button
                type="button"
                disabled={redoStack.length === 0 || execStatus === 'running'}
                onClick={handleRedo}
                aria-label="Redo edit"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold border border-[#64748B]/25 squircle-btn text-[#0F172A] dark:text-[#FFFFFF] hover:bg-[#F8FAFC] dark:hover:bg-[#FFFFFF]/10 disabled:opacity-40 min-h-[36px]"
              >
                <Redo2 className="w-3.5 h-3.5" />
                Redo
              </button>
              <button
                type="button"
                disabled={program.length === 0 || execStatus === 'running'}
                onClick={handleClear}
                aria-label="Clear program"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold border border-[#64748B]/25 squircle-btn text-[#EF4444] hover:bg-[#EF4444]/10 disabled:opacity-40 min-h-[36px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>

          {program.length === 0 ? (
            <div className="border-2 border-dashed border-[#64748B]/30 squircle-card py-10 px-4 text-center text-sm text-[#64748B] dark:text-[#F8FAFC]/75">
              Tap commands above to assemble your robot’s algorithm.
            </div>
          ) : (
            <div className="space-y-2.5">
              {program.map((item, idx) => {
                const isExecutingBlock =
                  trace !== null &&
                  execStatus !== 'idle' &&
                  currentFrame.blockId === item.id;

                if (item.kind === 'cmd') {
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 squircle-btn border transition-all ${
                        isExecutingBlock
                          ? 'ring-2 ring-[#3B82F6] border-[#7C3AED] bg-[#3B82F6]/10'
                          : 'border-[#64748B]/25 bg-[#F8FAFC] dark:bg-[#FFFFFF]/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono text-[#64748B] dark:text-[#F8FAFC]/75 w-5 tabular-nums">
                          {idx + 1}.
                        </span>
                        <span className="font-bold text-sm text-[#0F172A] dark:text-[#FFFFFF]">
                          {CMD_LABELS[item.cmd]}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0 || execStatus === 'running'}
                          onClick={() => moveTopItem(idx, -1)}
                          aria-label={`Move block ${idx + 1} earlier`}
                          className="w-8 h-8 squircle-btn border border-[#64748B]/25 bg-[#FFFFFF] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#FFFFFF] flex items-center justify-center disabled:opacity-35"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === program.length - 1 || execStatus === 'running'}
                          onClick={() => moveTopItem(idx, 1)}
                          aria-label={`Move block ${idx + 1} later`}
                          className="w-8 h-8 squircle-btn border border-[#64748B]/25 bg-[#FFFFFF] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#FFFFFF] flex items-center justify-center disabled:opacity-35"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={execStatus === 'running'}
                          onClick={() => removeTopItem(item.id)}
                          aria-label={`Remove ${CMD_LABELS[item.cmd]}`}
                          className="w-8 h-8 squircle-btn border border-[#64748B]/25 bg-[#FFFFFF] dark:bg-[#0F172A] text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                // Loop Block
                const isSelectedLoop = activeLoopId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`p-3 squircle-card border-2 transition-all ${
                      isExecutingBlock
                        ? 'ring-2 ring-[#3B82F6] border-[#7C3AED] bg-[#3B82F6]/10'
                        : isSelectedLoop
                        ? 'border-[#7C3AED] bg-[#7C3AED]/10'
                        : 'border-[#7C3AED]/40 bg-[#F8FAFC] dark:bg-[#FFFFFF]/5'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveLoopId((curr) => (curr === item.id ? null : item.id))
                        }
                        className="inline-flex items-center gap-2 text-sm font-bold text-[#7C3AED] dark:text-[#3B82F6]"
                      >
                        <Repeat className="w-4 h-4" />
                        <span>Repeat {item.count}×</span>
                        <span className="text-xs font-medium text-[#64748B] dark:text-[#F8FAFC]/75">
                          {isSelectedLoop ? '(Editing)' : '(Tap to add inside)'}
                        </span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={item.count <= 2 || execStatus === 'running'}
                          onClick={() => updateLoopCount(item.id, -1)}
                          aria-label="Decrease loop count"
                          className="w-8 h-8 squircle-btn border border-[#64748B]/25 bg-[#FFFFFF] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#FFFFFF] flex items-center justify-center disabled:opacity-35"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={item.count >= 8 || execStatus === 'running'}
                          onClick={() => updateLoopCount(item.id, 1)}
                          aria-label="Increase loop count"
                          className="w-8 h-8 squircle-btn border border-[#64748B]/25 bg-[#FFFFFF] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#FFFFFF] flex items-center justify-center disabled:opacity-35"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={execStatus === 'running'}
                          onClick={() => removeTopItem(item.id)}
                          aria-label="Remove loop block"
                          className="w-8 h-8 squircle-btn border border-[#64748B]/25 bg-[#FFFFFF] dark:bg-[#0F172A] text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.body.length === 0 ? (
                      <div className="text-xs text-[#64748B] dark:text-[#F8FAFC]/75 italic py-2 px-3 bg-[#FFFFFF]/70 dark:bg-[#0F172A] squircle-btn border border-dashed border-[#64748B]/30">
                        Select this loop and tap Move / Turn commands above to nest them here.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {item.body.map((inner) => {
                          const isInnerActive =
                            isExecutingBlock && currentFrame.innerId === inner.id;
                          return (
                            <span
                              key={inner.id}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold squircle-btn border transition-all ${
                                isInnerActive
                                  ? 'bg-[#3B82F6] text-[#FFFFFF] border-[#312E81] scale-105'
                                  : 'bg-[#312E81] text-[#FFFFFF] border-[#312E81]'
                              }`}
                            >
                              <span>{CMD_LABELS[inner.cmd]}</span>
                              <button
                                type="button"
                                disabled={execStatus === 'running'}
                                onClick={() => removeLoopInner(item.id, inner.id)}
                                aria-label={`Remove ${CMD_LABELS[inner.cmd]} from loop`}
                                className="hover:opacity-75 disabled:opacity-40"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Execution History */}
        {historyLogs.length > 0 && (
          <div className="bg-[#0F172A] text-[#F8FAFC] squircle-card p-4 border border-[#312E81]">
            <div className="text-xs font-bold text-[#3B82F6] uppercase tracking-wide mb-2">
              Execution History
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-xs">
              {historyLogs.map((entry, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-[#10B981] mr-2">&gt;</span>
                  {entry}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
