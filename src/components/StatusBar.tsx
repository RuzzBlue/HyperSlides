import type { SequenceItemType } from '@shared/types';

export function StatusBar({
  moduleTitle,
  unitTitle,
  type,
  index,
  total,
}: {
  moduleTitle: string;
  unitTitle?: string;
  type: SequenceItemType;
  index: number;
  total: number;
}) {
  const pct = total ? Math.round(((index + 1) / total) * 100) : 0;

  return (
    <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-[var(--line)] bg-[#f3f4f6] px-4 text-[11px] text-[var(--ink-muted)]">
      <span className="font-medium text-[var(--ink)]">{moduleTitle}</span>
      {unitTitle && (
        <>
          <span>/</span>
          <span>{unitTitle}</span>
        </>
      )}
      <span className="ml-auto tabular-nums">
        {type} · {index + 1} of {total}
      </span>
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[var(--chrome-deep)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 tabular-nums">{pct}%</span>
    </footer>
  );
}
