import React, { useState } from 'react';
import { Monitor, Moon, RotateCcw, Sun, Volume2, VolumeX } from 'lucide-react';
import { MotionPreference, TextSize, ThemeMode, UserSettings } from '../types';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onResetProgress: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetProgress,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const themes: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
  ];

  const motions: Array<{ value: MotionPreference; label: string }> = [
    { value: 'system', label: 'System Default' },
    { value: 'reduced', label: 'Reduced Motion' },
    { value: 'full', label: 'Full Animations' },
  ];

  const textSizes: Array<{ value: TextSize; label: string }> = [
    { value: 'standard', label: 'Standard' },
    { value: 'large', label: 'Large' },
    { value: 'xl', label: 'Extra Large' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#FFFFFF]">
          Settings
        </h1>
        <p className="text-[#64748B] dark:text-[#F8FAFC]/80 text-base mt-1">
          Personalize appearance, accessibility, audio feedback, and local data.
        </p>
      </div>

      {/* Theme Mode */}
      <section className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-6 shadow-xs space-y-4">
        <div>
          <h2 className="font-display font-bold text-base text-[#0F172A] dark:text-[#FFFFFF]">
            Appearance Theme
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#F8FAFC]/75 mt-0.5">
            Switch between Light, Dark, or follow your device’s system preference.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {themes.map((t) => {
            const active = settings.theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onUpdateSettings({ theme: t.value })}
                aria-pressed={active}
                className={`flex items-center justify-center gap-2 py-3 px-3 squircle-btn border text-sm font-bold min-h-[46px] transition-colors ${
                  active
                    ? 'bg-[#312E81] text-[#FFFFFF] border-[#312E81]'
                    : 'bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 text-[#0F172A] dark:text-[#FFFFFF] border-[#64748B]/25 hover:border-[#7C3AED]'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sound & Motion */}
      <section className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-base text-[#0F172A] dark:text-[#FFFFFF]">
              Sound Effects
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#F8FAFC]/75 mt-0.5">
              Subtle audio cues when stepping the robot, unlocking badges, or clearing levels.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.soundEnabled}
            onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`inline-flex items-center gap-2 px-4 py-2.5 squircle-btn border text-sm font-bold min-h-[44px] transition-colors ${
              settings.soundEnabled
                ? 'bg-[#312E81] text-[#FFFFFF] border-[#312E81]'
                : 'bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 text-[#0F172A] dark:text-[#FFFFFF] border-[#64748B]/25'
            }`}
          >
            {settings.soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4" />
                <span>On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                <span>Muted</span>
              </>
            )}
          </button>
        </div>

        <div className="pt-5 border-t border-[#64748B]/20 space-y-3">
          <div>
            <h2 className="font-display font-bold text-base text-[#0F172A] dark:text-[#FFFFFF]">
              Animation Preferences
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#F8FAFC]/75 mt-0.5">
              Respects reduced-motion accessibility needs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {motions.map((m) => {
              const active = settings.motionPreference === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onUpdateSettings({ motionPreference: m.value })}
                  className={`py-2.5 px-3 squircle-btn border text-sm font-bold min-h-[44px] transition-colors ${
                    active
                      ? 'bg-[#312E81] text-[#FFFFFF] border-[#312E81]'
                      : 'bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 text-[#0F172A] dark:text-[#FFFFFF] border-[#64748B]/25 hover:border-[#7C3AED]'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-5 border-t border-[#64748B]/20 space-y-3">
          <div>
            <h2 className="font-display font-bold text-base text-[#0F172A] dark:text-[#FFFFFF]">
              Text Size
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#F8FAFC]/75 mt-0.5">
              Adjust base reading size across lessons, code blocks, and buttons.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {textSizes.map((ts) => {
              const active = settings.textSize === ts.value;
              return (
                <button
                  key={ts.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onUpdateSettings({ textSize: ts.value })}
                  className={`py-2.5 px-3 squircle-btn border text-sm font-bold min-h-[44px] transition-colors ${
                    active
                      ? 'bg-[#312E81] text-[#FFFFFF] border-[#312E81]'
                      : 'bg-[#F8FAFC] dark:bg-[#FFFFFF]/5 text-[#0F172A] dark:text-[#FFFFFF] border-[#64748B]/25 hover:border-[#7C3AED]'
                  }`}
                >
                  {ts.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Reset Progress */}
      <section className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/25 squircle-card p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-base text-[#0F172A] dark:text-[#FFFFFF]">
            Reset Learning Progress
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#F8FAFC]/75 mt-0.5">
            Clear your completed levels, stars, XP, and achievements on this browser.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 squircle-btn border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 text-sm font-bold min-h-[44px] transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Progress
        </button>
      </section>

      {/* In-UI Confirmation Modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#0F172A]/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-reset-heading"
        >
          <div className="bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#64748B]/30 squircle-card shadow-xl max-w-sm w-full p-6">
            <h3
              id="confirm-reset-heading"
              className="font-display text-lg font-extrabold text-[#0F172A] dark:text-[#FFFFFF] mb-2"
            >
              Reset all CODEX progress?
            </h3>
            <p className="text-sm text-[#64748B] dark:text-[#F8FAFC]/80 mb-5 leading-relaxed">
              This clears your completed levels, stars, XP, streak, and badges. Your display preferences will stay intact.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 squircle-btn border border-[#64748B]/30 bg-[#FFFFFF] dark:bg-[#FFFFFF]/5 text-sm font-bold text-[#0F172A] dark:text-[#FFFFFF] min-h-[42px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  onResetProgress();
                }}
                className="px-4 py-2 squircle-btn bg-[#EF4444] hover:bg-[#EF4444]/90 text-[#FFFFFF] text-sm font-bold min-h-[42px]"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
