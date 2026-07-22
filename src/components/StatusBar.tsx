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
    <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-[var(--line)] bg-[#f3f4f6] px-4 text-[11px] text-[var(--ink-muted)] dark:bg-[var(--chrome-top)]">
      <span className="font-medium text-[var(--ink)]">{moduleTitle}</span>
      {unitTitle && (
        <>
          <span>/</span>
          <span>{unitTitle}</span>
        </>
      )}
      <div className="ml-auto flex items-center gap-3">
        <ZoomControl value={zoom} onChange={onZoomChange} compact menuPlacement="up" />
        <span className="tabular-nums">
          {typeLabel} · {trf('slideOf', { current: index + 1, total })}
        </span>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--chrome-deep)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-8 tabular-nums">{pct}%</span>
      </div>
    </footer>
  );
}
