import { useEffect, useState } from 'react';
import {
  Beaker,
  CheckSquare,
  ClipboardCheck,
  Square,
  Upload,
  X,
} from 'lucide-react';
import type { LabPayload } from '@shared/types';

export function LabView({
  payload,
  checked,
  passed,
  onCheck,
  onPass,
  onContinue,
}: {
  payload: LabPayload;
  checked: string[];
  passed?: boolean;
  onCheck: (stepIds: string[]) => void;
  onPass: () => void;
  onContinue: () => void;
}) {
  const sections =
    payload.sections.length > 0
      ? payload.sections
      : [{ id: 'instructions', title: 'Instructions', html: payload.instructionsHtml }];

  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localChecked, setLocalChecked] = useState<string[]>(checked);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [labDone, setLabDone] = useState(Boolean(passed));

  useEffect(() => {
    setLocalChecked(checked);
  }, [checked]);

  useEffect(() => {
    setLabDone(Boolean(passed));
  }, [passed]);

  const activeHtml =
    sections.find((s) => s.id === activeSection)?.html ?? sections[0]?.html ?? '';

  const toggle = (stepId: string) => {
    if (labDone) return;
    const next = localChecked.includes(stepId)
      ? localChecked.filter((id) => id !== stepId)
      : [...localChecked, stepId];
    setLocalChecked(next);
    onCheck(next);
  };

  const submitLab = () => {
    setLabDone(true);
    onPass();
    setDrawerOpen(false);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#faf8fc_0%,#f3eef8_100%)]">
      <header className="border-b border-[#e0d5ec] bg-white/80 px-6 py-4 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0eaf7] text-[var(--lab)]">
            <Beaker className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
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
            {payload.activity.learningObjective && (
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                <span className="font-semibold text-[var(--lab)]">Objective: </span>
                {payload.activity.learningObjective}
              </p>
            )}
            {payload.activity.description && (
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{payload.activity.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--lab)] px-3 py-2 text-[12px] font-semibold text-white shadow-sm hover:brightness-110"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            {labDone ? 'Review submission' : 'Submit'}
          </button>
        </div>
        {payload.activity.resources && payload.activity.resources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 pl-[52px]">
            {payload.activity.resources.map((r) => (
              <span
                key={r}
                className="rounded-full border border-[#e0d5ec] bg-white px-2.5 py-0.5 text-[11px] text-[var(--ink-muted)]"
              >
                {r}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[220px_1fr]">
        <aside className="min-h-0 overflow-y-auto border-r border-[#e0d5ec] bg-white/60 p-3">
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Sections
          </div>
          <div className="space-y-1">
            {sections.map((sec, i) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] ${
                  activeSection === sec.id
                    ? 'bg-[#f0eaf7] font-semibold text-[var(--lab)]'
                    : 'text-[var(--ink)] hover:bg-black/5'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[var(--lab)] ring-1 ring-[#e0d5ec]">
                  {i + 1}
                </span>
                {sec.title}
              </button>
            ))}
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto p-6">
          <div
            className="lab-html prose max-w-none text-[14px] leading-relaxed text-[var(--ink)]"
            dangerouslySetInnerHTML={{ __html: activeHtml }}
          />
        </section>
      </div>

      <footer className="flex items-center gap-3 border-t border-[#e0d5ec] bg-white/90 px-6 py-3 backdrop-blur">
        <span className="text-[12px] text-[var(--ink-muted)]">
          {labDone
            ? 'Lab marked complete'
            : `${localChecked.length} / ${payload.rubric.steps.length} rubric checks`}
        </span>
        <button
          type="button"
          onClick={onContinue}
          disabled={!labDone}
          className="ml-auto rounded-lg bg-[var(--lab)] px-4 py-2 text-[13px] font-semibold text-white shadow-sm enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue to next slide
        </button>
      </footer>

      {drawerOpen && (
        <div className="absolute inset-0 z-20 flex justify-end bg-black/25 backdrop-blur-[1px]">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            aria-label="Close drawer"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-md flex-col border-l border-[#e0d5ec] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e0d5ec] px-4 py-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lab)]">
                  Rubric & evidence
                </div>
                <div className="text-[14px] font-semibold text-[var(--ink)]">
                  {payload.rubric.title}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-2">
                {payload.rubric.steps.map((step, i) => {
                  const on = localChecked.includes(step.id);
                  return (
                    <button
                      key={step.id}
                      type="button"
                      disabled={labDone}
                      onClick={() => toggle(step.id)}
                      className={`w-full rounded-xl border p-3 text-left ${
                        on ? 'border-emerald-300 bg-emerald-50/80' : 'border-[var(--line)] bg-[var(--panel)]'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {on ? (
                          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                        ) : (
                          <Square className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
                        )}
                        <div>
                          <div className="text-[13px] font-semibold text-[var(--ink)]">
                            {i + 1}. {step.title}
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--ink-muted)]">{step.instructions}</p>
                          <div className="mt-2 rounded-lg bg-[#f6f2fb] px-2.5 py-1.5 text-[11px]">
                            <span className="font-semibold text-[var(--lab)]">Expected: </span>
                            {step.expectedResult}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-dashed border-[var(--line)] p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                  Evidence (UI preview)
                </div>
                <label className="mb-2 flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[12px] text-[var(--ink-muted)]">
                  <Upload className="h-3.5 w-3.5" />
                  Add screenshot / file (coming soon)
                  <input type="file" className="hidden" disabled />
                </label>
                <input
                  type="url"
                  placeholder="Proof URL"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  disabled={labDone}
                  className="mb-2 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-[12px]"
                />
                <textarea
                  placeholder="Written notes / confirmation"
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  disabled={labDone}
                  rows={3}
                  className="mb-2 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-[12px]"
                />
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={labDone}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I confirm I completed the lab steps
                </label>
              </div>
            </div>

            <div className="border-t border-[#e0d5ec] p-4">
              {!labDone ? (
                <button
                  type="button"
                  disabled={!confirmed || localChecked.length < payload.rubric.steps.length}
                  onClick={submitLab}
                  className="w-full rounded-lg bg-[var(--lab)] px-3 py-2.5 text-[13px] font-semibold text-white enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Submit lab & mark complete
                </button>
              ) : (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-[13px] font-semibold text-emerald-800">
                  Lab passed — you can continue
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
