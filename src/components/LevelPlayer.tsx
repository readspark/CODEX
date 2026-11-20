import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ClipboardCheck,
  Lightbulb,
  RotateCcw,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { CURRICULUM, MODULES } from '../data/curriculum';
import { CodexProgress, CurriculumItem, Pillar } from '../types';
import { playClick, playError, playSuccess } from '../utils/sound';
import { RobotPlayground } from './RobotPlayground';

interface LevelPlayerProps {
  item: CurriculumItem;
  progress: CodexProgress;
  onCompleteItem: (index: number, stars: 1 | 2 | 3, xpGain: number) => void;
  onGoToIndex: (index: number) => void;
  onBackToPath: () => void;
  onBackToDashboard: () => void;
}

export const LevelPlayer: React.FC<LevelPlayerProps> = ({
  item,
  progress,
  onCompleteItem,
  onGoToIndex,
  onBackToPath,
  onBackToDashboard,
}) => {
  // Ordering state ('o')
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [orderFeedback, setOrderFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Multiple-choice state ('m')
  const [chosenOpt, setChosenOpt] = useState<number | null>(null);
  const [mcFeedback, setMcFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Hints & tries
  const [tries, setTries] = useState(0);
  const [hintTier, setHintTier] = useState<0 | 1 | 2>(0);

  // Completion banner state
  const [completionInfo, setCompletionInfo] = useState<{
    stars: 1 | 2 | 3;
    xpAwarded: number;
    explanation?: string;
    isModuleAssessmentPass?: boolean;
  } | null>(null);

  // Assessment state ('a')
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<
    Array<{
      qNum: number;
      prompt: string;
      chosen: string;
      correct: string;
      explanation: string;
      topic: Exclude<Pillar, 'Assessment'>;
    }>
  >([]);
  const [assessmentDone, setAssessmentDone] = useState(false);

  const soundOn = progress.settings.soundEnabled;
  const alreadyCompleted = Boolean(progress.done[item.index]);

  const shuffledPool = useMemo(() => {
    if (item.type !== 'o' || !item.items) return [];
    return item.items
      .map((_, j) => j)
      .sort((a, b) => ((a * 3) % 5) - ((b * 3) % 5));
  }, [item]);

  // Reset per-level UI whenever active item changes
  useEffect(() => {
    setSelectedOrder([]);
    setOrderFeedback(null);
    setChosenOpt(null);
    setMcFeedback(null);
    setTries(0);
    setHintTier(0);
    setCompletionInfo(null);
    setQIndex(0);
    setScore(0);
    setMistakes([]);
    setAssessmentDone(false);
  }, [item.index]);

  const awardCompletion = (
    stars: 1 | 2 | 3,
    xpIfFirst: number,
    explanation?: string,
    isModuleAssessmentPass?: boolean
  ) => {
    const xpAwarded = alreadyCompleted ? 0 : xpIfFirst;
    setCompletionInfo({
      stars,
      xpAwarded,
      explanation,
      isModuleAssessmentPass,
    });
    onCompleteItem(item.index, stars, xpAwarded);
  };

  // Ordering handlers
  const handlePickStep = (idx: number) => {
    if (completionInfo) return;
    playClick(soundOn);
    setSelectedOrder((prev) => [...prev, idx]);
    setOrderFeedback(null);
  };

  const moveSelectedStep = (pos: number, delta: -1 | 1) => {
    if (completionInfo) return;
    const to = pos + delta;
    if (to < 0 || to >= selectedOrder.length) return;
    playClick(soundOn);
    const next = [...selectedOrder];
    const [picked] = next.splice(pos, 1);
    next.splice(to, 0, picked);
    setSelectedOrder(next);
    setOrderFeedback(null);
  };

  const removeSelectedStep = (pos: number) => {
    if (completionInfo) return;
    playClick(soundOn);
    setSelectedOrder((prev) => prev.filter((_, i) => i !== pos));
    setOrderFeedback(null);
  };

  const checkOrder = () => {
    if (!item.items) return;
    const isExact =
      selectedOrder.length === item.items.length &&
      selectedOrder.every((val, idx) => val === idx);

    if (isExact) {
      playSuccess(soundOn);
      const stars = Math.max(1, 3 - tries) as 1 | 2 | 3;
      const exp =
        item.sequenceExplanation ??
        'Every step is in the exact logical order!';
      setOrderFeedback({ ok: true, message: exp });
      awardCompletion(stars, 10 * stars, exp);
    } else {
      playError(soundOn);
      setTries((t) => t + 1);
      const firstBad = selectedOrder.findIndex((val, idx) => val !== idx);
      setOrderFeedback({
        ok: false,
        message: `Check Step ${
          firstBad + 1
        } ("${item.items[selectedOrder[firstBad]]}") — it belongs in a different position in the sequence.`,
      });
    }
  };

  // Multiple choice handler
  const handleChooseMc = (optIdx: number) => {
    if (completionInfo) return;
    setChosenOpt(optIdx);
    const isRight = optIdx === item.correctIndex;
    const specificFeedback =
      item.optionFeedback?.[optIdx] ??
      (isRight ? item.explanation ?? 'Correct!' : 'Not quite right — try tracing again.');

    if (isRight) {
      playSuccess(soundOn);
      const stars = Math.max(1, 3 - tries) as 1 | 2 | 3;
      setMcFeedback({ ok: true, message: specificFeedback });
      awardCompletion(stars, 10 * stars, item.explanation ?? specificFeedback);
    } else {
      playError(soundOn);
      setTries((t) => t + 1);
      setMcFeedback({ ok: false, message: specificFeedback });
    }
  };

  // Assessment handler
  const handleAnswerAssessment = (optIdx: number) => {
    const questions = item.questions ?? [];
    const currentQ = questions[qIndex];
    if (!currentQ) return;

    const isCorrect = optIdx === currentQ.correctIndex;
    const nextScore = isCorrect ? score + 1 : score;
    const nextMistakes = isCorrect
      ? mistakes
      : [
          ...mistakes,
          {
            qNum: qIndex + 1,
            prompt: currentQ.prompt,
            chosen: currentQ.options[optIdx],
            correct: currentQ.options[currentQ.correctIndex],
            explanation: currentQ.explanation,
            topic: currentQ.topic,
          },
        ];

    if (isCorrect) {
      playClick(soundOn);
    } else {
      playError(soundOn);
    }

    setScore(nextScore);
    setMistakes(nextMistakes);

    if (qIndex + 1 >= questions.length) {
      setAssessmentDone(true);
      const passed = nextScore >= 8;
      if (passed) {
        playSuccess(soundOn);
        const stars = (nextScore >= 11 ? 3 : nextScore >= 9 ? 2 : 1) as 1 | 2 | 3;
        awardCompletion(stars, 20 * stars, undefined, true);
      }
    } else {
      setQIndex((q) => q + 1);
    }
  };

  const retryAssessment = () => {
    playClick(soundOn);
    setQIndex(0);
    setScore(0);
    setMistakes([]);
    setAssessmentDone(false);
    setCompletionInfo(null);
  };

  const hasNext = item.index < CURRICULUM.length - 1;
  const modMeta = MODULES[item.moduleIndex];

  // Assessment revision topics
  const revisionTopics = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of mistakes) {
      counts[m.topic] = (counts[m.topic] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [mistakes]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToPath}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 squircle-btn border border-[#64748B]/25 bg-[#FFFFFF] dark:bg-[#0F172A] hover:bg-[#F8FAFC] dark:hover:bg-[#FFFFFF]/10 text-sm font-bold text-[#0F172A] dark:text-[#FFFFFF] min-h-[42px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Learning Path
          </button>

          <div>
            <div className="text-xs font-semibold text-[#64748B] dark:text-[#F8FAFC]/75">
              Module 0{modMeta.id} ·{' '}
              {item.type === 'a'
                ? 'Module Assessment'
                : `Level ${item.levelNumber} of 32 · ${item.pillar}`}
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-[#FFFFFF]">
              {item.title}
            </h1>
          </div>
        </div>

        {alreadyCompleted && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#10B981]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Previously Completed (Replay mode — 0 extra XP)</span>
          </div>
        )}
      </div>

      {/* Concept Brief Card */}
      <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-5 shadow-xs space-y-2">
        <div className="text-xs font-bold text-[#7C3AED] dark:text-[#3B82F6] uppercase tracking-wide">
          Concept Brief
        </div>
        <p className="text-sm sm:text-base text-[#64748B] dark:text-[#F8FAFC]/80 leading-relaxed">
          {item.concept}
        </p>
        <h2 className="font-display text-lg font-extrabold text-[#0F172A] dark:text-[#FFFFFF] pt-1">
          {item.question}
        </h2>
      </div>

      {/* Challenge Body by Type */}
      {item.type === 'g' && (
        <RobotPlayground
          level={item}
          soundEnabled={soundOn}
          triesCount={tries}
          isSolved={Boolean(completionInfo)}
          onAttemptFail={() => setTries((t) => t + 1)}
          onSuccess={(stars, explanation) => {
            awardCompletion(stars, 10 * stars, explanation);
          }}
        />
      )}

      {item.type === 'o' && item.items && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Selected Order Panel */}
          <div className="lg:col-span-7 bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-bold text-base text-[#0F172A] dark:text-[#FFFFFF]">
                Your Algorithm Sequence ({selectedOrder.length} / {item.items.length})
              </h3>
              <button
                type="button"
                disabled={selectedOrder.length === 0 || Boolean(completionInfo)}
                onClick={() => {
                  setSelectedOrder([]);
                  setOrderFeedback(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#64748B] dark:text-[#F8FAFC]/75 hover:text-[#0F172A] dark:hover:text-[#FFFFFF] disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            {selectedOrder.length === 0 ? (
              <div className="border-2 border-dashed border-[#64748B]/30 squircle-card py-10 px-4 text-center text-sm text-[#64748B] dark:text-[#F8FAFC]/75">
                Tap steps from the right panel in order, or rearrange them here after selecting.
              </div>
            ) : (
              <ol className="space-y-2">
                {selectedOrder.map((stepIdx, pos) => (
                  <li
                    key={`${stepIdx}-${pos}`}
                    className="flex items-center gap-3 p-3 squircle-btn border border-[#64748B]/25 bg-[#F8FAFC] dark:bg-[#FFFFFF]/5"
                  >
                    <span className="w-7 h-7 squircle-node bg-[#312E81] text-[#FFFFFF] font-bold text-xs flex items-center justify-center tabular-nums shrink-0">
                      {pos + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-[#0F172A] dark:text-[#FFFFFF]">
                      {item.items![stepIdx]}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={pos === 0 || Boolean(completionInfo)}
                        onClick={() => moveSelectedStep(pos, -1)}
                        aria-label={`Move step ${pos + 1} up`}
                        className="w-8 h-8 squircle-btn border border-[#64748B]/25 bg-[#FFFFFF] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#FFFFFF] flex items-center justify-center disabled:opacity-35"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={
                          pos === selectedOrder.length - 1 || Boolean(completionInfo)
                        }
                        onClick={() => moveSelectedStep(pos, 1)}
                        aria-label={`Move step ${pos + 1} down`}
                        className="w-8 h-8 squircle-btn border border-[#64748B]/25 bg-[#FFFFFF] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#FFFFFF] flex items-center justify-center disabled:opacity-35"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(completionInfo)}
                        onClick={() => removeSelectedStep(pos)}
                        aria-label={`Remove step ${pos + 1}`}
                        className="w-8 h-8 squircle-btn border border-[#64748B]/25 bg-[#FFFFFF] dark:bg-[#0F172A] text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center justify-center disabled:opacity-35"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <button
              type="button"
              disabled={
                selectedOrder.length < item.items.length || Boolean(completionInfo)
              }
              onClick={checkOrder}
              className="w-full py-3 px-5 bg-[#312E81] hover:bg-[#7C3AED] disabled:opacity-45 text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[46px] transition-colors"
            >
              Check Sequence
            </button>

            {orderFeedback && !orderFeedback.ok && (
              <div
                role="status"
                aria-live="polite"
                className="p-4 squircle-btn border border-[#F59E0B] bg-[#F59E0B]/15 text-sm text-[#0F172A] dark:text-[#FFFFFF]"
              >
                {orderFeedback.message}
              </div>
            )}
          </div>

          {/* Available Steps Pool */}
          <div className="lg:col-span-5 bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-5 shadow-xs space-y-3">
            <h3 className="font-display font-bold text-base text-[#0F172A] dark:text-[#FFFFFF]">
              Available Steps
            </h3>
            <div className="space-y-2">
              {shuffledPool.filter((idx) => !selectedOrder.includes(idx)).length ===
              0 ? (
                <p className="text-xs text-[#64748B] dark:text-[#F8FAFC]/75 py-4 text-center">
                  All steps added! Adjust their order on the left, then click Check Sequence.
                </p>
              ) : (
                shuffledPool
                  .filter((idx) => !selectedOrder.includes(idx))
                  .map((stepIdx) => (
                    <button
                      key={stepIdx}
                      type="button"
                      disabled={Boolean(completionInfo)}
                      onClick={() => handlePickStep(stepIdx)}
                      className="w-full text-left px-4 py-3 squircle-btn border border-[#64748B]/25 bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 hover:border-[#7C3AED] text-sm font-medium text-[#0F172A] dark:text-[#FFFFFF] min-h-[46px] transition-colors"
                    >
                      + {item.items![stepIdx]}
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {item.type === 'm' && item.options && (
        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-6 shadow-xs space-y-4">
          {item.code && (
            <pre className="bg-[#0F172A] text-[#F8FAFC] border border-[#312E81] font-mono text-sm p-4 squircle-btn overflow-x-auto leading-relaxed">
              {item.code}
            </pre>
          )}

          <div className="space-y-2.5">
            {item.options.map((opt, idx) => {
              const isSelected = chosenOpt === idx;
              const isRight = idx === item.correctIndex;
              const showRight = Boolean(completionInfo) && isRight;
              const showWrong = isSelected && !isRight && mcFeedback && !mcFeedback.ok;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={Boolean(completionInfo)}
                  onClick={() => handleChooseMc(idx)}
                  className={`w-full text-left px-4 py-3.5 squircle-btn border text-sm font-semibold transition-colors min-h-[48px] ${
                    showRight
                      ? 'bg-[#10B981]/15 border-[#10B981] text-[#0F172A] dark:text-[#FFFFFF]'
                      : showWrong
                      ? 'bg-[#EF4444]/15 border-[#EF4444] text-[#0F172A] dark:text-[#FFFFFF]'
                      : 'bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 border-[#64748B]/25 text-[#0F172A] dark:text-[#FFFFFF] hover:border-[#7C3AED]'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {mcFeedback && !mcFeedback.ok && (
            <div
              role="status"
              aria-live="polite"
              className="p-4 squircle-btn border border-[#F59E0B] bg-[#F59E0B]/15 text-sm text-[#0F172A] dark:text-[#FFFFFF] leading-relaxed"
            >
              <span className="font-bold block mb-0.5">Why that wasn’t it:</span>
              {mcFeedback.message}
            </div>
          )}
        </div>
      )}

      {item.type === 'a' && item.questions && (
        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-6 shadow-xs space-y-5">
          {!assessmentDone ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#64748B] dark:text-[#F8FAFC]/80 tabular-nums">
                  <span>
                    Question {qIndex + 1} of {item.questions.length}
                  </span>
                  <span>{item.questions[qIndex].topic}</span>
                </div>
                <div className="h-2 w-full bg-[#F8FAFC] dark:bg-[#FFFFFF]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#312E81] dark:bg-[#7C3AED] transition-all duration-300"
                    style={{
                      width: `${((qIndex + 1) / item.questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <h3 className="font-display text-lg font-extrabold text-[#0F172A] dark:text-[#FFFFFF]">
                {item.questions[qIndex].prompt}
              </h3>

              {item.questions[qIndex].code && (
                <pre className="bg-[#0F172A] text-[#F8FAFC] border border-[#312E81] font-mono text-sm p-4 squircle-btn overflow-x-auto leading-relaxed">
                  {item.questions[qIndex].code}
                </pre>
              )}

              <div className="space-y-2.5">
                {item.questions[qIndex].options.map((opt, j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => handleAnswerAssessment(j)}
                    className="w-full text-left px-4 py-3.5 squircle-btn border border-[#64748B]/25 bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 hover:border-[#7C3AED] text-sm font-semibold text-[#0F172A] dark:text-[#FFFFFF] min-h-[48px] transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#64748B]/25">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 squircle-node flex items-center justify-center ${
                      score >= 8
                        ? 'bg-[#10B981] text-[#FFFFFF]'
                        : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                    }`}
                  >
                    {score >= 8 ? (
                      <Trophy className="w-6 h-6" />
                    ) : (
                      <ClipboardCheck className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-extrabold text-[#0F172A] dark:text-[#FFFFFF]">
                      {score >= 8 ? 'Module Assessment Passed!' : 'Keep Practicing!'}
                    </h3>
                    <p className="text-sm text-[#64748B] dark:text-[#F8FAFC]/80 tabular-nums">
                      Final Score: {score} / {item.questions.length} (8 required to pass)
                    </p>
                  </div>
                </div>

                {completionInfo && (
                  <div className="flex items-center gap-1" aria-label={`${completionInfo.stars} stars`}>
                    {[1, 2, 3].map((n) => (
                      <Star
                        key={n}
                        className={`w-5 h-5 ${
                          n <= completionInfo.stars
                            ? 'text-[#F59E0B] fill-[#F59E0B]'
                            : 'text-[#64748B]/30'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {revisionTopics.length > 0 && (
                <div className="p-4 squircle-btn bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 border border-[#64748B]/25 space-y-1.5">
                  <div className="text-xs font-bold text-[#7C3AED] dark:text-[#3B82F6] uppercase tracking-wide">
                    Concepts to Revise
                  </div>
                  <p className="text-sm text-[#0F172A] dark:text-[#FFFFFF]">
                    Focus on{' '}
                    {revisionTopics
                      .map(([topic, count]) => `${topic} (${count} missed)`)
                      .join(', ')}
                    .
                  </p>
                </div>
              )}

              {mistakes.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-bold text-[#0F172A] dark:text-[#FFFFFF]">
                    Review Incorrect Answers
                  </div>
                  {mistakes.map((m) => (
                    <div
                      key={m.qNum}
                      className="p-4 squircle-btn border border-[#64748B]/25 bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 space-y-1 text-sm"
                    >
                      <div className="font-bold text-[#0F172A] dark:text-[#FFFFFF]">
                        Q{m.qNum}: {m.prompt}
                      </div>
                      <div className="text-xs font-semibold text-[#EF4444]">
                        Your answer: {m.chosen}
                      </div>
                      <div className="text-xs font-bold text-[#10B981]">
                        Correct answer: {m.correct}
                      </div>
                      <div className="text-xs text-[#64748B] dark:text-[#F8FAFC]/80 pt-1">
                        {m.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {score >= 8 && hasNext && (
                  <button
                    type="button"
                    onClick={() => onGoToIndex(item.index + 1)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#312E81] hover:bg-[#7C3AED] text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px] transition-colors"
                  >
                    Start Next Module
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={retryAssessment}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 border border-[#64748B]/25 text-[#0F172A] dark:text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px]"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry Assessment
                </button>
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="px-5 py-2.5 bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 text-[#0F172A] dark:text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px]"
                >
                  Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progressive Hints (for non-assessment levels) */}
      {item.type !== 'a' && !completionInfo && (
        <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A] dark:text-[#FFFFFF]">
              <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
              <span>Progressive Hints</span>
            </div>
            <div className="flex items-center gap-2">
              {hintTier === 0 && (
                <button
                  type="button"
                  onClick={() => setHintTier(1)}
                  className="px-3 py-1.5 text-xs font-bold squircle-btn bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 border border-[#64748B]/25 text-[#312E81] dark:text-[#3B82F6]"
                >
                  Reveal Hint 1
                </button>
              )}
              {hintTier === 1 && (
                <button
                  type="button"
                  onClick={() => setHintTier(2)}
                  className="px-3 py-1.5 text-xs font-bold squircle-btn bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 border border-[#64748B]/25 text-[#312E81] dark:text-[#3B82F6]"
                >
                  Need a Closer Hint?
                </button>
              )}
            </div>
          </div>

          {hintTier >= 1 && (
            <div className="p-3.5 squircle-btn bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 border border-[#64748B]/25 text-sm text-[#64748B] dark:text-[#F8FAFC]/80">
              <span className="font-bold text-[#0F172A] dark:text-[#FFFFFF]">Hint 1: </span>
              {item.nudgeHint ?? item.hint}
            </div>
          )}

          {hintTier >= 2 && (
            <div className="p-3.5 squircle-btn bg-[#3B82F6]/10 border border-[#3B82F6]/40 text-sm text-[#0F172A] dark:text-[#FFFFFF]">
              <span className="font-bold">Hint 2: </span>
              {item.hint}
            </div>
          )}
        </div>
      )}

      {/* Level Completion Celebration Card */}
      {completionInfo && item.type !== 'a' && (
        <div
          role="status"
          aria-live="polite"
          className="bg-[#10B981]/10 dark:bg-[#0F172A] border-2 border-[#10B981] squircle-card p-6 shadow-sm space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display text-xl font-extrabold text-[#0F172A] dark:text-[#FFFFFF]">
                Level {item.levelNumber} Complete!
              </div>
              <div className="text-xs font-bold text-[#10B981] tabular-nums mt-0.5">
                {completionInfo.xpAwarded > 0
                  ? `+${completionInfo.xpAwarded} XP earned`
                  : 'Replay completed · Best star score saved'}
              </div>
            </div>

            <div className="flex items-center gap-1" aria-label={`Earned ${completionInfo.stars} of 3 stars`}>
              {[1, 2, 3].map((n) => (
                <Star
                  key={n}
                  className={`w-6 h-6 ${
                    n <= completionInfo.stars
                      ? 'text-[#F59E0B] fill-[#F59E0B]'
                      : 'text-[#64748B]/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {completionInfo.explanation && (
            <p className="text-sm text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed">
              {completionInfo.explanation}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {hasNext ? (
              <button
                type="button"
                onClick={() => onGoToIndex(item.index + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#312E81] hover:bg-[#7C3AED] text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px] transition-colors"
              >
                {CURRICULUM[item.index + 1].type === 'a'
                  ? 'Proceed to Module Assessment'
                  : `Next Level (${CURRICULUM[item.index + 1].levelNumber})`}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <span className="font-display font-extrabold text-sm text-[#10B981]">
                You finished all 32 levels!
              </span>
            )}
            <button
              type="button"
              onClick={onBackToPath}
              className="px-4 py-2.5 bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 text-[#0F172A] dark:text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px]"
            >
              Learning Path
            </button>
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-4 py-2.5 bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 text-[#0F172A] dark:text-[#FFFFFF] font-bold text-sm squircle-btn min-h-[44px]"
            >
              Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
