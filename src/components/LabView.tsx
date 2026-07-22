import { useState } from 'react';
import { Beaker, CheckSquare, Square } from 'lucide-react';
import type { LabPayload } from '@shared/types';

export function LabView({
  payload,
  checked,
  onCheck,
  onContinue,
}: {
  payload: LabPayload;
  checked: string[];
  onCheck: (stepIds: string[]) => void;
  onContinue: () => void;
}) {
  const [localChecked, setLocalChecked] = useState<string[]>(checked);

  const toggle = (stepId: string) => {
    const next = localChecked.includes(stepId)
      ? localChecked.filter((id) => id !== stepId)
      : [...localChecked, stepId];
    setLocalChecked(next);
    onCheck(next);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#faf8fc_0%,#f3eef8_100%)]">
      <header className="border-b border-[#e0d5ec] bg-white/80 px-8 py-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0eaf7] text-[var(--lab)]">
            <Beaker className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab)]">
              Hands-on lab
              {payload.activity.estimatedMinutes
                ? ` · ~${payload.activity.estimatedMinutes} min`
                : ''}
            </div>
            <h2
              className="text-2xl font-semibold text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {payload.activity.title}
            </h2>
            {payload.activity.description && (
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{payload.activity.description}</p>
            )}
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-2">
        <section className="min-h-0 overflow-y-auto border-r border-[#e0d5ec] bg-white/50 p-6">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Instructions
          </h3>
          <div
            className="lab-html prose max-w-none text-[14px] leading-relaxed text-[var(--ink)]"
            dangerouslySetInnerHTML={{ __html: payload.instructionsHtml }}
          />
        </section>

        <section className="min-h-0 overflow-y-auto p-6">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Rubric · self-check
          </h3>
          <p className="mb-4 text-[13px] text-[var(--ink-muted)]">
            Labs are not auto-graded. Check each step when your result matches the expected outcome.
          </p>
          <div className="space-y-3">
            {payload.rubric.steps.map((step, i) => {
              const on = localChecked.includes(step.id);
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => toggle(step.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    on
                      ? 'border-emerald-300 bg-emerald-50/80'
                      : 'border-[var(--line)] bg-white hover:border-[var(--lab)]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {on ? (
                      <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    ) : (
                      <Square className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ink-muted)]" />
                    )}
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--ink)]">
                        {i + 1}. {step.title}
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-muted)]">
                        {step.instructions}
                      </p>
                      <div className="mt-2 rounded-lg bg-[#f6f2fb] px-3 py-2 text-[12px]">
                        <span className="font-semibold text-[var(--lab)]">Expected result: </span>
                        <span className="text-[var(--ink)]">{step.expectedResult}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="flex items-center gap-3 border-t border-[#e0d5ec] bg-white/90 px-8 py-4 backdrop-blur">
        <span className="text-[12px] text-[var(--ink-muted)]">
          {localChecked.length} / {payload.rubric.steps.length} steps checked
        </span>
        <button
          type="button"
          onClick={onContinue}
          className="ml-auto rounded-lg bg-[var(--lab)] px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:brightness-110"
        >
          Continue to next slide
        </button>
      </footer>
    </div>
  );
}
