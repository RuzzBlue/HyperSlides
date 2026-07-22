import { Home, Hexagon, Settings } from 'lucide-react';
import { usePrefs } from '../prefs/PrefsProvider';

export function TitleBar({
  courseTitle,
  onHome,
  showHome,
  onOpenSettings,
}: {
  courseTitle?: string;
  onHome: () => void;
  showHome: boolean;
  onOpenSettings: () => void;
}) {
  const { tr } = usePrefs();

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[linear-gradient(180deg,var(--chrome-top),var(--chrome))] px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-sm">
          <Hexagon className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-wide text-[var(--ink)]">
            {tr('appName')}
          </div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {tr('appSubtitle')}
          </div>
        </div>
      </div>

      <div className="mx-4 h-5 w-px bg-[var(--line)]" />

      <nav className="flex items-center gap-1 text-[12px] text-[var(--ink-muted)]">
        <span className="rounded px-2 py-1 hover:bg-black/5">File</span>
        <span className="rounded px-2 py-1 hover:bg-black/5">Edit</span>
        <span className="rounded px-2 py-1 hover:bg-black/5">View</span>
        <span className="rounded px-2 py-1 hover:bg-black/5">Play</span>
        <span className="rounded px-2 py-1 hover:bg-black/5">Help</span>
      </nav>

      <div className="min-w-0 flex-1 text-center">
        {courseTitle && (
          <span className="truncate text-[13px] font-medium text-[var(--ink)]">{courseTitle}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showHome && (
          <button
            type="button"
            onClick={onHome}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1 text-[12px] font-medium text-[var(--ink)] shadow-sm hover:bg-[var(--panel)]"
          >
            <Home className="h-3.5 w-3.5" />
            {tr('library')}
          </button>
        )}
        <button
          type="button"
          onClick={onOpenSettings}
          title={tr('settings')}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--stage)] px-2.5 py-1 text-[12px] font-medium text-[var(--ink)] shadow-sm hover:bg-[var(--panel)]"
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{tr('settings')}</span>
        </button>
      </div>
    </header>
  );
}
