import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Home, Hexagon, Settings, UserRound } from 'lucide-react';
import type { SidebarViewMode } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';

export function TitleBar({
  courseTitle,
  itemType,
  itemTitle,
  onHome,
  mode = 'library',
  onOpenSettings,
  onOpenProfile,
  sidebarOpen,
  sidebarView = 'navigator',
  onToggleSidebar,
  onResetSidebar,
  onToggleExpandAllSidebar,
  getSidebarFullyExpanded,
  onSidebarViewChange,
  inspectorOpen,
  inspectorMode,
  onInspectorClose,
  onInspectorShow,
  onInspectorTogglePin,
}: {
  courseTitle?: string;
  /** Current slide kind for the title-bar center (course mode). */
  itemType?: 'lesson' | 'quiz' | 'lab';
  itemTitle?: string;
  onHome: () => void;
  /** library = brand lockup; course = home + course title */
  mode?: 'library' | 'course';
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  sidebarOpen?: boolean;
  sidebarView?: SidebarViewMode;
  onToggleSidebar?: () => void;
  onResetSidebar?: () => void;
  onToggleExpandAllSidebar?: () => void;
  getSidebarFullyExpanded?: () => boolean;
  onSidebarViewChange?: (view: SidebarViewMode) => void;
  inspectorOpen?: boolean;
  inspectorMode?: 'docked' | 'floating';
  onInspectorClose?: () => void;
  onInspectorShow?: () => void;
  onInspectorTogglePin?: () => void;
}) {
  const { tr } = usePrefs();
  const [viewOpen, setViewOpen] = useState(false);
  const [sidebarViewMenuOpen, setSidebarViewMenuOpen] = useState(false);
  const [sidebarFullyExpanded, setSidebarFullyExpanded] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  const typeLabel =
    itemType === 'quiz'
      ? tr('typeQuiz')
      : itemType === 'lab'
        ? tr('typeLab')
        : tr('typeLesson');

  useEffect(() => {
    if (!viewOpen) {
      setSidebarViewMenuOpen(false);
      return;
    }
    setSidebarFullyExpanded(getSidebarFullyExpanded?.() ?? false);
    const onDoc = (e: MouseEvent) => {
      if (!viewRef.current?.contains(e.target as Node)) setViewOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [viewOpen, getSidebarFullyExpanded]);

  const courseMenus = mode === 'course';

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[linear-gradient(180deg,var(--chrome-top),var(--chrome))] px-4">
      <div className="flex items-center gap-2">
        {mode === 'course' ? (
          <button
            type="button"
            onClick={onHome}
            title={tr('library')}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm hover:brightness-110"
          >
            <Home className="h-4 w-4" strokeWidth={2.25} />
          </button>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm">
            <Hexagon className="h-4 w-4" strokeWidth={2.25} />
          </div>
        )}
        {mode === 'course' ? (
          <div className="min-w-0 max-w-[14rem] truncate text-[14px] font-bold tracking-wide text-[var(--ink)] sm:max-w-[18rem] lg:max-w-[22rem]">
            {courseTitle}
          </div>
        ) : (
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-wide text-[var(--ink)]">
              {tr('appName')}
            </div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
              {tr('appSubtitle')}
            </div>
          </div>
        )}
      </div>

      <div className="mx-4 h-5 w-px bg-[var(--line)]" />

      <nav className="flex items-center gap-1 text-[12px] text-[var(--ink-muted)]">
        <span className="cursor-pointer rounded px-2 py-1 hover:bg-black/5">File</span>
        <span className="cursor-pointer rounded px-2 py-1 hover:bg-black/5">Edit</span>

        <div ref={viewRef} className="relative">
          <button
            type="button"
            onClick={() => setViewOpen((v) => !v)}
            className={`cursor-pointer rounded px-2 py-1 hover:bg-black/5 ${
              viewOpen ? 'bg-black/5 text-[var(--ink)]' : ''
            }`}
          >
            {tr('viewMenu')}
          </button>
          {viewOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[13rem] rounded-lg border border-[var(--line)] bg-[var(--stage)] py-1 text-[var(--ink)] shadow-lg">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                {tr('viewLeftSidebar')}
              </div>
              <MenuItem
                label={tr('toggleNavigator')}
                disabled={!courseMenus || !onToggleSidebar}
                hint={sidebarOpen ? '✓' : undefined}
                onClick={() => {
                  onToggleSidebar?.();
                  setViewOpen(false);
                }}
              />
              <div
                className="relative"
                onMouseEnter={() => setSidebarViewMenuOpen(true)}
                onMouseLeave={() => setSidebarViewMenuOpen(false)}
              >
                <button
                  type="button"
                  disabled={!onSidebarViewChange}
                  onClick={() => setSidebarViewMenuOpen((v) => !v)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-left text-[12px] enabled:hover:bg-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>{tr('sidebarView')}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                </button>
                {sidebarViewMenuOpen && onSidebarViewChange && (
                  <div className="absolute left-full top-0 z-50 ml-0.5 min-w-[10rem] rounded-lg border border-[var(--line)] bg-[var(--stage)] py-1 shadow-lg">
                    <MenuItem
                      label={tr('navigator')}
                      hint={sidebarView === 'navigator' ? '✓' : undefined}
                      onClick={() => {
                        onSidebarViewChange('navigator');
                        setViewOpen(false);
                      }}
                    />
                    <MenuItem
                      label={tr('overview')}
                      hint={sidebarView === 'overview' ? '✓' : undefined}
                      onClick={() => {
                        onSidebarViewChange('overview');
                        setViewOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>
              <MenuItem
                label={tr('resetSidebar')}
                disabled={!courseMenus || !onResetSidebar}
                onClick={() => {
                  onResetSidebar?.();
                  setViewOpen(false);
                }}
              />
              <MenuItem
                label={
                  sidebarFullyExpanded
                    ? tr('collapseAllSidebar')
                    : tr('expandAllSidebar')
                }
                disabled={!courseMenus || !onToggleExpandAllSidebar}
                onClick={() => {
                  onToggleExpandAllSidebar?.();
                  setSidebarFullyExpanded((v) => !v);
                  setViewOpen(false);
                }}
              />
              <div className="my-1 border-t border-[var(--line)]" />
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                {tr('viewInspectorSidebar')}
              </div>
              <MenuItem
                label={tr('inspectorClose')}
                disabled={!courseMenus || !inspectorOpen || !onInspectorClose}
                onClick={() => {
                  onInspectorClose?.();
                  setViewOpen(false);
                }}
              />
              <MenuItem
                label={tr('inspectorShow')}
                disabled={!courseMenus || !onInspectorShow}
                onClick={() => {
                  onInspectorShow?.();
                  setViewOpen(false);
                }}
              />
              <MenuItem
                label={
                  inspectorMode === 'floating' ? tr('inspectorPin') : tr('inspectorFloat')
                }
                disabled={!courseMenus || !inspectorOpen || !onInspectorTogglePin}
                onClick={() => {
                  onInspectorTogglePin?.();
                  setViewOpen(false);
                }}
              />
            </div>
          )}
        </div>

        <span className="cursor-pointer rounded px-2 py-1 hover:bg-black/5">Play</span>
        <span className="cursor-pointer rounded px-2 py-1 hover:bg-black/5">Help</span>
      </nav>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">
        {mode === 'course' && itemTitle && (
          <>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                itemType === 'quiz'
                  ? 'bg-[var(--quiz-soft)] text-[var(--quiz)]'
                  : itemType === 'lab'
                    ? 'bg-[var(--lab-soft)] text-[var(--lab)]'
                    : 'bg-[var(--accent-soft)] text-[var(--accent)]'
              }`}
            >
              {typeLabel}
            </span>
            <span className="hidden max-w-[280px] truncate text-[12px] text-[var(--ink-muted)] sm:inline">
              {itemTitle}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSettings}
          title={tr('settings')}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1 text-[12px] font-medium text-[var(--ink)] shadow-sm hover:bg-[var(--panel)]"
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{tr('settings')}</span>
        </button>
        <button
          type="button"
          onClick={onOpenProfile}
          title={tr('profile')}
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm hover:brightness-110"
        >
          <UserRound className="h-4 w-4" strokeWidth={2.25} />
        </button>
      </div>
    </header>
  );
}

function MenuItem({
  label,
  onClick,
  disabled,
  hint,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-left text-[12px] enabled:hover:bg-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>{label}</span>
      {hint && <span className="text-[11px] text-[var(--accent)]">{hint}</span>}
    </button>
  );
}
