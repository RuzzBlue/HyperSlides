import type { ContentZoomPreset, SequenceItemType } from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';
import { ZoomControl } from './ZoomControl';

export function StatusBar({
  moduleTitle,
  unitTitle,
  type,
  index,
  total,
  zoom,
  onZoomChange,
}: {
  moduleTitle: string;
  unitTitle?: string;
  type: SequenceItemType;
  index: number;
  total: number;
  zoom: ContentZoomPreset;
  onZoomChange: (z: ContentZoomPreset) => void;
}) {
  const { tr, trf } = usePrefs();
  const pct = total ? Math.round(((index + 1) / total) * 100) : 0;
  const typeLabel =
    type === 'quiz' ? tr('typeQuiz') : type === 'lab' ? tr('typeLab') : tr('typeLesson');

  return (
    <footer className="flex h-8 shrink-0 items-center gap-2 border-t border-[var(--line)] bg-[#f3f4f6] px-3 text-[11px] text-[var(--ink-muted)] sm:gap-3 sm:px-4 dark:bg-[var(--chrome-top)]">
      <span className="min-w-0 max-w-[8rem] truncate font-medium text-[var(--ink)] sm:max-w-[14rem] lg:max-w-none">
        {moduleTitle}
      </span>
      {unitTitle && (
        <>
          <span className="hidden sm:inline">/</span>
          <span className="hidden min-w-0 max-w-[10rem] truncate sm:inline lg:max-w-[16rem]">
            {unitTitle}
          </span>
        </>
      )}
      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <ZoomControl value={zoom} onChange={onZoomChange} compact menuPlacement="up" />
        <span className="hidden tabular-nums md:inline">
          {typeLabel} · {trf('slideOf', { current: index + 1, total })}
        </span>
        <span className="tabular-nums md:hidden">
          {index + 1}/{total}
        </span>
        <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[var(--chrome-deep)] sm:block lg:w-28">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="hidden w-8 tabular-nums sm:inline">{pct}%</span>
      </div>
    </footer>
  );
}
