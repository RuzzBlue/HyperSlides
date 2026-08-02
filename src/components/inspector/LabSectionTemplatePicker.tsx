import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Puzzle, X } from 'lucide-react';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';

type LabSectionTemplate = {
  id: string;
  title: string;
  html: string;
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

export function LabSectionTemplatePickerButton({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (html: string) => void;
}) {
  const { tr } = usePrefs();
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        type="button"
        title={tr('labEditSectionTemplates')}
        onClick={() => onOpenChange(!open)}
        className={`cursor-pointer rounded-md p-1.5 hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/10 ${
          open ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-muted)]'
        }`}
      >
        <Puzzle width={18} height={18} />
      </button>
      {open && anchorRef.current && (
        <LabSectionTemplatePickerMenu
          anchorEl={anchorRef.current}
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

function LabSectionTemplatePickerMenu({
  anchorEl,
  onClose,
  onInsert,
}: {
  anchorEl: HTMLElement;
  onClose: () => void;
  onInsert: (html: string) => void;
}) {
  const { tr } = usePrefs();
  const [templates, setTemplates] = useState<LabSectionTemplate[] | null>(null);
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
        const res = await apiFetch<{ templates: LabSectionTemplate[] }>({
          method: 'GET',
          path: '/api/lab-section-templates',
        });
        if (cancelled) return;
        if (!res.ok || !res.data) {
          setError(res.error ?? tr('labEditSectionTemplatesLoadError'));
          setLoading(false);
          return;
        }
        setTemplates(res.data.templates ?? []);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError(tr('labEditSectionTemplatesLoadError'));
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

  const apply = (raw: string) => {
    const html = raw.replace(/^\uFEFF/, '').trim();
    if (!html) {
      setError(tr('labEditSectionTemplatesLoadError'));
      return;
    }
    onInsert(html);
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
        aria-label={tr('labEditSectionTemplates')}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2">
          <Puzzle width={18} height={18} className="shrink-0 text-[var(--accent)]" />
          <div className="min-w-0 flex-1 text-[12px] font-semibold text-[var(--ink)]">
            {tr('labEditSectionTemplates')}
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
            {templates?.length ? (
              <div className="grid gap-0.5">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => apply(tpl.html)}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-[var(--ink)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{tpl.title}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-2 py-6 text-center text-[12px] text-[var(--ink-muted)]">
                {tr('labEditSectionTemplatesEmpty')}
              </div>
            )}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
