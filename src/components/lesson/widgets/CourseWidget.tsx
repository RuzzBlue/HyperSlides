import { ExpandableShell } from '../ExpandableShell';

const TITLES: Record<string, string> = {
  'seed-phrase-demo': 'Seed phrase demo',
  'crypto-candles': 'Market candles demo',
};

export function CourseWidgetFrame({
  courseFolder,
  widgetId,
}: {
  courseFolder: string;
  widgetId: string;
}) {
  const title = TITLES[widgetId] || widgetId.replace(/-/g, ' ');
  return (
    <ExpandableShell
      title={title}
      className="ring-1 ring-indigo-100 dark:ring-indigo-900/40"
      bodyClassName="h-[300px] bg-[#0f1419]"
      expandedBodyClassName="min-h-0 flex-1 bg-[#0f1419]"
    >
      <iframe
        title={widgetId}
        src={`http://127.0.0.1:8765/courses/${encodeURIComponent(courseFolder)}/widgets/${encodeURIComponent(widgetId)}/index.html`}
        className="block h-full min-h-[280px] w-full border-0"
      />
    </ExpandableShell>
  );
}
