import { ExpandableShell } from '../ExpandableShell';

export function CourseWidgetFrame({
  courseFolder,
  widgetId,
}: {
  courseFolder: string;
  widgetId: string;
}) {
  return (
    <ExpandableShell
      title={widgetId.replace(/-/g, ' ')}
      bodyClassName="h-[300px] bg-[#0f1419]"
      expandedBodyClassName="min-h-0 flex-1 bg-[#0f1419]"
    >
      <iframe
        title={widgetId}
        src={`http://127.0.0.1:8765/courses/${courseFolder}/widgets/${widgetId}/index.html`}
        className="h-full w-full border-0"
      />
    </ExpandableShell>
  );
}
