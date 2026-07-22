import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ArrowLeftRight,
  BookOpen,
  FlaskConical,
  HelpCircle,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { CourseSummary } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';
import { ImportExportModal } from './ImportExportModal';
import type { StringKey } from '../i18n/strings';

type LayoutMode = 'cards' | 'list';

const THEMES: Array<{ id: string; titleKey: StringKey; gradient: string }> = [
  { id: 'blank', titleKey: 'blankTheme', gradient: 'linear-gradient(145deg, #f7f8fa, #e4e7ec)' },
  { id: 'workshop', titleKey: 'workshopTheme', gradient: 'linear-gradient(145deg, #0e6e6a, #1c1f26)' },
  { id: 'keynote', titleKey: 'keynoteTheme', gradient: 'linear-gradient(145deg, #1a1d24, #2f5aa8)' },
  { id: 'brief', titleKey: 'briefTheme', gradient: 'linear-gradient(145deg, #c45c26, #3a2418)' },
];

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
  const [layout, setLayout] = useState<LayoutMode>('cards');
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="relative min-h-0 flex-1 overflow-auto">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 10% -10%, ${appearance.accentColor}2e, transparent 55%), radial-gradient(ellipse 60% 40% at 90% 0%, rgba(196,92,38,0.12), transparent 50%), linear-gradient(180deg, var(--home-grad-top) 0%, var(--home-grad-bottom) 100%)`,
        }}
      />

      <div className="relative mx-auto max-w-6xl px-8 pb-16 pt-12">
        {/* Hero: brand column + templates column */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-start"
        >
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--stage)]/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              {tr('courseLibrary')}
            </div>
            <h1
              className="max-w-xl text-4xl font-semibold tracking-tight text-[var(--ink)] md:text-5xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {tr('appName')}
            </h1>
            <p className="mt-2 text-[15px] font-medium text-[var(--accent)]">{tr('appSubtitle')}</p>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
              {tr('homeBlurb')}
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--stage)]/90 p-4 shadow-[0_10px_28px_rgba(28,31,38,0.06)] backdrop-blur">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              {tr('newFromTemplate')}
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className="group cursor-pointer text-left"
                  title={tr(theme.titleKey)}
                >
                  <div
                    className="aspect-[4/3] rounded-lg border border-[var(--line)] shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md"
                    style={{ background: theme.gradient }}
                  />
                  <div className="mt-1.5 truncate text-[11px] font-medium text-[var(--ink)]">
                    {tr(theme.titleKey)}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline"
              >
                {tr('moreThemes')}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Available courses toolbar with full-width rule */}
        <div className="mb-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              {tr('availableCourses')}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[var(--accent)] px-2.5 py-1 text-[12px] font-semibold text-white shadow-sm hover:brightness-110"
              >
                <Plus className="h-3.5 w-3.5" />
                {tr('newCourse')}
              </button>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1 text-[12px] font-medium shadow-sm hover:bg-[var(--panel)]"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                {tr('importExport')}
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1 text-[12px] font-medium shadow-sm hover:bg-[var(--panel)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {tr('refresh')}
              </button>
              <button
                type="button"
                onClick={() => setLayout((m) => (m === 'cards' ? 'list' : 'cards'))}
                title={layout === 'cards' ? tr('layoutList') : tr('layoutCards')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1 text-[12px] font-medium shadow-sm hover:bg-[var(--panel)]"
              >
                {layout === 'cards' ? (
                  <List className="h-3.5 w-3.5" />
                ) : (
                  <LayoutGrid className="h-3.5 w-3.5" />
                )}
                {layout === 'cards' ? tr('layoutList') : tr('layoutCards')}
              </button>
            </div>
          </div>
          {layout === 'cards' && <div className="mt-2 h-px w-full bg-[var(--line)]" />}
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

        {layout === 'cards' ? (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((c, i) => (
              <CourseCard
                key={c.id}
                course={c}
                index={i}
                accent={appearance.accentColor}
                onOpen={onOpen}
                tr={tr}
              />
            ))}
            {!courses.length && !error && (
              <div className="col-span-full rounded-2xl border border-dashed border-[var(--line)] bg-[var(--stage)]/60 px-6 py-16 text-center text-[var(--ink-muted)]">
                {loading ? tr('loadingCourses') : tr('noCourses')}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_7rem_9rem] gap-3 px-1 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              <span>{tr('colName')}</span>
              <span className="hidden sm:block">{tr('colDescription')}</span>
              <span>{tr('colVersion')}</span>
              <span className="text-right">{tr('colModified')}</span>
            </div>
            <div className="h-px w-full bg-[var(--line)]/70" />
            {courses.map((c, i) => (
              <motion.button
                key={c.id}
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.04 * i }}
                onClick={() => onOpen(c.id)}
                className="grid w-full cursor-pointer grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_7rem_9rem] items-center gap-3 border-b border-[var(--line)]/50 px-1 py-3 text-left last:border-b-0 hover:bg-black/[0.03]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: c.coverAccent ?? appearance.accentColor }}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-[var(--ink)]">
                      {c.title}
                    </div>
                    {c.subtitle && (
                      <div className="truncate text-[11px] text-[var(--ink-muted)]">{c.subtitle}</div>
                    )}
                  </div>
                </div>
                <div className="hidden truncate text-[12px] text-[var(--ink-muted)] sm:block">
                  {c.description}
                </div>
                <span className="tabular-nums text-[12px] text-[var(--ink)]">v{c.version}</span>
                <span className="text-right text-[12px] tabular-nums text-[var(--ink-muted)]">
                  {formatModified(c.modifiedAt)}
                </span>
              </motion.button>
            ))}
            {!courses.length && !error && (
              <div className="px-1 py-12 text-center text-[var(--ink-muted)]">
                {loading ? tr('loadingCourses') : tr('noCourses')}
              </div>
            )}
          </div>
        )}
      </div>

      <ImportExportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        courses={courses}
      />

      <footer className="relative px-8 pb-6 text-center text-[11px] text-[var(--ink-muted)]">
        {tr('createdBy')}
      </footer>
    </div>
  );
}

function formatModified(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function CourseCard({
  course: c,
  index: i,
  accent,
  onOpen,
  tr,
}: {
  course: CourseSummary;
  index: number;
  accent: string;
  onOpen: (id: string) => void;
  tr: (key: StringKey) => string;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * i, duration: 0.35 }}
      onClick={() => onOpen(c.id)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--stage)] text-left shadow-[0_10px_30px_rgba(28,31,38,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(28,31,38,0.12)]"
    >
      <div
        className="h-28 px-5 pb-4 pt-5"
        style={{
          background: `linear-gradient(135deg, ${c.coverAccent ?? accent} 0%, #1c1f26 100%)`,
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
  );
}
