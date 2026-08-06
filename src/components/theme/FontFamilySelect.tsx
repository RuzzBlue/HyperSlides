import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import {
  allGoogleFontUrls,
  fontsForRole,
  type ThemeFontFamily,
  type UploadedFontOption,
} from '@shared/themeFonts';

const LOADED_HREF = new Set<string>();

function ensureGoogleFontsLoaded(urls: string[]) {
  for (const href of urls) {
    if (!href || LOADED_HREF.has(href)) continue;
    LOADED_HREF.add(href);
    const id = `hc-font-preview-${href.length}-${href.slice(-40).replace(/[^a-z0-9]/gi, '')}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

type Option = {
  id: string;
  label: string;
  stack: string;
  google?: string;
  uploaded?: boolean;
};

function toOptions(
  role: 'display' | 'body',
  uploaded: UploadedFontOption[],
): Option[] {
  return fontsForRole(role, uploaded).map((f) => {
    if ('displayRank' in f) {
      const fam = f as ThemeFontFamily;
      return { id: fam.id, label: fam.label, stack: fam.stack, google: fam.google };
    }
    return {
      id: f.id,
      label: f.label,
      stack: f.stack,
      google: '',
      uploaded: true,
    };
  });
}

function FontPreviewRow({
  label,
  stack,
  sample,
}: {
  label: string;
  stack: string;
  sample?: string;
}) {
  return (
    <div className="min-w-0 text-left">
      <div
        className="truncate text-[13px] font-semibold leading-tight text-[var(--ink)]"
        style={{ fontFamily: stack }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 truncate text-[11px] leading-snug text-[var(--ink-muted)]"
        style={{ fontFamily: stack }}
      >
        {sample ?? 'The quick brown fox jumps — 123'}
      </div>
    </div>
  );
}

type MenuCoords = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
};

type Props = {
  role: 'display' | 'body';
  value: string;
  onChange: (id: string) => void;
  uploaded: UploadedFontOption[];
  className?: string;
};

export function FontFamilySelect({ role, value, onChange, uploaded, className }: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  const options = useMemo(() => toOptions(role, uploaded), [role, uploaded]);

  useEffect(() => {
    ensureGoogleFontsLoaded(allGoogleFontUrls());
  }, []);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setCoords(null);
      return;
    }
    const place = () => {
      const r = rootRef.current!.getBoundingClientRect();
      const maxHeight = Math.min(280, window.innerHeight - 24);
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      if (openUp) {
        setCoords({
          left: r.left,
          width: r.width,
          bottom: window.innerHeight - r.top + 4,
          maxHeight: Math.min(maxHeight, spaceAbove),
        });
      } else {
        setCoords({
          left: r.left,
          width: r.width,
          top: r.bottom + 4,
          maxHeight: Math.min(maxHeight, Math.max(140, spaceBelow)),
        });
      }
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.id === value) ?? options[0];

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const menu =
    open && coords
      ? createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            className="overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--stage)] py-1 shadow-[0_16px_40px_rgba(28,31,38,0.18)]"
            style={{
              position: 'fixed',
              zIndex: 80,
              left: coords.left,
              width: coords.width,
              top: coords.top,
              bottom: coords.bottom,
              maxHeight: coords.maxHeight,
            }}
          >
            {options.map((opt, i) => {
              const active = opt.id === value;
              const prev = options[i - 1];
              const showSep = Boolean(opt.uploaded) && (!prev || !prev.uploaded);
              const showCatalogSep =
                !opt.uploaded && Boolean(prev?.uploaded) && i > 0;
              return (
                <div key={opt.id}>
                  {showSep || showCatalogSep ? (
                    <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                      {opt.uploaded ? 'Uploaded' : 'Google / system'}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`flex w-full cursor-pointer items-start gap-2 px-2.5 py-2 text-left hover:bg-[var(--accent-soft)] ${
                      active ? 'bg-[var(--accent-soft)]' : ''
                    }`}
                    onClick={() => pick(opt.id)}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {active ? <Check className="h-3.5 w-3.5 text-[var(--accent)]" /> : null}
                    </span>
                    <FontPreviewRow label={opt.label} stack={opt.stack} />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-left outline-none hover:border-[var(--accent)] focus:border-[var(--accent)]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          {selected ? (
            <FontPreviewRow label={selected.label} stack={selected.stack} />
          ) : (
            <span className="text-[12px] text-[var(--ink-muted)]">Select a font</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--ink-muted)] transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  );
}
