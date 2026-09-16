import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lock, X } from 'lucide-react';
import { apiFetch } from '../api/client';
import { usePrefs } from '../prefs/PrefsProvider';

type Mode = 'unlock' | 'reset';

/**
 * Modal to unlock a course access/author lock, or reset via creator user ID.
 */
export function CourseLockModal({
  open,
  courseId,
  kind,
  title,
  hint,
  allowReset = true,
  onClose,
  onUnlocked,
  onReset,
}: {
  open: boolean;
  courseId: string;
  kind: 'access' | 'author';
  title: string;
  hint?: string;
  allowReset?: boolean;
  onClose: () => void;
  onUnlocked: () => void;
  onReset?: () => void;
}) {
  const { tr } = usePrefs();
  const [mode, setMode] = useState<Mode>('unlock');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('unlock');
    setPassword('');
    setUserId('');
    setError(null);
    setBusy(false);
  }, [open, courseId, kind]);

  const submitUnlock = async () => {
    if (!password.trim()) {
      setError(tr('courseLockPasswordRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    const path =
      kind === 'access'
        ? `/api/courses/${courseId}/unlock-access`
        : `/api/courses/${courseId}/unlock-author`;
    const res = await apiFetch<{ unlocked: boolean }>({
      method: 'POST',
      path,
      body: { password },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || tr('courseLockIncorrectPassword'));
      return;
    }
    onUnlocked();
  };

  const submitReset = async () => {
    if (!userId.trim()) {
      setError(tr('courseLockUserIdRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await apiFetch<{ reset: boolean }>({
      method: 'POST',
      path: `/api/courses/${courseId}/reset-lock`,
      body: { kind, userId: userId.trim() },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || tr('courseLockResetFailed'));
      return;
    }
    onReset?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--stage)] shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-[var(--ink)]">{title}</div>
                {hint ? (
                  <div className="truncate text-[11px] text-[var(--ink-muted)]">
                    {tr('courseLockHintLabel')}: {hint}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-4 py-3">
              {mode === 'unlock' ? (
                <>
                  <p className="text-[12px] leading-relaxed text-[var(--ink-muted)]">
                    {kind === 'access'
                      ? tr('courseLockAccessPrompt')
                      : tr('courseLockAuthorPrompt')}
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                      {tr('newCoursePassword')}
                    </span>
                    <input
                      type="password"
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void submitUnlock();
                      }}
                      className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                      autoComplete="current-password"
                    />
                  </label>
                </>
              ) : (
                <>
                  <p className="text-[12px] leading-relaxed text-[var(--ink-muted)]">
                    {tr('courseLockResetPrompt')}
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                      {tr('courseLockCreatorUserId')}
                    </span>
                    <input
                      type="text"
                      autoFocus
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void submitReset();
                      }}
                      className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 font-mono text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                      autoComplete="off"
                    />
                  </label>
                </>
              )}

              {error && <p className="text-[11px] text-rose-600">{error}</p>}

              <div className="flex items-center gap-2 pt-1">
                {allowReset && mode === 'unlock' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError(null);
                    }}
                    className="cursor-pointer text-[11px] font-medium text-[var(--accent)] hover:underline"
                  >
                    {tr('courseLockForgotPassword')}
                  </button>
                )}
                {mode === 'reset' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('unlock');
                      setError(null);
                    }}
                    className="cursor-pointer text-[11px] font-medium text-[var(--ink-muted)] hover:underline"
                  >
                    {tr('courseLockBackToPassword')}
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onClose}
                    className="cursor-pointer rounded-md border border-[var(--line)] px-3 py-1.5 text-[12px] font-medium text-[var(--ink-muted)] hover:bg-[var(--panel)] disabled:opacity-50"
                  >
                    {tr('cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void (mode === 'unlock' ? submitUnlock() : submitReset())}
                    className="cursor-pointer rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 disabled:opacity-50"
                  >
                    {busy
                      ? tr('courseLockWorking')
                      : mode === 'unlock'
                        ? tr('courseLockUnlock')
                        : tr('courseLockReset')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
