import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileQuestion, Loader2, X } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';

type QuestionTemplate = {
  id: string;
  label: string;
  type: string;
  json: string;
};

type MenuLayout = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const MENU_WIDTH = 320;
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

  const width = Math.min(MENU_WIDTH, Math.max(240, bounds.width - MENU_PAD * 2));
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

/**
 * Header-button + portal menu for inserting a starter question object into
 * the quiz questions JSON editor. Mirrors `TemplatePickerButton` (CodePanel).
 */
export function QuestionTemplatePickerButton({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (json: string) => void;
}) {
  const { tr } = usePrefs();
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        title={tr('inspectorQuizTemplates')}
        onClick={() => onOpenChange(!open)}
        className={`cursor-pointer rounded-md p-1.5 hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/10 ${
          open ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-muted)]'
        }`}
      >
        <FileQuestion className="h-4 w-4" />
      </button>
      {open && anchorRef.current && (
        <QuestionTemplateMenu
          anchorEl={anchorRef.current}
          onClose={() => onOpenChange(false)}
          onInsert={(json) => {
            onInsert(json);
            onOpenChange(false);
          }}
        />
      )}
    </div>
  );
}

function QuestionTemplateMenu({
  anchorEl,
  onClose,
  onInsert,
}: {
  anchorEl: HTMLElement;
  onClose: () => void;
  onInsert: (json: string) => void;
}) {
  const { tr } = usePrefs();
  const [templates, setTemplates] = useState<QuestionTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
        const res = await apiFetch<{ templates: QuestionTemplate[] }>({
          method: 'GET',
          path: '/api/quiz-question-templates',
        });
        if (cancelled) return;
        if (!res.ok || !res.data) {
          setError(res.error ?? tr('inspectorQuizTemplatesLoadError'));
          setLoading(false);
          return;
        }
        setTemplates(res.data.templates);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError(tr('inspectorQuizTemplatesLoadError'));
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

  const insertTemplate = (template: QuestionTemplate) => {
    const json = template.json.replace(/^\uFEFF/, '').trim();
    if (!json) {
      setError(tr('inspectorQuizTemplatesLoadError'));
      return;
    }
    onInsert(json);
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
        aria-label={tr('inspectorQuizTemplates')}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2">
          <FileQuestion className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-[var(--ink)]">
              {tr('inspectorQuizTemplates')}
            </div>
            <div className="truncate text-[10px] text-[var(--ink-muted)]">
              {tr('inspectorQuizTemplatesHint')}
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
        ) : error && !templates ? (
          <div className="px-4 py-6 text-[12px] text-rose-600">{error}</div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {error && (
              <div className="mb-2 rounded-md bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
                {error}
              </div>
            )}
            <div className="grid gap-0.5">
              {templates?.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => insertTemplate(template)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] text-[var(--ink)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{template.label}</span>
                  <span className="shrink-0 rounded-full border border-[var(--line)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                    {template.type.replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
            {!templates?.length && (
              <div className="px-2 py-6 text-center text-[12px] text-[var(--ink-muted)]">
                {tr('inspectorQuizTemplatesEmpty')}
              </div>
            )}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
