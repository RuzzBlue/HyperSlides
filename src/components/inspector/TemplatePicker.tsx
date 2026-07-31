import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutTemplate, Loader2, X } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';

type TemplateSection = {
  id: string;
  slideKey: string;
  sectionIndex: number;
  title: string;
  html?: string;
};

type TemplateLesson = {
  slideKey: string;
  id: string;
  title: string;
  file: string;
  sections: TemplateSection[];
};

type TemplateUnit = {
  id: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
  lessons: TemplateLesson[];
};

type TemplateCatalog = {
  courseId: string;
  courseTitle: string;
  units: TemplateUnit[];
};

type MenuLayout = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const MENU_WIDTH = 400;
const MENU_PAD = 8;

function measureMenuLayout(anchor: HTMLElement): MenuLayout {
  const btn = anchor.getBoundingClientRect();
  const panel =
    anchor.closest<HTMLElement>('[data-inspector-panel]') ??
    anchor.closest<HTMLElement>('[role="dialog"]');
  const bounds = panel?.getBoundingClientRect() ?? {
    top: MENU_PAD,
    left: MENU_PAD,
    right: window.innerWidth - MENU_PAD,
    bottom: window.innerHeight - MENU_PAD,
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const width = Math.min(MENU_WIDTH, Math.max(260, bounds.width - MENU_PAD * 2));
  let left = btn.right - width;
  left = Math.max(bounds.left + MENU_PAD, Math.min(left, bounds.right - width - MENU_PAD));
  left = Math.max(MENU_PAD, Math.min(left, window.innerWidth - width - MENU_PAD));

  const spaceBelow = Math.min(bounds.bottom, window.innerHeight - MENU_PAD) - (btn.bottom + 4);
  const spaceAbove = btn.top - 4 - Math.max(bounds.top, MENU_PAD);
  const panelCap = Math.max(140, bounds.height - MENU_PAD * 2);
  const viewCap = Math.floor(window.innerHeight * 0.72);

  const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
  const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
  const maxHeight = Math.min(available, panelCap, viewCap);
  const top = openUp ? btn.top - 4 - maxHeight : btn.bottom + 4;

  return { top, left, width, maxHeight };
}

export function TemplatePickerButton({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Return false to keep the menu open (e.g. insert handler not ready). */
  onInsert: (html: string) => boolean | void;
}) {
  const { tr } = usePrefs();
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        title={tr('inspectorCodeTemplates')}
        onClick={() => onOpenChange(!open)}
        className={`cursor-pointer rounded-md p-1.5 hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/10 ${
          open ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-muted)]'
        }`}
      >
        <LayoutTemplate className="h-4 w-4" />
      </button>
      {open && anchorRef.current && (
        <TemplatePickerMenu
          anchorEl={anchorRef.current}
          onClose={() => onOpenChange(false)}
          onInsert={(html) => {
            const ok = onInsert(html);
            if (ok === false) return false;
            onOpenChange(false);
            return true;
          }}
        />
      )}
    </div>
  );
}

function TemplatePickerMenu({
  anchorEl,
  onClose,
  onInsert,
}: {
  anchorEl: HTMLElement;
  onClose: () => void;
  onInsert: (html: string) => boolean | void;
}) {
  const { tr } = usePrefs();
  const [catalog, setCatalog] = useState<TemplateCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [insertingKey, setInsertingKey] = useState<string | null>(null);
  const [layout, setLayout] = useState<MenuLayout>(() => measureMenuLayout(anchorEl));

  useLayoutEffect(() => {
    const update = () => setLayout(measureMenuLayout(anchorEl));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorEl]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
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
        setUnitId(res.data.units[0]?.id ?? null);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError(tr('inspectorCodeTemplatesLoadError'));
        setLoading(false);
      }
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

  const activeUnit = catalog?.units.find((u) => u.id === unitId) ?? catalog?.units[0];

  const insertSection = async (section: TemplateSection) => {
    const apply = (raw: string) => {
      const html = raw.replace(/^\uFEFF/, '').trim();
      if (!html) {
        setError(tr('inspectorCodeTemplatesLoadError'));
        return;
      }
      const ok = onInsert(html);
      if (ok === false) {
        setError(tr('inspectorCodeTemplatesLoadError'));
      }
    };

    if (section.html?.trim()) {
      apply(section.html);
      return;
    }

    setInsertingKey(section.id);
    setError(null);
    try {
      const res = await apiFetch<{ html: string }>({
        method: 'GET',
        path: '/api/lesson-templates/source',
        params: {
          slideKey: section.slideKey,
          sectionIndex: String(section.sectionIndex),
        },
      });
      if (!res.ok || !res.data?.html) {
        setError(res.error ?? tr('inspectorCodeTemplatesLoadError'));
        return;
      }
      apply(res.data.html);
    } catch {
      setError(tr('inspectorCodeTemplatesLoadError'));
    } finally {
      setInsertingKey(null);
    }
  };

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-[90] cursor-default bg-black/10"
        onClick={onClose}
      />
      <div
        className="fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--stage)] shadow-2xl"
        style={{
          top: layout.top,
          left: layout.left,
          width: layout.width,
          height: layout.maxHeight,
          maxHeight: layout.maxHeight,
        }}
        role="dialog"
        aria-label={tr('inspectorCodeTemplates')}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2">
          <LayoutTemplate className="h-4 w-4 shrink-0 text-[var(--accent)]" />
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
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <aside className="flex w-[7.75rem] shrink-0 flex-col overflow-y-auto border-r border-[var(--line)] bg-[var(--panel)] py-1.5">
              {catalog?.units.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setUnitId(unit.id)}
                  className={`mx-1 cursor-pointer rounded-md px-2 py-1.5 text-left text-[11px] font-semibold leading-snug ${
                    activeUnit?.id === unit.id
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--ink-muted)] hover:bg-[var(--stage)] hover:text-[var(--ink)]'
                  }`}
                  title={unit.moduleTitle}
                >
                  {unit.title}
                </button>
              ))}
            </aside>

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-2 py-2">
              {error && (
                <div className="mb-2 rounded-md bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
                  {error}
                </div>
              )}
              {activeUnit?.lessons.map((lesson) => (
                <div key={lesson.slideKey} className="mb-3">
                  <div className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                    {lesson.title}
                  </div>
                  <div className="grid gap-0.5">
                    {lesson.sections.map((section) => {
                      const busy = insertingKey === section.id;
                      return (
                        <button
                          key={section.id}
                          type="button"
                          disabled={Boolean(insertingKey)}
                          onClick={() => void insertSection(section)}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-[var(--ink)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">{section.title}</span>
                          {busy && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {!activeUnit?.lessons.length && (
                <div className="px-2 py-6 text-center text-[12px] text-[var(--ink-muted)]">
                  {tr('inspectorCodeTemplatesEmpty')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
