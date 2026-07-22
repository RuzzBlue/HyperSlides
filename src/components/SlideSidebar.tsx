import { Beaker, BookOpen, CheckCircle2, HelpCircle } from 'lucide-react';
import type { ProgressState, SequenceItem } from '@shared/types';

export function SlideSidebar({
  sequence,
  index,
  progress,
  onSelect,
  showSlideNumbers = true,
}: {
  sequence: SequenceItem[];
  index: number;
  progress: ProgressState | null;
  onSelect: (i: number) => void;
  showSlideNumbers?: boolean;
}) {
  let lastModule = '';

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--chrome-deep)]">
      <div className="border-b border-[var(--line)] px-3 py-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
          Navigator
        </div>
        <div className="text-[12px] text-[var(--ink)]">{sequence.length} slides</div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {sequence.map((item) => {
          const showModule = item.moduleTitle !== lastModule;
          lastModule = item.moduleTitle;
          const active = item.index === index;
          const done = progress?.completedKeys?.includes(item.key);
          const quizDone = item.type === 'quiz' && progress?.quizScores?.[item.activityId!];

          return (
            <div key={item.key}>
              {showModule && (
                <div className="mb-1.5 mt-1 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                  {item.moduleTitle}
                </div>
              )}
              <button
                type="button"
                onClick={() => onSelect(item.index)}
                className={`group w-full rounded-lg p-1.5 text-left transition ${
                  active
                    ? 'bg-white shadow-md ring-2 ring-[var(--accent)]'
                    : 'hover:bg-white/70'
                }`}
              >
                <div
                  className={`relative mb-1.5 flex aspect-[16/10] items-center justify-center overflow-hidden rounded-md border ${
                    item.type === 'quiz'
                      ? 'border-[#c9d7ef] bg-[linear-gradient(145deg,#eef3fb,#d9e4f6)]'
                      : item.type === 'lab'
                        ? 'border-[#ddd0ef] bg-[linear-gradient(145deg,#f6f1fb,#e8ddf4)]'
                        : 'border-[var(--line)] bg-[linear-gradient(160deg,#ffffff,#f3f5f8)]'
                  }`}
                >
                  <ThumbIcon type={item.type} />
                  {showSlideNumbers && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      {item.index + 1}
                    </span>
                  )}
                  {(done || quizDone) && (
                    <CheckCircle2 className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-[var(--success)]" />
                  )}
                </div>
                <div className="truncate px-0.5 text-[11px] font-medium text-[var(--ink)]">
                  {item.title}
                </div>
                <div className="truncate px-0.5 text-[10px] text-[var(--ink-muted)]">
                  {item.unitTitle ?? item.moduleTitle}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function ThumbIcon({ type }: { type: SequenceItem['type'] }) {
  if (type === 'quiz') return <HelpCircle className="h-7 w-7 text-[var(--quiz)] opacity-80" />;
  if (type === 'lab') return <Beaker className="h-7 w-7 text-[var(--lab)] opacity-80" />;
  return <BookOpen className="h-7 w-7 text-[var(--accent)] opacity-70" />;
}
