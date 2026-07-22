import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { apiFetch } from './api/client';
import type {
  CourseSummary,
  LabPayload,
  LessonPayload,
  LoadedCourse,
  ProgressState,
  QuizGradeResult,
  QuizPayload,
  SequenceItem,
} from '@shared/types';
import { AppShell } from './components/AppShell';
import { HomeView } from './components/HomeView';
import { LabView } from './components/LabView';
import { LessonView } from './components/LessonView';
import { QuizView } from './components/QuizView';
import { SettingsModal } from './components/SettingsModal';
import { SlideSidebar } from './components/SlideSidebar';
import { StatusBar } from './components/StatusBar';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { usePrefs } from './prefs/PrefsProvider';

type ViewMode = 'home' | 'present';

export default function App() {
  const { settings } = usePrefs();
  const [view, setView] = useState<ViewMode>('home');
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [course, setCourse] = useState<Omit<LoadedCourse, 'rootPath'> | null>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [lesson, setLesson] = useState<LessonPayload | null>(null);
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [lab, setLab] = useState<LabPayload | null>(null);
  const [quizResult, setQuizResult] = useState<QuizGradeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fullscreenStage, setFullscreenStage] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'appearance' | 'settings'>('appearance');
  const [error, setError] = useState<string | null>(null);

  const openSettings = (tab: 'profile' | 'appearance' | 'settings') => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  const current: SequenceItem | null = course?.sequence[index] ?? null;

  const loadCourses = useCallback(async () => {
    const res = await apiFetch<CourseSummary[]>({ method: 'GET', path: '/api/courses' });
    if (res.ok && res.data) setCourses(res.data);
    else setError(res.error ?? 'Could not load courses');
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const openCourse = async (id: string) => {
    setLoading(true);
    setError(null);
    const res = await apiFetch<Omit<LoadedCourse, 'rootPath'>>({
      method: 'GET',
      path: `/api/courses/${id}`,
    });
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Failed to open course');
      setLoading(false);
      return;
    }
    const prog = await apiFetch<ProgressState>({
      method: 'GET',
      path: `/api/courses/${id}/progress`,
    });
    setCourse(res.data);
    setProgress(prog.data ?? null);
    setIndex(settings.rememberLastCourse ? (prog.data?.currentIndex ?? 0) : 0);
    setView('present');
    setLoading(false);
  };

  const persistIndex = useCallback(
    async (nextIndex: number, completedKey?: string) => {
      if (!course) return;
      const completedKeys = new Set(progress?.completedKeys ?? []);
      if (completedKey) completedKeys.add(completedKey);
      const res = await apiFetch<ProgressState>({
        method: 'PUT',
        path: `/api/courses/${course.summary.id}/progress`,
        body: {
          currentIndex: nextIndex,
          completedKeys: [...completedKeys],
        },
      });
      if (res.ok && res.data) setProgress(res.data);
    },
    [course, progress?.completedKeys],
  );

  const goTo = useCallback(
    (next: number) => {
      if (!course) return;
      const clamped = Math.max(0, Math.min(course.sequence.length - 1, next));
      setIndex(clamped);
      setQuizResult(null);
      void persistIndex(clamped, current?.key);
    },
    [course, current?.key, persistIndex],
  );

  useEffect(() => {
    if (!course || !current) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLesson(null);
      setQuiz(null);
      setLab(null);

      if (current.type === 'lesson' && current.file) {
        const res = await apiFetch<LessonPayload>({
          method: 'GET',
          path: `/api/courses/${course.summary.id}/lesson`,
          params: { file: current.file },
        });
        if (!cancelled && res.ok && res.data) setLesson(res.data);
      } else if (current.type === 'quiz' && current.activityId) {
        const res = await apiFetch<QuizPayload>({
          method: 'GET',
          path: `/api/courses/${course.summary.id}/quizzes/${current.activityId}`,
        });
        if (!cancelled && res.ok && res.data) setQuiz(res.data);
      } else if (current.type === 'lab' && current.activityId) {
        const res = await apiFetch<LabPayload>({
          method: 'GET',
          path: `/api/courses/${course.summary.id}/labs/${current.activityId}`,
        });
        if (!cancelled && res.ok && res.data) setLab(res.data);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [course, current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== 'present' || !course) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === 'Escape' && fullscreenStage) {
        setFullscreenStage(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, course, index, goTo, fullscreenStage]);

  const onQuizGraded = (result: QuizGradeResult) => {
    setQuizResult(result);
    if (course && current?.activityId) {
      void apiFetch({
        method: 'GET',
        path: `/api/courses/${course.summary.id}/progress`,
      }).then((res) => {
        if (res.ok && res.data) setProgress(res.data as ProgressState);
      });
    }
    if (result.passed && settings.autoAdvanceAfterQuiz) {
      setTimeout(() => goTo(index + 1), 1200);
    }
  };

  const onLabCheck = async (stepIds: string[]) => {
    if (!course || !current?.activityId) return;
    const res = await apiFetch<ProgressState>({
      method: 'PUT',
      path: `/api/courses/${course.summary.id}/progress`,
      body: {
        labChecked: {
          ...(progress?.labChecked ?? {}),
          [current.activityId]: stepIds,
        },
      },
    });
    if (res.ok && res.data) setProgress(res.data);
  };

  const onLabPass = async () => {
    if (!course || !current?.activityId) return;
    const res = await apiFetch<ProgressState>({
      method: 'PUT',
      path: `/api/courses/${course.summary.id}/progress`,
      body: {
        labPassed: {
          ...(progress?.labPassed ?? {}),
          [current.activityId]: true,
        },
        completedKeys: [...new Set([...(progress?.completedKeys ?? []), current.key])],
      },
    });
    if (res.ok && res.data) setProgress(res.data);
  };

  if (view === 'home') {
    return (
      <AppShell>
        <TitleBar
          onHome={() => setView('home')}
          mode="library"
          onOpenSettings={() => openSettings('appearance')}
          onOpenProfile={() => openSettings('profile')}
        />
        <HomeView
          courses={courses}
          loading={loading}
          error={error}
          onOpen={openCourse}
          onRefresh={loadCourses}
        />
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          initialTab={settingsTab}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {!fullscreenStage && (
        <TitleBar
          courseTitle={course?.summary.title}
          onHome={() => {
            setView('home');
            setCourse(null);
          }}
          mode="course"
          onOpenSettings={() => openSettings('appearance')}
          onOpenProfile={() => openSettings('profile')}
        />
      )}
      {!fullscreenStage && (
        <Toolbar
          index={index}
          total={course?.sequence.length ?? 0}
          current={current}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onPrev={() => goTo(index - 1)}
          onNext={() => goTo(index + 1)}
          onGoTo={goTo}
          onPresent={() => setFullscreenStage(true)}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && !fullscreenStage && course && (
          <SlideSidebar
            sequence={course.sequence}
            index={index}
            progress={progress}
            onSelect={goTo}
            showSlideNumbers={settings.showSlideNumbers}
          />
        )}

        <main
          className={`relative flex min-w-0 flex-1 flex-col ${
            fullscreenStage ? 'bg-[#111318]' : 'bg-[var(--chrome)]'
          }`}
        >
          <div
            className={`flex min-h-0 flex-1 items-center justify-center ${
              fullscreenStage ? 'p-0' : 'p-5'
            }`}
          >
            <div
              className={`animate-stage relative overflow-hidden bg-[var(--stage)] ${
                fullscreenStage
                  ? 'h-full w-full rounded-none'
                  : 'h-full w-full max-w-[1200px] rounded-xl shadow-[var(--shadow)] ring-1 ring-black/5'
              }`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={current?.key ?? 'empty'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28 }}
                  className="h-full w-full"
                >
                  {loading && (
                    <div className="flex h-full items-center justify-center text-[var(--ink-muted)]">
                      Loading…
                    </div>
                  )}
                  {!loading && current?.type === 'lesson' && lesson && course && (
                    <LessonView
                      html={lesson.html}
                      title={lesson.title || current.title}
                      courseFolder={course.summary.folder}
                      theme={course.theme}
                    />
                  )}
                  {!loading && current?.type === 'quiz' && quiz && course && (
                    <QuizView
                      courseId={course.summary.id}
                      quizId={current.activityId!}
                      payload={quiz}
                      priorResult={quizResult}
                      priorScore={progress?.quizScores?.[current.activityId!]}
                      onGraded={onQuizGraded}
                      onContinue={() => goTo(index + 1)}
                    />
                  )}
                  {!loading && current?.type === 'lab' && lab && (
                    <LabView
                      payload={lab}
                      checked={progress?.labChecked?.[current.activityId!] ?? []}
                      passed={progress?.labPassed?.[current.activityId!]}
                      onCheck={onLabCheck}
                      onPass={() => void onLabPass()}
                      onContinue={() => goTo(index + 1)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {fullscreenStage && (
                <button
                  type="button"
                  onClick={() => setFullscreenStage(false)}
                  className="absolute right-4 top-4 rounded-md bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur hover:bg-black/70"
                >
                  Exit (Esc)
                </button>
              )}
            </div>
          </div>

          {!fullscreenStage && course && current && (
            <StatusBar
              moduleTitle={current.moduleTitle}
              unitTitle={current.unitTitle}
              type={current.type}
              index={index}
              total={course.sequence.length}
            />
          )}
        </main>
      </div>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsTab}
      />
    </AppShell>
  );
}
