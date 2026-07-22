import { useId, useMemo } from 'react';
import { PortalsRenderer } from './lesson/InteractiveWidgets';

export function LessonView({
  html,
  title,
  courseFolder,
}: {
  html: string;
  title: string;
  courseFolder: string;
}) {
  const uid = useId().replace(/:/g, '');
  const stageId = useMemo(() => `lesson-stage-${uid}`, [uid]);

  return (
    <div className="relative h-full overflow-y-auto bg-[var(--stage)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--accent)_14%,transparent),_transparent_70%)]"
        aria-hidden
      />
      <article
        id={stageId}
        className="lesson-stage relative mx-auto w-full max-w-4xl px-6 py-10 md:px-12 md:py-14"
        aria-label={title}
      >
        <div dangerouslySetInnerHTML={{ __html: html }} />
        <PortalsRenderer stageId={stageId} htmlContent={html} courseFolder={courseFolder} />
      </article>
    </div>
  );
}
