import { ExpandableShell } from '../ExpandableShell';

export function YTVideoWidget({ videoId }: { videoId?: string }) {
  const id = videoId || 'SSo_EIwHSd4';
  return (
    <ExpandableShell
      title="Embedded briefing"
      bodyClassName="relative aspect-video bg-slate-950"
      expandedBodyClassName="relative min-h-0 flex-1 bg-slate-950"
    >
      <iframe
        title="Lesson video"
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </ExpandableShell>
  );
}
