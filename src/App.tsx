import { useCallback, useEffect, useRef, useState } from 'react';
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
import { sidebarNumbersActive } from '@shared/sidebarNumbers';
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
  type SidebarTreeApi,
} from './components/SlideSidebar';
import {
  Inspector,
  isCourseLevelInspectorTool,
  type InspectorMode,
  type InspectorTool,
} from './components/inspector/Inspector';
import { StatusBar } from './components/StatusBar';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { CourseSettingsModal } from './components/CourseSettingsModal';
import type { InsertKind } from './components/AddContentButton';
import { StageZoomFrame } from './components/ZoomControl';
import { usePrefs } from './prefs/PrefsProvider';
import type { ContentZoomPreset } from '@shared/types';
import { APP_MIN_WIDTH_PX } from './layoutConstants';

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
  const [courseSettingsOpen, setCourseSettingsOpen] = useState(false);
  const sidebarTreeApiRef = useRef<SidebarTreeApi | null>(null);
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
    window.hyperclass?.setMinWidth?.(APP_MIN_WIDTH_PX);
  }, []);

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

  const openSettings = (tab?: SettingsTab) => {
    if (tab) setSettingsTab(tab);
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

  /** Apply course quiz / lab chrome colors while a course is open (accent comes from prefs session). */
  useEffect(() => {
    const root = document.documentElement;
    const theme = course?.theme;
    if (!theme) return;
    const prev = {
      quiz: root.style.getPropertyValue('--quiz'),
      lab: root.style.getPropertyValue('--lab'),
    };
    if (theme.quiz) root.style.setProperty('--quiz', theme.quiz);
    if (theme.lab) root.style.setProperty('--lab', theme.lab);
    return () => {
      if (prev.quiz) root.style.setProperty('--quiz', prev.quiz);
      else root.style.removeProperty('--quiz');
      if (prev.lab) root.style.setProperty('--lab', prev.lab);
      else root.style.removeProperty('--lab');
    };
  }, [course?.theme]);

  useEffect(() => {
    if (view !== 'present' || !course) return;
    if (settings.useCourseSettings) applyCourseSettings(course.packageManifest, course.theme);
    else clearCourseSettings();
  }, [
    settings.useCourseSettings,
    view,
    course?.summary.id,
    course?.packageManifest,
    course?.theme,
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
    applyCourseSettings(res.data.packageManifest, res.data.theme);
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

  const handleStructureChange = useCallback(
    (result: { course: Omit<LoadedCourse, 'rootPath'>; focusKey: string | null }) => {
      setCourse(result.course);
      setQuizResult(null);
      setError(null);
      if (result.focusKey) {
        const focusIndex = result.course.sequence.findIndex((s) => s.key === result.focusKey);
        if (focusIndex >= 0) {
          setIndex(focusIndex);
          void persistIndex(focusIndex);
          return;
        }
      }
      setIndex((prev) => Math.min(prev, Math.max(0, result.course.sequence.length - 1)));
    },
    [persistIndex],
  );

  const handleInsert = useCallback(
    async (kind: InsertKind) => {
      if (!course || !current) return;
      const res = await apiFetch<{
        course: Omit<LoadedCourse, 'rootPath'>;
        focusKey: string;
      }>({
        method: 'POST',
        path: `/api/courses/${course.summary.id}/items`,
        body: { kind, afterKey: current.key },
      });
      if (!res.ok || !res.data) {
        setError(res.error ?? 'Failed to add content');
        return;
      }
      setCourse(res.data.course);
      setQuizResult(null);
      const focusIndex = res.data.course.sequence.findIndex((s) => s.key === res.data!.focusKey);
      const nextIndex = focusIndex >= 0 ? focusIndex : Math.min(index + 1, res.data.course.sequence.length - 1);
      setIndex(nextIndex);
      void persistIndex(nextIndex);
    },
    [course, current, index, persistIndex],
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
      // Code opens floating by default (wider, resizable editor).
      if (tool === 'code') {
        setInspectorMode('floating');
        setFloatResetToken((n) => n + 1);
        setZoomBeforeInspector((prev) => {
          if (prev) setContentZoom(prev);
          return null;
        });
        return;
      }
      // Docked insert tools push the stage; course-level panels keep current zoom.
      if (inspectorMode === 'docked' && !isCourseLevelInspectorTool(tool)) {
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
      if (
        mode === 'docked' &&
        inspectorTool &&
        !isCourseLevelInspectorTool(inspectorTool) &&
        inspectorTool !== 'code'
      ) {
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

  const onNotesBound = useCallback((slideKey: string, notesFile: string) => {
    setCourse((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sequence: prev.sequence.map((s) =>
          s.key === slideKey ? { ...s, notesFile } : s,
        ),
      };
    });
  }, []);

  const onCodeSaved = useCallback(
    (slideKey: string) => {
      if (!course || !current || current.key !== slideKey || current.type !== 'lesson' || !current.file) {
        return;
      }
      void (async () => {
        const res = await apiFetch<LessonPayload>({
          method: 'GET',
          path: `/api/courses/${course.summary.id}/lesson`,
          params: { file: current.file! },
        });
        if (res.ok && res.data) setLesson(res.data);
      })();
    },
    [course, current],
  );

  const onQuizSaved = useCallback(
    (quizId: string) => {
      if (!course || !current || current.type !== 'quiz' || current.activityId !== quizId) return;
      void (async () => {
        const res = await apiFetch<QuizPayload>({
          method: 'GET',
          path: `/api/courses/${course.summary.id}/quizzes/${quizId}`,
        });
        if (res.ok && res.data) setQuiz(res.data);
        // Refresh course so sidebar title updates if renamed
        const courseRes = await apiFetch<Omit<LoadedCourse, 'rootPath'>>({
          method: 'GET',
          path: `/api/courses/${course.summary.id}`,
        });
        if (courseRes.ok && courseRes.data) {
          setCourse((prev) =>
            prev
              ? {
                  ...prev,
                  summary: courseRes.data!.summary,
                  sequence: courseRes.data!.sequence,
                  manifest: courseRes.data!.manifest,
                }
              : prev,
          );
        }
      })();
    },
    [course, current],
  );

  const onLabSaved = useCallback(
    (labId: string) => {
      if (!course || !current || current.type !== 'lab' || current.activityId !== labId) return;
      void (async () => {
        const res = await apiFetch<LabPayload>({
          method: 'GET',
          path: `/api/courses/${course.summary.id}/labs/${labId}`,
        });
        if (res.ok && res.data) setLab(res.data);
        const courseRes = await apiFetch<Omit<LoadedCourse, 'rootPath'>>({
          method: 'GET',
          path: `/api/courses/${course.summary.id}`,
        });
        if (courseRes.ok && courseRes.data) {
          setCourse((prev) =>
            prev
              ? {
                  ...prev,
                  summary: courseRes.data!.summary,
                  sequence: courseRes.data!.sequence,
                  manifest: courseRes.data!.manifest,
                }
              : prev,
          );
        }
      })();
    },
    [course, current],
  );

  useEffect(() => {
    if (!current || !inspectorTool || isCourseLevelInspectorTool(inspectorTool)) return;
    const codeOk =
      inspectorTool === 'code' &&
      (current.type === 'lesson' || current.type === 'quiz' || current.type === 'lab');
    const insertOk = inspectorTool !== 'code' && current.type === 'lesson';
    if (!codeOk && !insertOk) closeInspector();
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
      if ((e.target as HTMLElement)?.closest?.('.cm-editor')) {
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
          onOpenSettings={() => openSettings()}
          onOpenProfile={() => openSettings('profile')}
          sidebarView={settings.sidebarView ?? 'navigator'}
          onSidebarViewChange={(next) => {
            void save({ settings: { sidebarView: next } });
          }}
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
          onTabChange={setSettingsTab}
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
          courseAuthor={course?.summary.author}
          itemType={current?.type}
          itemTitle={current?.title}
          onHome={() => {
            clearCourseSettings();
            setView('home');
            setCourse(null);
          }}
          mode="course"
          onOpenSettings={() => openSettings()}
          onOpenProfile={() => openSettings('profile')}
          sidebarOpen={sidebarOpen}
          sidebarView={settings.sidebarView ?? 'navigator'}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onResetSidebar={resetSidebarWidth}
          onToggleExpandAllSidebar={() => sidebarTreeApiRef.current?.toggleExpandAll()}
          getSidebarFullyExpanded={() =>
            sidebarTreeApiRef.current?.isFullyExpanded() ?? false
          }
          onSidebarViewChange={(next) => {
            void save({ settings: { sidebarView: next } });
          }}
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
          onInsert={(kind) => void handleInsert(kind)}
          onOpenCourseSettings={() => setCourseSettingsOpen(true)}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && course && (
          <SlideSidebar
            sequence={course.sequence}
            index={index}
            progress={progress}
            onSelect={goTo}
            showSlideNumbers={sidebarNumbersActive(
              settings.showSlideNumbers,
              settings.slideNumberViews,
              settings.sidebarView ?? 'navigator',
            )}
            showStructureNumbers={sidebarNumbersActive(
              settings.showStructureNumbers,
              settings.structureNumberViews,
              settings.sidebarView ?? 'navigator',
            )}
            showHeaderCount={settings.showSidebarHeaderCount !== false}
            showHeaderViewToggle={Boolean(settings.showSidebarViewToggle)}
            onSidebarViewChange={(next) => {
              void save({ settings: { sidebarView: next } });
            }}
            mode={settings.sidebarView ?? 'navigator'}
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
            onWidthCommit={commitSidebarWidth}
            courseId={course.summary.id}
            onStructureChange={handleStructureChange}
            onStructureError={(msg) => setError(msg)}
            treeApiRef={sidebarTreeApiRef}
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
                        slideBg={current.bg}
                        slideIndex={index}
                        slideTotal={course.sequence.length}
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
            codeContext={
              course && current?.type === 'lesson'
                ? {
                    courseId: course.summary.id,
                    slideKey: current.key,
                    file: current.file,
                  }
                : null
            }
            onCodeSaved={onCodeSaved}
            quizEditContext={
              course && current?.type === 'quiz' && current.activityId
                ? { courseId: course.summary.id, quizId: current.activityId }
                : null
            }
            onQuizSaved={onQuizSaved}
            labEditContext={
              course && current?.type === 'lab' && current.activityId
                ? { courseId: course.summary.id, labId: current.activityId }
                : null
            }
            onLabSaved={onLabSaved}
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
          floatInsets={{
            top: 48 + 44, // TitleBar + Toolbar
            left: sidebarOpen ? sidebarWidth : 0,
            right: 0,
            bottom: fullscreenStage ? 0 : 32, // StatusBar
          }}
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
          codeContext={
            course && current?.type === 'lesson'
              ? {
                  courseId: course.summary.id,
                  slideKey: current.key,
                  file: current.file,
                }
              : null
          }
          onCodeSaved={onCodeSaved}
          quizEditContext={
            course && current?.type === 'quiz' && current.activityId
              ? { courseId: course.summary.id, quizId: current.activityId }
              : null
          }
          onQuizSaved={onQuizSaved}
          labEditContext={
            course && current?.type === 'lab' && current.activityId
              ? { courseId: course.summary.id, labId: current.activityId }
              : null
          }
          onLabSaved={onLabSaved}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsTab}
        onTabChange={setSettingsTab}
        onProgressReset={() => void handleProgressReset()}
      />

      <CourseSettingsModal
        mode="edit"
        open={courseSettingsOpen && Boolean(course)}
        onClose={() => setCourseSettingsOpen(false)}
        course={course}
        onSaved={(next) => {
          setCourse(next);
          applyCourseSettings(next.packageManifest, next.theme);
          setCourseSettingsOpen(false);
          void loadCourses();
        }}
      />
    </AppShell>
  );
}
