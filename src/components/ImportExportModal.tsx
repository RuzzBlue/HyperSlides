import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownToLine, ArrowUpFromLine, X } from 'lucide-react';
import type { CourseSummary } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';

type Tab = 'import' | 'export';

export function ImportExportModal({
  open,
  onClose,
  courses,
}: {
  open: boolean;
  onClose: () => void;
  courses: CourseSummary[];
}) {
  const { tr } = usePrefs();
  const [tab, setTab] = useState<Tab>('import');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-black/40 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--stage)] shadow-[var(--shadow)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
              <h2 className="text-[15px] font-semibold text-[var(--ink)]">{tr('importExport')}</h2>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-1 border-b border-[var(--line)] px-4 pt-3">
              {(
                [
                  ['import', tr('importTab'), <ArrowDownToLine className="h-3.5 w-3.5" />],
                  ['export', tr('exportTab'), <ArrowUpFromLine className="h-3.5 w-3.5" />],
                ] as const
              ).map(([id, label, icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-t-lg px-3 py-2 text-[12px] font-semibold ${
                    tab === id
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <div className="px-5 py-5">
              {tab === 'import' ? (
                <div className="space-y-4">
                  <div className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] bg-[var(--panel)] px-4 text-center transition hover:border-[var(--accent)]/50">
                    <ArrowDownToLine className="mb-2 h-7 w-7 text-[var(--accent)]" />
                    <p className="text-[13px] text-[var(--ink-muted)]">{tr('importHint')}</p>
                    <span className="mt-3 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white">
                      {tr('browseFiles')}
                    </span>
                    <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                      {tr('comingSoon')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[13px] text-[var(--ink-muted)]">{tr('exportHint')}</p>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {courses.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-left text-[13px] hover:border-[var(--accent)]/40"
                      >
                        <span className="font-medium text-[var(--ink)]">{c.title}</span>
                        <span className="text-[11px] text-[var(--ink-muted)]">v{c.version}</span>
                      </button>
                    ))}
                    {!courses.length && (
                      <div className="rounded-lg border border-dashed border-[var(--line)] px-3 py-8 text-center text-[12px] text-[var(--ink-muted)]">
                        {tr('noCourses')}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-lg bg-[var(--accent)]/50 px-3 py-2 text-[12px] font-semibold text-white"
                  >
                    {tr('selectCourse')} · {tr('comingSoon')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
