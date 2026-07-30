import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpen, FlaskConical, FolderPlus, HelpCircle, Layers, Plus } from 'lucide-react';
import { usePrefs } from '../prefs/PrefsProvider';

export type InsertKind = 'module' | 'unit' | 'lesson' | 'quiz' | 'lab';

export function AddContentButton({
  disabled,
  onAdd,
}: {
  disabled?: boolean;
  onAdd: (kind: InsertKind) => void;
}) {
  const { tr } = usePrefs();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0">
      <div
        className={`inline-flex overflow-hidden rounded-md border border-[var(--line)] bg-[var(--stage)] shadow-sm ${
          disabled ? 'opacity-40' : ''
        }`}
      >
        <button
          type="button"
          disabled={disabled}
          title={tr('addSlide')}
          onClick={() => {
            setOpen(false);
            onAdd('lesson');
          }}
          className="inline-flex cursor-pointer items-center justify-center px-2 py-1 text-[var(--ink)] enabled:hover:bg-[var(--panel)] disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          disabled={disabled}
          title={tr('addContentMenu')}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative w-3.5 cursor-pointer self-stretch bg-[var(--accent)] enabled:hover:brightness-110 disabled:cursor-not-allowed"
        >
          <span
            className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 border-b-[8px] border-l-[8px] border-b-white/90 border-l-transparent"
            aria-hidden
          />
        </button>
      </div>

      {open && !disabled && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--stage)] py-1 text-[var(--ink)] shadow-lg"
        >
          <MenuItem
            icon={<FolderPlus className="h-3.5 w-3.5" />}
            label={tr('addModule')}
            onClick={() => {
              setOpen(false);
              onAdd('module');
            }}
          />
          <MenuItem
            icon={<Layers className="h-3.5 w-3.5" />}
            label={tr('addUnit')}
            onClick={() => {
              setOpen(false);
              onAdd('unit');
            }}
          />
          <div className="my-1 h-px bg-[var(--line)]" />
          <MenuItem
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label={tr('addSlide')}
            onClick={() => {
              setOpen(false);
              onAdd('lesson');
            }}
          />
          <MenuItem
            icon={<HelpCircle className="h-3.5 w-3.5" />}
            label={tr('addQuiz')}
            onClick={() => {
              setOpen(false);
              onAdd('quiz');
            }}
          />
          <MenuItem
            icon={<FlaskConical className="h-3.5 w-3.5" />}
            label={tr('addLab')}
            onClick={() => {
              setOpen(false);
              onAdd('lab');
            }}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--panel)]"
    >
      <span className="text-[var(--ink-muted)]">{icon}</span>
      {label}
    </button>
  );
}
