import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html as htmlLang } from '@codemirror/lang-html';
import {
  closeSearchPanel,
  openSearchPanel,
  search,
  searchKeymap,
  searchPanelOpen,
} from '@codemirror/search';
import { keymap, type EditorView } from '@codemirror/view';
import { Plus, Trash2, Upload } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';
import type { StringKey } from '../../i18n/strings';
import type {
  LabActivity,
  LabResource,
  LabRubric,
  LabSection,
  LabStep,
  LabSubmissionConfig,
} from '@shared/types';

export type LabEditContext = {
  courseId: string;
  labId: string;
};

type LabSectionSource = LabSection & { html: string };

type LabSourcePayload = {
  labId: string;
  activity: LabActivity;
  sections: LabSectionSource[];
  rubric: LabRubric;
};

type LabTab = 'lab' | 'brief' | 'sections' | 'rubric';

type SubmissionMethod = LabSubmissionConfig['methods'][number];

const METHODS: SubmissionMethod[] = ['screenshot', 'url', 'written', 'confirmation', 'file'];

const METHOD_LABEL: Record<SubmissionMethod, StringKey> = {
  screenshot: 'labEditMethodScreenshot',
  url: 'labEditMethodUrl',
  written: 'labEditMethodWritten',
  confirmation: 'labEditMethodConfirmation',
  file: 'labEditMethodFile',
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export function LabEditPanel({
  context,
  onDirtyChange,
  onSavingChange,
  onFileLabel,
  registerSave,
  registerInsert,
  registerToggleFind,
  onSaved,
}: {
  context: LabEditContext;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onFileLabel: (file: string | null) => void;
  registerSave: (fn: () => Promise<void>) => void;
  registerInsert?: (fn: (snippet: string) => void) => void;
  registerToggleFind?: (fn: () => void) => void;
  onSaved?: (labId: string) => void;
}) {
  const { tr } = usePrefs();
  const [tab, setTab] = useState<LabTab>('lab');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activity, setActivity] = useState<LabActivity | null>(null);
  const [sections, setSections] = useState<LabSectionSource[]>([]);
  const [rubric, setRubric] = useState<LabRubric | null>(null);
  const [deleteSectionIds, setDeleteSectionIds] = useState<string[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);

  const baseline = useRef('');
  const viewRef = useRef<EditorView | null>(null);
  const extensions = useMemo(() => [htmlLang(), search(), keymap.of(searchKeymap)], []);

  const activeSection = sections.find((s) => s.id === activeSectionId) ?? null;
  const activeHtmlRef = useRef('');
  activeHtmlRef.current = activeSection?.html ?? '';

  const TABS: Array<{ id: LabTab; label: string }> = [
    { id: 'lab', label: tr('labEditTabLab') },
    { id: 'brief', label: tr('labEditTabBrief') },
    { id: 'sections', label: tr('labEditTabSections') },
    { id: 'rubric', label: tr('labEditTabRubric') },
  ];

  const applyPayload = useCallback((data: LabSourcePayload, activeId?: string | null) => {
    setActivity(data.activity);
    setSections(data.sections);
    setRubric(data.rubric);
    setDeleteSectionIds([]);
    setActiveSectionId(activeId !== undefined ? activeId : (data.sections[0]?.id ?? null));
    baseline.current = JSON.stringify({
      activity: data.activity,
      sections: data.sections,
      rubric: data.rubric,
      deleteSectionIds: [] as string[],
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError(null);
    void (async () => {
      const res = await apiFetch<LabSourcePayload>({
        method: 'GET',
        path: `/api/courses/${context.courseId}/lab-source`,
        params: { labId: context.labId },
      });
      if (cancelled) return;
      if (!res.ok || !res.data) {
        setError(res.error ?? tr('labEditLoadError'));
        setActivity(null);
        setSections([]);
        setRubric(null);
        setDeleteSectionIds([]);
        setActiveSectionId(null);
        baseline.current = '';
        setLoaded(true);
        return;
      }
      applyPayload(res.data);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [context.courseId, context.labId, tr, applyPayload]);

  // Dirty tracking: compare a snapshot of the editable payload to the saved baseline.
  useEffect(() => {
    if (!loaded) return;
    const snapshot = JSON.stringify({ activity, sections, rubric, deleteSectionIds });
    onDirtyChange(snapshot !== baseline.current);
  }, [loaded, activity, sections, rubric, deleteSectionIds, onDirtyChange]);

  useEffect(() => {
    if (tab === 'sections') {
      onFileLabel(activeSection?.file ?? null);
    } else {
      onFileLabel(null);
    }
  }, [tab, activeSection?.id, activeSection?.file, onFileLabel]);

  const save = useCallback(async () => {
    if (!activity || !rubric) return;
    onSavingChange(true);
    setError(null);
    const activityPayload: LabActivity = {
      ...activity,
      sections: sections.map(({ id, title, file }) => ({ id, title, file })),
    };
    const res = await apiFetch<LabSourcePayload>({
      method: 'PUT',
      path: `/api/courses/${context.courseId}/lab-source`,
      body: {
        labId: context.labId,
        activity: activityPayload,
        sections,
        rubric,
        ...(deleteSectionIds.length ? { deleteSectionIds } : {}),
      },
    });
    onSavingChange(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? tr('labEditSaveError'));
      return;
    }
    const keepId = activeSectionId;
    const nextActiveId = res.data.sections.some((s) => s.id === keepId)
      ? keepId
      : res.data.sections[0]?.id ?? null;
    applyPayload(res.data, nextActiveId);
    onSaved?.(context.labId);
  }, [
    activity,
    sections,
    rubric,
    deleteSectionIds,
    activeSectionId,
    context.courseId,
    context.labId,
    onSavingChange,
    onSaved,
    tr,
    applyPayload,
  ]);

  const addSection = useCallback(async () => {
    setAddingSection(true);
    setError(null);
    const res = await apiFetch<LabSourcePayload>({
      method: 'POST',
      path: `/api/courses/${context.courseId}/labs/${context.labId}/sections/add`,
      body: {},
    });
    setAddingSection(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? tr('labEditAddSectionError'));
      return;
    }
    const newId = res.data.sections[res.data.sections.length - 1]?.id ?? null;
    applyPayload(res.data, newId);
  }, [context.courseId, context.labId, tr, applyPayload]);

  const deleteSection = useCallback(
    (id: string) => {
      if (!window.confirm(tr('labEditDeleteSectionConfirm'))) return;
      setSections((prev) => {
        const next = prev.filter((s) => s.id !== id);
        setActiveSectionId((cur) => (cur === id ? next[0]?.id ?? null : cur));
        return next;
      });
      setDeleteSectionIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
    [tr],
  );

  const updateActiveSection = useCallback(
    (patch: Partial<LabSectionSource>) => {
      setSections((prev) => prev.map((s) => (s.id === activeSectionId ? { ...s, ...patch } : s)));
    },
    [activeSectionId],
  );

  const patchActivity = useCallback((patch: Partial<LabActivity>) => {
    setActivity((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const patchRubric = useCallback((patch: Partial<LabRubric>) => {
    setRubric((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const addStep = useCallback(() => {
    setRubric((prev) => {
      if (!prev) return prev;
      const n = prev.steps.length + 1;
      const step: LabStep = { id: `step-${n}`, title: '', instructions: '', expectedResult: '' };
      return { ...prev, steps: [...prev.steps, step] };
    });
  }, []);

  const updateStep = useCallback((id: string, patch: Partial<LabStep>) => {
    setRubric((prev) =>
      prev
        ? { ...prev, steps: prev.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) }
        : prev,
    );
  }, []);

  const removeStep = useCallback((id: string) => {
    setRubric((prev) => (prev ? { ...prev, steps: prev.steps.filter((s) => s.id !== id) } : prev));
  }, []);

  const toggleMethod = useCallback(
    (m: SubmissionMethod) => {
      setActivity((prev) => {
        if (!prev) return prev;
        const submission: LabSubmissionConfig = prev.submission ?? { methods: [] };
        const methods = submission.methods.includes(m)
          ? submission.methods.filter((x) => x !== m)
          : [...submission.methods, m];
        return { ...prev, submission: { ...submission, methods } };
      });
    },
    [],
  );

  const toggleAllowEvidence = useCallback(() => {
    setActivity((prev) => {
      if (!prev) return prev;
      const submission: LabSubmissionConfig = prev.submission ?? { methods: [] };
      return { ...prev, submission: { ...submission, allowEvidence: !submission.allowEvidence } };
    });
  }, []);

  /** Insert via React state (not EditorView.dispatch) so controlled CodeMirror sync cannot revert it. */
  const insertAtCursor = useCallback(
    (snippet: string) => {
      if (!activeSectionId) return;
      const block = String(snippet ?? '')
        .replace(/^\uFEFF/, '')
        .trimEnd();
      if (!block) return;
      const insert = `${block}\n\n`;

      const view = viewRef.current;
      let next: string;
      let caret = -1;
      if (view?.dom?.isConnected) {
        const doc = view.state.doc.toString();
        const from = Math.max(0, Math.min(view.state.selection.main.from, doc.length));
        next = doc.slice(0, from) + insert + doc.slice(from);
        caret = from + insert.length;
      } else {
        const cur = activeHtmlRef.current;
        next = cur + (cur && !cur.endsWith('\n') ? '\n' : '') + insert;
        caret = next.length;
      }

      activeHtmlRef.current = next;
      updateActiveSection({ html: next });

      if (caret >= 0) {
        requestAnimationFrame(() => {
          const v = viewRef.current;
          if (!v?.dom?.isConnected) return;
          const pos = Math.min(caret, v.state.doc.length);
          v.dispatch({ selection: { anchor: pos, head: pos }, scrollIntoView: true });
          v.focus();
        });
      }
    },
    [activeSectionId, updateActiveSection],
  );

  const saveRef = useRef(save);
  saveRef.current = save;

  const insertRef = useRef(insertAtCursor);
  insertRef.current = insertAtCursor;

  const toggleFind = useCallback(() => {
    const view = viewRef.current;
    if (!view?.dom?.isConnected) return;
    if (searchPanelOpen(view.state)) closeSearchPanel(view);
    else openSearchPanel(view);
  }, []);
  const toggleFindRef = useRef(toggleFind);
  toggleFindRef.current = toggleFind;

  useLayoutEffect(() => {
    registerSave(() => saveRef.current());
  }, [registerSave]);

  useLayoutEffect(() => {
    registerInsert?.((snippet) => insertRef.current(snippet));
  }, [registerInsert]);

  useLayoutEffect(() => {
    registerToggleFind?.(() => toggleFindRef.current());
  }, [registerToggleFind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
      e.preventDefault();
      e.stopPropagation();
      void saveRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center px-3 text-[12px] text-[var(--ink-muted)]">
        …
      </div>
    );
  }

  if (!activity || !rubric) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center text-[12px] text-rose-600">
        {error ?? tr('labEditLoadError')}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error && (
        <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">
          {error}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1 border-b border-[var(--line)] bg-[var(--panel)] px-2 py-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`cursor-pointer rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${
              tab === t.id
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'lab' && (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-2.5">
            <Field label={tr('labEditTitle')}>
              <TextInput
                value={activity.title}
                onChange={(v) => patchActivity({ title: v })}
              />
            </Field>
            <Field label={tr('labEditDescription')}>
              <TextArea
                rows={3}
                value={activity.description ?? ''}
                onChange={(v) => patchActivity({ description: v })}
              />
            </Field>
            <Field label={tr('labEditEstimatedMinutes')}>
              <input
                type="number"
                min={0}
                value={activity.estimatedMinutes ?? 0}
                onChange={(e) =>
                  patchActivity({ estimatedMinutes: Number(e.target.value) || 0 })
                }
                className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </Field>
            <Field label={tr('labEditId')}>
              <input
                value={activity.id}
                disabled
                className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink-muted)] opacity-70 outline-none"
              />
            </Field>
            <Field label={tr('labEditRubricFile')}>
              <input
                value={activity.rubricFile}
                disabled
                className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[12px] text-[var(--ink-muted)] opacity-70 outline-none"
              />
            </Field>
          </div>
        </div>
      )}

      {tab === 'brief' && (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-4">
            <Field label={tr('labEditLearningObjective')}>
              <TextArea
                rows={3}
                value={activity.learningObjective ?? ''}
                placeholder={tr('labEditLearningObjectivePlaceholder')}
                onChange={(v) => patchActivity({ learningObjective: v })}
              />
            </Field>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  {tr('labEditResources')}
                </span>
                <button
                  type="button"
                  title={tr('labEditAddResource')}
                  onClick={() =>
                    patchActivity({ resources: [...(activity.resources ?? []), ''] })
                  }
                  className="cursor-pointer rounded-md p-1 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {(activity.resources ?? []).length === 0 ? (
                <p className="text-[12px] text-[var(--ink-muted)]">{tr('labEditNoResources')}</p>
              ) : (
                <div className="space-y-2">
                  {(activity.resources ?? []).map((res, index) => (
                    <ResourceRow
                      key={index}
                      resource={res}
                      courseId={context.courseId}
                      labId={context.labId}
                      tr={tr}
                      onChange={(next) => {
                        const list = [...(activity.resources ?? [])];
                        list[index] = next;
                        patchActivity({ resources: list });
                      }}
                      onRemove={() => {
                        const list = (activity.resources ?? []).filter((_, i) => i !== index);
                        patchActivity({ resources: list });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'sections' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--line)] px-2 py-1.5">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSectionId(s.id)}
                className={`shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium ${
                  activeSectionId === s.id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]'
                }`}
                title={s.title || s.id}
              >
                {s.title || s.id}
              </button>
            ))}
            <button
              type="button"
              disabled={addingSection}
              onClick={() => void addSection()}
              title={tr('labEditAddSection')}
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)] disabled:cursor-wait disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {activeSection ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] px-2 py-1.5">
                <input
                  value={activeSection.title}
                  placeholder={tr('labEditSectionTitle')}
                  onChange={(e) => updateActiveSection({ title: e.target.value })}
                  className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  title={tr('labEditDeleteSection')}
                  onClick={() => deleteSection(activeSection.id)}
                  className="shrink-0 cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="hc-code-editor min-h-0 flex-1 overflow-hidden">
                <CodeMirror
                  key={activeSection.id}
                  value={activeSection.html}
                  height="100%"
                  theme="light"
                  extensions={extensions}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                    bracketMatching: true,
                    autocompletion: true,
                    indentOnInput: true,
                  }}
                  onCreateEditor={(view) => {
                    viewRef.current = view;
                  }}
                  onChange={(value) => updateActiveSection({ html: value })}
                  className="h-full text-[12px]"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 text-center text-[12px] text-[var(--ink-muted)]">
              {tr('labEditNoSections')}
            </div>
          )}
        </div>
      )}

      {tab === 'rubric' && (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-4">
            <Field label={tr('labEditRubricTitle')}>
              <TextInput value={rubric.title} onChange={(v) => patchRubric({ title: v })} />
            </Field>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  {tr('labEditRubricSteps')}
                </span>
                <button
                  type="button"
                  title={tr('labEditAddStep')}
                  onClick={addStep}
                  className="cursor-pointer rounded-md p-1 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {rubric.steps.length === 0 ? (
                <p className="text-[12px] text-[var(--ink-muted)]">{tr('labEditNoSteps')}</p>
              ) : (
                <div className="space-y-2">
                  {rubric.steps.map((step, i) => (
                    <div
                      key={step.id}
                      className="space-y-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                          {i + 1}. {step.id}
                        </span>
                        <button
                          type="button"
                          title={tr('labEditDeleteStep')}
                          onClick={() => removeStep(step.id)}
                          className="cursor-pointer rounded-md p-1 text-[var(--ink-muted)] hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <TextInput
                        value={step.title}
                        placeholder={tr('labEditStepTitle')}
                        onChange={(v) => updateStep(step.id, { title: v })}
                      />
                      <TextArea
                        rows={2}
                        value={step.instructions}
                        placeholder={tr('labEditStepInstructions')}
                        onChange={(v) => updateStep(step.id, { instructions: v })}
                      />
                      <TextArea
                        rows={2}
                        value={step.expectedResult}
                        placeholder={tr('labEditStepExpected')}
                        onChange={(v) => updateStep(step.id, { expectedResult: v })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                {tr('labEditSubmissionMethods')}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {METHODS.map((m) => (
                  <label
                    key={m}
                    className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]"
                  >
                    <input
                      type="checkbox"
                      checked={(activity.submission?.methods ?? []).includes(m)}
                      onChange={() => toggleMethod(m)}
                      className="accent-[var(--accent)]"
                    />
                    {tr(METHOD_LABEL[m])}
                  </label>
                ))}
              </div>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-[12px] text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={Boolean(activity.submission?.allowEvidence)}
                  onChange={toggleAllowEvidence}
                  className="accent-[var(--accent)]"
                />
                {tr('labEditAllowEvidence')}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
    />
  );
}

function TextArea({
  value,
  placeholder,
  rows = 3,
  onChange,
}: {
  value: string;
  placeholder?: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-none rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
    />
  );
}

type ResourceKind = 'text' | 'link' | 'file';

function resourceKind(resource: LabResource): ResourceKind {
  if (typeof resource === 'string') return 'text';
  if (resource.asset) return 'file';
  if (resource.url) return 'link';
  return 'text';
}

function ResourceRow({
  resource,
  courseId,
  labId,
  tr,
  onChange,
  onRemove,
}: {
  resource: LabResource;
  courseId: string;
  labId: string;
  tr: (key: StringKey) => string;
  onChange: (next: LabResource) => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const kind = resourceKind(resource);
  const label = typeof resource === 'string' ? resource : resource.label;
  const url = typeof resource === 'string' ? '' : resource.url ?? '';
  const asset = typeof resource === 'string' ? undefined : resource.asset;

  const setKind = (next: ResourceKind) => {
    if (next === 'text') onChange(label || '');
    else if (next === 'link') onChange({ label: label || '', url: url || '' });
    else onChange({ label: label || '', asset: asset ?? '' });
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const dataBase64 = await readFileAsBase64(file);
      const res = await apiFetch<{ asset: string; label: string }>({
        method: 'POST',
        path: `/api/courses/${courseId}/labs/${labId}/starter-files`,
        body: { filename: file.name, dataBase64 },
      });
      if (!res.ok || !res.data) {
        setUploadError(res.error ?? tr('labEditResourceUploadError'));
        return;
      }
      onChange({ label: res.data.label, asset: res.data.asset });
    } catch {
      setUploadError(tr('labEditResourceUploadError'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-2.5">
      <div className="flex items-center gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ResourceKind)}
          className="rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1 text-[11px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        >
          <option value="text">{tr('labEditResourceTypeText')}</option>
          <option value="link">{tr('labEditResourceTypeLink')}</option>
          <option value="file">{tr('labEditResourceTypeFile')}</option>
        </select>
        <button
          type="button"
          title={tr('labEditRemoveResource')}
          onClick={onRemove}
          className="ml-auto cursor-pointer rounded-md p-1 text-[var(--ink-muted)] hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {kind === 'text' ? (
        <TextInput
          value={label}
          placeholder={tr('labEditResourceTextPlaceholder')}
          onChange={(v) => onChange(v)}
        />
      ) : (
        <>
          <TextInput
            value={label}
            placeholder={tr('labEditResourceLabel')}
            onChange={(v) => onChange(kind === 'link' ? { label: v, url } : { label: v, asset })}
          />
          {kind === 'link' ? (
            <TextInput
              value={url}
              placeholder={tr('labEditResourceUrl')}
              onChange={(v) => onChange({ label, url: v })}
            />
          ) : (
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1.5 text-[11px] text-[var(--ink-muted)] hover:bg-black/5">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? tr('labEditResourceUploading') : tr('labEditResourceFile')}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void handleFile(file);
                  }}
                />
              </label>
              {asset && (
                <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--ink-muted)]">
                  {asset}
                </span>
              )}
            </div>
          )}
          {uploadError && <div className="text-[11px] text-rose-600">{uploadError}</div>}
        </>
      )}
    </div>
  );
}
