import { motion } from 'motion/react';
import { ArrowRight, BookOpen, FlaskConical, HelpCircle, RefreshCw, Sparkles } from 'lucide-react';
import type { CourseSummary } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';

export function HomeView({
  courses,
  loading,
  error,
  onOpen,
  onRefresh,
}: {
  courses: CourseSummary[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onRefresh: () => void;
}) {
  const { tr, appearance } = usePrefs();

  return (
    <div className="relative min-h-0 flex-1 overflow-auto">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 10% -10%, ${appearance.accentColor}2e, transparent 55%), radial-gradient(ellipse 60% 40% at 90% 0%, rgba(196,92,38,0.12), transparent 50%), linear-gradient(180deg, var(--home-grad-top) 0%, var(--home-grad-bottom) 100%)`,
        }}
      />

      <div className="relative mx-auto max-w-5xl px-8 pb-16 pt-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--stage)]/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {tr('courseLibrary')}
          </div>
          <h1
            className="max-w-2xl text-4xl font-semibold tracking-tight text-[var(--ink)] md:text-5xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {tr('appName')}
          </h1>
          <p className="mt-2 text-[15px] font-medium text-[var(--accent)]">{tr('appSubtitle')}</p>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {tr('homeBlurb')}
          </p>
        </motion.div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
            {tr('availableCourses')}
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1 text-[12px] font-medium shadow-sm hover:bg-[var(--panel)]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {tr('refresh')}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
            <div className="mt-1 text-xs opacity-80">
              Tip: run <code className="rounded bg-white px-1">npm run serve</code> or{' '}
              <code className="rounded bg-white px-1">npm run dev:web</code> so the local API can
              read the courses folder.
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((c, i) => (
            <motion.button
              key={c.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.35 }}
              onClick={() => onOpen(c.id)}
              className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--stage)] text-left shadow-[0_10px_30px_rgba(28,31,38,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(28,31,38,0.12)]"
            >
              <div
                className="h-28 px-5 pb-4 pt-5"
                style={{
                  background: `linear-gradient(135deg, ${c.coverAccent ?? appearance.accentColor} 0%, #1c1f26 100%)`,
                }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  v{c.version}
                </div>
                <div
                  className="mt-1 text-2xl font-semibold text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {c.title}
                </div>
                {c.subtitle && <div className="text-sm text-white/75">{c.subtitle}</div>}
              </div>
              <div className="px-5 py-4">
                <p className="line-clamp-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">
                  {c.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-medium text-[var(--ink-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {c.lessonCount} {tr('lessons')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <HelpCircle className="h-3.5 w-3.5" />
                    {c.quizCount} {tr('quizzes')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FlaskConical className="h-3.5 w-3.5" />
                    {c.labCount} {tr('labs')}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 font-semibold text-[var(--accent)] opacity-0 transition group-hover:opacity-100">
                    {tr('open')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </motion.button>
          ))}

          {!courses.length && !error && (
            <div className="col-span-full rounded-2xl border border-dashed border-[var(--line)] bg-[var(--stage)]/60 px-6 py-16 text-center text-[var(--ink-muted)]">
              {loading ? tr('loadingCourses') : tr('noCourses')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
