import { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  ClipboardCheck,
  Download,
  ExternalLink,
  FlaskConical,
  Square,
  Upload,
  X,
} from 'lucide-react';
import { courseStaticUrl } from '../api/client';
import type { LabPayload, LabResource } from '@shared/types';

const BRIEF_ID = '__lab_brief';

/** Resolve course-relative image/file srcs so lab HTML assets load from /courses/... */
function rewriteLabHtml(html: string, courseFolder: string): string {
  return html.replace(
    /\bsrc=(["'])(?!https?:|data:|blob:|\/\/)([^"']+)\1/gi,
    (_m, quote: string, src: string) => {
      const cleaned = src.trim().replace(/^\.\//, '');
      return `src=${quote}${courseStaticUrl(courseFolder, cleaned)}${quote}`;
    },
  );
}

type NormalizedResource = {
  key: string;
  label: string;
  href?: string;
  kind: 'link' | 'download' | 'note';
};

function normalizeResources(
  resources: LabResource[] | undefined,
  courseFolder: string,
): NormalizedResource[] {
  if (!resources?.length) return [];
  return resources.map((r, i) => {
    if (typeof r === 'string') {
      const looksLikeUrl = /^https?:\/\//i.test(r);
      return {
        key: `r-${i}`,
        label: r,
        href: looksLikeUrl ? r : undefined,
        kind: looksLikeUrl ? 'link' : 'note',
      };
    }
    if (r.asset) {
      return {
        key: `r-${i}`,
        label: r.label,
        href: courseStaticUrl(courseFolder, r.asset),
        kind: 'download',
      };
    }
    if (r.url) {
      return {
        key: `r-${i}`,
        label: r.label,
        href: r.url,
        kind: 'link',
      };
    }
    return { key: `r-${i}`, label: r.label, kind: 'note' };
  });
}

export function LabView({
  payload,
  courseFolder,
  checked,
  passed,
  onCheck,
  onPass,
  onContinue,
}: {
  payload: LabPayload;
  courseFolder: string;
  checked: string[];
  passed?: boolean;
  onCheck: (stepIds: string[]) => void;
  onPass: () => void;
  onContinue: () => void;
}) {
  const contentSections =
    payload.sections.length > 0
      ? payload.sections
      : [{ id: 'instructions', title: 'Instructions', html: payload.instructionsHtml }];

  const navSections = useMemo(
    () => [{ id: BRIEF_ID, title: 'Lab brief' }, ...contentSections.map((s) => ({ id: s.id, title: s.title }))],
    [contentSections],
  );

  const [activeSection, setActiveSection] = useState(BRIEF_ID);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localChecked, setLocalChecked] = useState<string[]>(checked);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [labDone, setLabDone] = useState(Boolean(passed));

  const resources = useMemo(
    () => normalizeResources(payload.activity.resources, courseFolder),
    [payload.activity.resources, courseFolder],
  );

  useEffect(() => {
    setLocalChecked(checked);
  }, [checked]);

  useEffect(() => {
    setLabDone(Boolean(passed));
  }, [passed]);

  useEffect(() => {
    setActiveSection(BRIEF_ID);
    setDrawerOpen(false);
    setEvidenceNote('');
    setEvidenceUrl('');
    setConfirmed(false);
  }, [payload.activity.id]);

  const activeHtml =
    activeSection === BRIEF_ID
      ? ''
      : rewriteLabHtml(
          contentSections.find((s) => s.id === activeSection)?.html ??
            contentSections[0]?.html ??
            '',
          courseFolder,
        );

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
    <div className="relative flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#faf8fc_0%,#f3eef8_100%)] dark:bg-[linear-gradient(180deg,#1a1624_0%,#12151b_100%)]">
      <header className="border-b border-[color-mix(in_srgb,var(--lab)_28%,transparent)] bg-[var(--lab-soft)] px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--lab)] text-white shadow-sm">
            <FlaskConical className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="text-2xl font-semibold text-[var(--ink)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {payload.activity.title}
              </h2>
              {payload.activity.estimatedMinutes != null && (
                <span className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--lab)_35%,transparent)] bg-white/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--lab)] dark:bg-slate-900/50 dark:text-violet-200">
                  ~{payload.activity.estimatedMinutes} min
                </span>
              )}
            </div>
            {payload.activity.description && (
              <p className="mt-1 max-w-3xl text-sm text-[var(--ink-muted)]">
                {payload.activity.description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--lab)] px-3 py-2 text-[12px] font-semibold text-white shadow-sm hover:brightness-110"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            {labDone ? 'Review submission' : 'Submit'}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[220px_1fr]">
        <aside className="min-h-0 overflow-y-auto border-r border-[color-mix(in_srgb,var(--lab)_22%,transparent)] bg-white/60 p-3 dark:bg-slate-900/50">
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Sections
          </div>
          <div className="space-y-1">
            {navSections.map((sec, i) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] ${
                  activeSection === sec.id
                    ? 'bg-[color-mix(in_srgb,var(--lab)_16%,transparent)] font-semibold text-[var(--lab)] dark:text-violet-200'
                    : 'text-[var(--ink)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[var(--lab)] ring-1 ring-[color-mix(in_srgb,var(--lab)_28%,transparent)] dark:bg-slate-800">
                  {i === 0 ? 'ℹ' : i}
                </span>
                {sec.title}
              </button>
            ))}
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto p-6 dark:bg-slate-950/40">
          {activeSection === BRIEF_ID ? (
            <LabBrief
              objective={payload.activity.learningObjective}
              resources={resources}
            />
          ) : (
            <div
              className="lab-html max-w-3xl text-[14px] text-[var(--ink)]"
              dangerouslySetInnerHTML={{ __html: activeHtml }}
            />
          )}
        </section>
      </div>

      <footer className="flex items-center gap-3 border-t border-[color-mix(in_srgb,var(--lab)_22%,transparent)] bg-[var(--lab-soft)] px-6 py-2">
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
        <div className="absolute inset-0 z-20 flex justify-end bg-black/40 backdrop-blur-[1px]">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            aria-label="Close drawer"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-md flex-col border-l border-[color-mix(in_srgb,var(--lab)_28%,transparent)] bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--lab)_22%,transparent)] px-4 py-3">
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
                className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5 dark:hover:bg-white/10"
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
                        on
                          ? 'border-emerald-400 bg-emerald-50/80 dark:border-emerald-500 dark:bg-emerald-950/50'
                          : 'border-[var(--line)] bg-[var(--panel)]'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {on ? (
                          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                        ) : (
                          <Square className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
                        )}
                        <div>
                          <div className="text-[13px] font-semibold text-[var(--ink)]">
                            {i + 1}. {step.title}
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--ink-muted)]">{step.instructions}</p>
                          <div className="mt-2 rounded-lg bg-[color-mix(in_srgb,var(--lab)_10%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--ink)]">
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
                  className="mb-2 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[12px] text-[var(--ink)]"
                />
                <textarea
                  placeholder="Written notes / confirmation"
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  disabled={labDone}
                  rows={3}
                  className="mb-2 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[12px] text-[var(--ink)]"
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

            <div className="border-t border-[color-mix(in_srgb,var(--lab)_22%,transparent)] p-4">
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
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-[13px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
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

function LabBrief({
  objective,
  resources,
}: {
  objective?: string;
  resources: NormalizedResource[];
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2
          className="text-xl font-semibold text-[var(--ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Lab brief
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Learning objective and materials for this lab. Open links in a new tab, or download
          course files before you start the sections.
        </p>
      </div>

      {objective && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--lab)_28%,transparent)] bg-white/80 p-4 dark:bg-slate-900/70">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--lab)]">
            Learning objective
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink)]">{objective}</p>
        </div>
      )}

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          Resources
        </div>
        {resources.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No resources attached to this lab.</p>
        ) : (
          <ul className="space-y-2">
            {resources.map((r) => (
              <li key={r.key}>
                {r.href ? (
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noreferrer"
                    download={r.kind === 'download' ? true : undefined}
                    className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm font-medium text-[var(--lab)] hover:bg-[color-mix(in_srgb,var(--lab)_8%,transparent)] dark:bg-slate-900"
                  >
                    {r.kind === 'download' ? (
                      <Download className="h-4 w-4 shrink-0" />
                    ) : (
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">{r.label}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                      {r.kind === 'download' ? 'Download' : 'Open'}
                    </span>
                  </a>
                ) : (
                  <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] dark:bg-slate-900">
                    {r.label}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
