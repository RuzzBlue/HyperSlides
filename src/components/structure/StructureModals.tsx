import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { StructureTarget } from '@shared/types';
import { usePrefs } from '../../prefs/PrefsProvider';

export function StructureRenameModal({
  open,
  kindLabel,
  initialTitle,
  busy,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  kindLabel: string;
  initialTitle: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const { tr } = usePrefs();
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    if (open) setTitle(initialTitle);
  }, [open, initialTitle]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label={tr('cancel')}
            disabled={busy}
            onClick={() => !busy && onClose()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={tr('structureRenameTitle')}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="relative w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--stage)] p-5 shadow-[var(--shadow)]"
          >
            <h2 className="text-[15px] font-semibold text-[var(--ink)]">
              {tr('structureRenameTitle')}
            </h2>
            <p className="mt-1 text-[12px] text-[var(--ink-muted)]">{kindLabel}</p>
            <label className="mt-4 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                {tr('structureNameLabel')}
              </span>
              <input
                autoFocus
                value={title}
                disabled={busy}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && title.trim()) onSave(title.trim());
                }}
                className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            {error && <p className="mt-2 text-[12px] text-[var(--danger)]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="rounded-md border border-[var(--line)] px-3 py-1.5 text-[12px] font-medium text-[var(--ink)] hover:bg-[var(--panel)]"
              >
                {tr('cancel')}
              </button>
              <button
                type="button"
                disabled={busy || !title.trim()}
                onClick={() => onSave(title.trim())}
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                {busy ? '…' : tr('structureRenameSave')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function StructureDeleteModal({
  open,
  title,
  body,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { tr } = usePrefs();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label={tr('cancel')}
            disabled={busy}
            onClick={() => !busy && onClose()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="relative w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--stage)] p-5 shadow-[var(--shadow)]"
          >
            <h2 className="text-[15px] font-semibold text-[var(--ink)]">{title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">{body}</p>
            {error && <p className="mt-2 text-[12px] text-[var(--danger)]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="rounded-md border border-[var(--line)] px-3 py-1.5 text-[12px] font-medium text-[var(--ink)] hover:bg-[var(--panel)]"
              >
                {tr('cancel')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className="rounded-md bg-[var(--danger,#b42318)] px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                {busy ? '…' : tr('structureDeleteConfirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type StructureMenuNode = {
  target: StructureTarget;
  title: string;
  /** module | unit | lesson | quiz | lab */
  nodeKind: 'module' | 'unit' | 'lesson' | 'quiz' | 'lab';
  canDuplicate: boolean;
};

export function StructureContextMenu({
  menu,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  menu: { x: number; y: number; node: StructureMenuNode } | null;
  onClose: () => void;
  onEdit: (node: StructureMenuNode) => void;
  onDuplicate: (node: StructureMenuNode) => void;
  onDelete: (node: StructureMenuNode) => void;
}) {
  const { tr } = usePrefs();

  useEffect(() => {
    if (!menu) return;
    const onDoc = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu, onClose]);

  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!menu) return;
    const el = menuRef.current;
    if (!el) {
      setPos({ left: menu.x, top: menu.y });
      return;
    }
    const pad = 8;
    const rect = el.getBoundingClientRect();
    let top = menu.y;
    let left = menu.x;
    if (top + rect.height + pad > window.innerHeight) {
      top = Math.max(pad, menu.y - rect.height);
    }
    if (left + rect.width + pad > window.innerWidth) {
      left = Math.max(pad, window.innerWidth - rect.width - pad);
    }
    setPos({ left, top });
  }, [menu]);

  if (!menu) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[55] min-w-[10rem] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--stage)] py-1 text-[var(--ink)] shadow-lg"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="flex w-full cursor-pointer px-3 py-1.5 text-left text-[12px] hover:bg-[var(--panel)]"
        onClick={() => {
          onEdit(menu.node);
          onClose();
        }}
      >
        {tr('structureEdit')}
      </button>
      {menu.node.canDuplicate && (
        <button
          type="button"
          className="flex w-full cursor-pointer px-3 py-1.5 text-left text-[12px] hover:bg-[var(--panel)]"
          onClick={() => {
            onDuplicate(menu.node);
            onClose();
          }}
        >
          {tr('structureDuplicate')}
        </button>
      )}
      <button
        type="button"
        className="flex w-full cursor-pointer px-3 py-1.5 text-left text-[12px] text-[var(--danger,#b42318)] hover:bg-[var(--panel)]"
        onClick={() => {
          onDelete(menu.node);
          onClose();
        }}
      >
        {tr('structureDelete')}
      </button>
    </div>
  );
}
