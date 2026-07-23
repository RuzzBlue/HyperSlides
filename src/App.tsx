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
import { PresenterChrome } from './components/PresenterChrome';
import { QuizView } from './components/QuizView';
import { SettingsModal } from './components/SettingsModal';
import {
  clampNavigatorSidebarWidth,
  NAVIGATOR_SIDEBAR_DEFAULT_WIDTH,
  SlideSidebar,
} from './components/SlideSidebar';
import {
  Inspector,
  type InspectorMode,
  type InspectorTool,
} from './components/inspector/Inspector';
import { StatusBar } from './components/StatusBar';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { StageZoomFrame } from './components/ZoomControl';
import { usePrefs } from './prefs/PrefsProvider';
import type { ContentZoomPreset } from '@shared/types';

type ViewMode = 'home' | 'present';
type SettingsTab = 'profile' | 'appearance' | 'settings' | 'presenter';

export default function App() {
  const { settings, tr, applyCourseSettings, clearCourseSettings, save } = usePrefs();
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
  const [sidebarWidth, setSidebarWidth] = useState(NAVIGATOR_SIDEBAR_DEFAULT_WIDTH);
  const [inspectorTool, setInspectorTool] = useState<InspectorTool | null>(null);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>('docked');
  const [lastInspectorTool, setLastInspectorTool] = useState<InspectorTool>('notes');
  const [floatResetToken, setFloatResetToken] = useState(0);
  const [zoomBeforeInspector, setZoomBeforeInspector] = useState<ContentZoomPreset | null>(null);
  const [fullscreenStage, setFullscreenStage] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('appearance');
  const [error, setError] = useState<string | null>(null);
  const [contentZoom, setContentZoomState] = useState<ContentZoomPreset>(
    settings.contentZoom ?? '100',
  );

  const presenterMenu = settings.presenterMenu ?? 'fixed-footer';

  useEffect(() => {
    if (settings.contentZoom) setContentZoomState(settings.contentZoom);
  }, [settings.contentZoom]);

  useEffect(() => {
    setSidebarWidth(clampNavigatorSidebarWidth(settings.navigatorSidebarWidth ?? NAVIGATOR_SIDEBAR_DEFAULT_WIDTH));
  }, [settings.navigatorSidebarWidth]);

  const setContentZoom = useCallback(
    (zoom: ContentZoomPreset) => {
      setContentZoomState(zoom);
      void save({ settings: { contentZoom: zoom } });
    },
    [save],
  );

  const commitSidebarWidth = useCallback(
    (width: number) => {
      const next = clampNavigatorSidebarWidth(width);
      setSidebarWidth(next);
      void save({ settings: { navigatorSidebarWidth: next } });
    },
    [save],
  );

  const resetSidebarWidth = useCallback(() => {
    setSidebarWidth(NAVIGATOR_SIDEBAR_DEFAULT_WIDTH);
    setSidebarOpen(true);
    void save({ settings: { navigatorSidebarWidth: NAVIGATOR_SIDEBAR_DEFAULT_WIDTH } });
  }, [save]);

  const exitPresent = useCallback(() => {
    setFullscreenStage(false);
    setSidebarOpen(true);
  }, []);

  const openSettings = (tab: SettingsTab) => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  const handleProgressReset = useCallback(async () => {
    setQuizResult(null);
    setIndex(0);
    if (!course) {
      setProgress(null);
      return;
    }
    const prog = await apiFetch<ProgressState>({
      method: 'GET',
      path: `/api/courses/${course.summary.id}/progress`,
    });
    setProgress(prog.data ?? null);
  }, [course]);

  const current: SequenceItem | null = course?.sequence[index] ?? null;

  const loadCourses = useCallback(async () => {
    const res = await apiFetch<CourseSummary[]>({ method: 'GET', path: '/api/courses' });
    if (res.ok && res.data) setCourses(res.data);
    else setError(res.error ?? 'Could not load courses');
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  /** Apply course theme accent / quiz / lab colors while a course is open. */
  useEffect(() => {
    const root = document.documentElement;
    const theme = course?.theme;
    if (!theme) return;
    const prev = {
      accent: root.style.getPropertyValue('--accent'),
      quiz: root.style.getPropertyValue('--quiz'),
      lab: root.style.getPropertyValue('--lab'),
    };
    if (theme.accent) root.style.setProperty('--accent', theme.accent);
    if (theme.quiz) root.style.setProperty('--quiz', theme.quiz);
    if (theme.lab) root.style.setProperty('--lab', theme.lab);
    return () => {
      if (prev.accent) root.style.setProperty('--accent', prev.accent);
      else root.style.removeProperty('--accent');
      if (prev.quiz) root.style.setProperty('--quiz', prev.quiz);
      else root.style.removeProperty('--quiz');
      if (prev.lab) root.style.setProperty('--lab', prev.lab);
      else root.style.removeProperty('--lab');
    };
  }, [course?.theme]);

  useEffect(() => {
    if (view !== 'present' || !course) return;
    if (settings.useCourseSettings) applyCourseSettings(course.packageManifest);
    else clearCourseSettings();
  }, [
    settings.useCourseSettings,
    view,
    course?.summary.id,
    course?.packageManifest,
    applyCourseSettings,
    clearCourseSettings,
  ]);

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
    applyCourseSettings(res.data.packageManifest);
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

  const closeInspector = useCallback(() => {
    setInspectorTool(null);
    setZoomBeforeInspector((prev) => {
      if (prev) setContentZoom(prev);
      return null;
    });
  }, [setContentZoom]);

  const handleInspectorTool = useCallback(
    (tool: InspectorTool | null) => {
      if (!tool) {
        closeInspector();
        return;
      }
      setLastInspectorTool(tool);
      setInspectorTool(tool);
      // Docked insert tools push the stage; notes can stay at current zoom unless docked insert tools need space.
      if (inspectorMode === 'docked' && tool !== 'notes') {
        setZoomBeforeInspector((prev) => {
          if (prev) return prev;
          if (contentZoom !== 'full-width') {
            setContentZoom('full-width');
            return contentZoom;
          }
          return null;
        });
      }
    },
    [closeInspector, contentZoom, inspectorMode, setContentZoom],
  );

  const handleInspectorMode = useCallback(
    (mode: InspectorMode) => {
      setInspectorMode(mode);
      if (mode === 'docked' && inspectorTool && inspectorTool !== 'notes') {
        setZoomBeforeInspector((prev) => {
          if (prev) {
            setContentZoom('full-width');
            return prev;
          }
          if (contentZoom !== 'full-width') {
            setContentZoom('full-width');
            return contentZoom;
          }
          return null;
        });
      }
      if (mode === 'floating') {
        setZoomBeforeInspector((prev) => {
          if (prev) setContentZoom(prev);
          return prev;
        });
      }
    },
    [contentZoom, inspectorTool, setContentZoom],
  );

  const showInspector = useCallback(() => {
    const tool = inspectorTool ?? lastInspectorTool;
    setInspectorTool(tool);
    setLastInspectorTool(tool);
    if (inspectorMode === 'floating') {
      setFloatResetToken((n) => n + 1);
    } else {
      setInspectorMode('floating');
      setFloatResetToken((n) => n + 1);
    }
  }, [inspectorMode, inspectorTool, lastInspectorTool]);

  const toggleInspectorPin = useCallback(() => {
    handleInspectorMode(inspectorMode === 'floating' ? 'docked' : 'floating');
  }, [handleInspectorMode, inspectorMode]);

  const onNotesBound = useCallback(
    (slideKey: string, notesFile: string, sequence: SequenceItem[]) => {
      setCourse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sequence: sequence.length ? sequence : prev.sequence.map((s) =>
            s.key === slideKey ? { ...s, notesFile } : s,
          ),
        };
      });
    },
    [],
  );

  useEffect(() => {
    if (current && current.type !== 'lesson' && inspectorTool && inspectorTool !== 'notes') {
      closeInspector();
    }
  }, [current, inspectorTool, closeInspector]);

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
        exitPresent();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, course, index, goTo, fullscreenStage, exitPresent]);

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
          onProgressReset={() => void handleProgressReset()}
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
            clearCourseSettings();
            setView('home');
            setCourse(null);
          }}
          mode="course"
          onOpenSettings={() => openSettings('appearance')}
          onOpenProfile={() => openSettings('profile')}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onResetSidebar={resetSidebarWidth}
          inspectorOpen={Boolean(inspectorTool)}
          inspectorMode={inspectorMode}
          onInspectorClose={closeInspector}
          onInspectorShow={showInspector}
          onInspectorTogglePin={toggleInspectorPin}
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
          onPresent={() => {
            setSidebarOpen(false);
            setFullscreenStage(true);
            if (inspectorTool && inspectorTool !== 'notes') closeInspector();
          }}
          zoom={contentZoom}
          onZoomChange={setContentZoom}
          inspectorTool={inspectorTool}
          onInspectorTool={handleInspectorTool}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && course && (
          <SlideSidebar
            sequence={course.sequence}
            index={index}
            progress={progress}
            onSelect={goTo}
            showSlideNumbers={settings.showSlideNumbers}
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
            onWidthCommit={commitSidebarWidth}
          />
        )}

        <main
          className={`relative flex min-w-0 flex-1 flex-col ${
            fullscreenStage ? 'bg-[#111318]' : 'bg-[var(--chrome)]'
          }`}
        >
          {fullscreenStage && course && current && presenterMenu === 'fixed-header' && (
              <PresenterChrome
                mode={presenterMenu}
                index={index}
                total={course.sequence.length}
                current={current}
                sidebarOpen={sidebarOpen}
                zoom={contentZoom}
                onZoomChange={setContentZoom}
                onToggleSidebar={() => setSidebarOpen((v) => !v)}
                onPrev={() => goTo(index - 1)}
                onNext={() => goTo(index + 1)}
                onGoTo={goTo}
                notesOpen={inspectorTool === 'notes'}
                onToggleNotes={() => handleInspectorTool(inspectorTool === 'notes' ? null : 'notes')}
              />
            )}

          <div className="relative flex min-h-0 flex-1 p-0">
            <div className="animate-stage relative min-h-0 h-full w-full flex-1 overflow-hidden bg-[var(--stage)]">
              <StageZoomFrame zoom={contentZoom}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current?.key ?? 'empty'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
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
                    {!loading && current?.type === 'lab' && lab && course && (
                      <LabView
                        payload={lab}
                        courseFolder={course.summary.folder}
                        checked={progress?.labChecked?.[current.activityId!] ?? []}
                        passed={progress?.labPassed?.[current.activityId!]}
                        onCheck={onLabCheck}
                        onPass={() => void onLabPass()}
                        onContinue={() => goTo(index + 1)}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </StageZoomFrame>

              {fullscreenStage && current?.type === 'lesson' && (
                <div className="group/exit absolute right-0 top-0 z-40 h-20 w-36">
                  <button
                    type="button"
                    onClick={() => exitPresent()}
                    className="absolute right-4 top-4 rounded-md bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur opacity-0 transition-opacity hover:bg-black/70 group-hover/exit:opacity-100 focus-visible:opacity-100"
                  >
                    {tr('exitPresent')}
                  </button>
                </div>
              )}

              {fullscreenStage &&
                course &&
                current &&
                (presenterMenu === 'floating-footer' || presenterMenu === 'floating-header') && (
                  <PresenterChrome
                    mode={presenterMenu}
                    index={index}
                    total={course.sequence.length}
                    current={current}
                    sidebarOpen={sidebarOpen}
                    zoom={contentZoom}
                    onZoomChange={setContentZoom}
                    onToggleSidebar={() => setSidebarOpen((v) => !v)}
                    onPrev={() => goTo(index - 1)}
                    onNext={() => goTo(index + 1)}
                    onGoTo={goTo}
                    notesOpen={inspectorTool === 'notes'}
                    onToggleNotes={() => handleInspectorTool(inspectorTool === 'notes' ? null : 'notes')}
                  />
                )}
            </div>
          </div>

          {fullscreenStage &&
            course &&
            current &&
            presenterMenu === 'fixed-footer' && (
              <PresenterChrome
                mode={presenterMenu}
                index={index}
                total={course.sequence.length}
                current={current}
                sidebarOpen={sidebarOpen}
                zoom={contentZoom}
                onZoomChange={setContentZoom}
                onToggleSidebar={() => setSidebarOpen((v) => !v)}
                onPrev={() => goTo(index - 1)}
                onNext={() => goTo(index + 1)}
                onGoTo={goTo}
                notesOpen={inspectorTool === 'notes'}
                onToggleNotes={() => handleInspectorTool(inspectorTool === 'notes' ? null : 'notes')}
              />
            )}

          {!fullscreenStage && course && current && (
            <StatusBar
              moduleTitle={current.moduleTitle}
              unitTitle={current.unitTitle}
              type={current.type}
              index={index}
              total={course.sequence.length}
              zoom={contentZoom}
              onZoomChange={setContentZoom}
            />
          )}
        </main>

        {inspectorTool && inspectorMode === 'docked' && (
          <Inspector
            tool={inspectorTool}
            mode="docked"
            onModeChange={handleInspectorMode}
            onClose={closeInspector}
            notesContext={
              course && current
                ? {
                    courseId: course.summary.id,
                    slideKey: current.key,
                    notesFile: current.notesFile,
                  }
                : null
            }
            onNotesBound={onNotesBound}
          />
        )}
      </div>

      {inspectorTool && inspectorMode === 'floating' && (
        <Inspector
          tool={inspectorTool}
          mode="floating"
          onModeChange={handleInspectorMode}
          onClose={closeInspector}
          floatResetToken={floatResetToken}
          notesContext={
            course && current
              ? {
                  courseId: course.summary.id,
                  slideKey: current.key,
                  notesFile: current.notesFile,
                }
              : null
          }
          onNotesBound={onNotesBound}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsTab}
        onProgressReset={() => void handleProgressReset()}
      />
    </AppShell>
  );
}
