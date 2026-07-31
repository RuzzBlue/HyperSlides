import { useEffect, useState } from 'react';
import { LayoutTemplate, Loader2, X } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';

type TemplateLesson = {
  slideKey: string;
  id: string;
  title: string;
  file: string;
};

type TemplateUnit = {
  id: string;
  title: string;
  lessons: TemplateLesson[];
};

type TemplateModule = {
  id: string;
  title: string;
  description?: string;
  units: TemplateUnit[];
};

type TemplateCatalog = {
  courseId: string;
  courseTitle: string;
  modules: TemplateModule[];
};

export function TemplatePickerButton({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (html: string) => void;
}) {
  const { tr } = usePrefs();

  return (
    <div className="relative">
      <button
        type="button"
        title={tr('inspectorCodeTemplates')}
        onClick={() => onOpenChange(!open)}
        className={`cursor-pointer rounded-md p-1.5 hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/10 ${
          open ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-muted)]'
        }`}
      >
        <LayoutTemplate className="h-4 w-4" />
      </button>
      {open && (
        <TemplatePickerMenu
          onClose={() => onOpenChange(false)}
          onInsert={(html) => {
            onInsert(html);
            onOpenChange(false);
          }}
        />
      )}
    </div>
  );
}

function TemplatePickerMenu({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (html: string) => void;
}) {
  const { tr } = usePrefs();
  const [catalog, setCatalog] = useState<TemplateCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [insertingKey, setInsertingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      const res = await apiFetch<TemplateCatalog>({
        method: 'GET',
        path: '/api/lesson-templates',
      });
      if (cancelled) return;
      if (!res.ok || !res.data) {
        setError(res.error ?? tr('inspectorCodeTemplatesLoadError'));
        setLoading(false);
        return;
      }
      setCatalog(res.data);
      setModuleId(res.data.modules[0]?.id ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tr]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activeModule = catalog?.modules.find((m) => m.id === moduleId) ?? catalog?.modules[0];

  const insertLesson = async (lesson: TemplateLesson) => {
    setInsertingKey(lesson.slideKey);
    setError(null);
    const res = await apiFetch<{ html: string }>({
      method: 'GET',
      path: '/api/lesson-templates/source',
      params: { slideKey: lesson.slideKey },
    });
    setInsertingKey(null);
    if (!res.ok || !res.data) {
      setError(res.error ?? tr('inspectorCodeTemplatesLoadError'));
      return;
    }
    onInsert(res.data.html.replace(/^\uFEFF/, ''));
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-[70] cursor-default bg-black/10"
        onClick={onClose}
      />
      <div
        className="absolute right-0 top-full z-[80] mt-1 flex max-h-[min(70vh,560px)] w-[min(92vw,420px)] flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--stage)] shadow-2xl"
        role="dialog"
        aria-label={tr('inspectorCodeTemplates')}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2">
          <LayoutTemplate className="h-4 w-4 text-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-[var(--ink)]">
              {tr('inspectorCodeTemplates')}
            </div>
            <div className="truncate text-[10px] text-[var(--ink-muted)]">
              {catalog?.courseTitle ?? tr('inspectorCodeTemplatesHint')}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 px-4 py-10 text-[12px] text-[var(--ink-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            …
          </div>
        ) : error && !catalog ? (
          <div className="px-4 py-6 text-[12px] text-rose-600">{error}</div>
        ) : (
          <>
            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--line)] px-2 py-1.5">
              {catalog?.modules.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setModuleId(mod.id)}
                  className={`shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
                    activeModule?.id === mod.id
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--ink-muted)] hover:bg-[var(--panel)] hover:text-[var(--ink)]'
                  }`}
                >
                  {mod.title}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {error && (
                <div className="mb-2 rounded-md bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
                  {error}
                </div>
              )}
              {activeModule?.units.map((unit) => (
                <div key={unit.id} className="mb-3">
                  <div className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                    {unit.title}
                  </div>
                  <div className="grid gap-0.5">
                    {unit.lessons.map((lesson) => {
                      const busy = insertingKey === lesson.slideKey;
                      return (
                        <button
                          key={lesson.slideKey}
                          type="button"
                          disabled={Boolean(insertingKey)}
                          onClick={() => void insertLesson(lesson)}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] text-[var(--ink)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">{lesson.title}</span>
                          {busy && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {!activeModule?.units.length && (
                <div className="px-2 py-6 text-center text-[12px] text-[var(--ink-muted)]">
                  {tr('inspectorCodeTemplatesEmpty')}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
