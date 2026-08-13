import { useEffect, useMemo, useRef } from 'react';
import type {
  CourseExtras,
  CourseManifest,
  ProgressState,
  SequenceItem,
  SpecialSlideKind,
} from '@shared/types';
import {
  contentSequence,
  hydrateSpecialSlideHtml,
  normalizeSpecialSlideExtras,
} from '@shared/specialSlides';

export function FullPageSlideView({
  kind,
  html,
  manifest,
  sequence,
  extras,
  progress,
  onGotoKey,
}: {
  kind: SpecialSlideKind;
  html: string;
  manifest: CourseManifest;
  sequence: SequenceItem[];
  extras?: CourseExtras | null;
  progress?: ProgressState | null;
  onGotoKey: (key: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const normalized = useMemo(() => normalizeSpecialSlideExtras(extras), [extras]);

  const hydrated = useMemo(() => {
    const content = contentSequence(sequence);
    return hydrateSpecialSlideHtml(kind, html, {
      manifest,
      contentSequence: content,
      extras: { ...(extras ?? {}), ...normalized },
      progress,
      authorDisplay: manifest.author,
    });
  }, [kind, html, manifest, sequence, extras, normalized, progress]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest?.('[data-hc-goto]') as HTMLElement | null;
      if (!link) return;
      const key = link.getAttribute('data-hc-goto');
      if (!key) return;
      e.preventDefault();
      onGotoKey(key);
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [onGotoKey, hydrated]);

  return (
    <div
      ref={rootRef}
      className="hc-fullpage-stage h-full w-full overflow-auto"
      data-hc-fullpage-kind={kind}
      dangerouslySetInnerHTML={{ __html: hydrated }}
    />
  );
}
