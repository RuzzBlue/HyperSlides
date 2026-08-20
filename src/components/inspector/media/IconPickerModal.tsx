import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { usePrefs } from '../../../prefs/PrefsProvider';
import {
  type IconCatalogEntry,
  type IconLibraryId,
  filterIcons,
  getLucideIconComponent,
  iconsForLibrary,
} from './iconLibraries';

const LIBS: { id: IconLibraryId; labelKey: 'mediaIconLibLucide' | 'mediaIconLibFa' | 'mediaIconLibBootstrap' | 'mediaIconLibEmoji' }[] = [
  { id: 'lucide', labelKey: 'mediaIconLibLucide' },
  { id: 'fa', labelKey: 'mediaIconLibFa' },
  { id: 'bootstrap', labelKey: 'mediaIconLibBootstrap' },
  { id: 'emoji', labelKey: 'mediaIconLibEmoji' },
];

function IconPreview({ entry, lib }: { entry: IconCatalogEntry; lib: IconLibraryId }) {
  if (lib === 'emoji') {
    const emoji = entry.value.startsWith('emoji:') ? entry.value.slice(6) : entry.value;
    return <span className="text-[22px] leading-none">{emoji}</span>;
  }
  if (lib === 'fa') {
    return <i className={`${entry.value} text-[18px]`} aria-hidden />;
  }
  if (lib === 'bootstrap') {
    const name = entry.value.replace(/^bi:/, '');
    return <i className={`bi bi-${name} text-[18px]`} aria-hidden />;
  }
  const Icon = getLucideIconComponent(entry.value);
  if (!Icon) return <span className="text-[10px] text-[var(--ink-muted)]">?</span>;
  return <Icon className="h-5 w-5" strokeWidth={2} />;
}

/** Elementor-style icon library modal with tabs + search. */
export function IconPickerModal({
  open,
  library,
  onLibraryChange,
  onPick,
  onClose,
}: {
  open: boolean;
  library: IconLibraryId;
  onLibraryChange: (lib: IconLibraryId) => void;
  onPick: (entry: IconCatalogEntry, lib: IconLibraryId) => void;
  onClose: () => void;
}) {
  const { tr } = usePrefs();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const entries = useMemo(() => {
    const all = iconsForLibrary(library);
    return filterIcons(all, query).slice(0, library === 'lucide' && !query.trim() ? 240 : 600);
  }, [library, query]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={tr('mediaIconPickerTitle')}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(86vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--stage)] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <div>
            <div className="text-[13px] font-semibold text-[var(--ink)]">{tr('mediaIconPickerTitle')}</div>
            <div className="text-[10px] text-[var(--ink-muted)]">{tr('mediaIconPickerHint')}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
            aria-label={tr('mediaIconPickerClose')}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex gap-1 border-b border-[var(--line)] px-3 pt-2">
          {LIBS.map((lib) => {
            const active = library === lib.id;
            return (
              <button
                key={lib.id}
                type="button"
                onClick={() => onLibraryChange(lib.id)}
                className={`cursor-pointer rounded-t-md px-3 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {tr(lib.labelKey)}
              </button>
            );
          })}
        </div>

        <div className="border-b border-[var(--line)] px-3 py-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr('mediaIconSearch')}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] py-2 pl-8 pr-3 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {entries.length === 0 ? (
            <p className="px-2 py-8 text-center text-[12px] text-[var(--ink-muted)]">
              {tr('mediaIconEmpty')}
            </p>
          ) : (
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  title={entry.label}
                  onClick={() => onPick(entry, library)}
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-transparent bg-[var(--panel)]/60 text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/50"
                >
                  <IconPreview entry={entry} lib={library} />
                  {library !== 'emoji' && (
                    <span className="max-w-full truncate px-0.5 text-[8px] text-[var(--ink-muted)]">
                      {entry.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {library === 'lucide' && !query.trim() && (
            <p className="mt-3 text-center text-[10px] text-[var(--ink-muted)]">
              {tr('mediaIconLucideMore')}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
