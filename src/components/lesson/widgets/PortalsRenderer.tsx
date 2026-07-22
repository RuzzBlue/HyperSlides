import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FlipCardsWidget } from './FlipCards';
import { AccordionWidget } from './Accordion';
import { CarouselWidget } from './Carousel';
import { TimelineWidget, DetailTimelineWidget, HorizontalTimelineWidget } from './Timelines';
import { TabsWidget } from './Tabs';
import { ChecklistWidget } from './Checklist';
import { ImageCarouselWidget } from './ImageCarousel';
import { CompareStepsWidget } from './CompareSteps';
import { FilterTableWidget } from './FilterTable';
import { MermaidWidget } from './Mermaid';
import { PieChartWidget } from './PieChart';
import { YTVideoWidget } from './YTVideo';
import { CourseWidgetFrame } from './CourseWidget';

export function PortalsRenderer({
  stageId,
  htmlContent,
  courseFolder,
}: {
  stageId: string;
  htmlContent: string;
  courseFolder: string;
}) {
  const [portals, setPortals] = useState<
    Array<{
      element: HTMLElement;
      type: string;
      videoId?: string;
      widgetId?: string;
      chart?: string;
      preset?: string;
      orientation?: string;
    }>
  >([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stage = document.getElementById(stageId);
      if (!stage) return;
      const found: typeof portals = [];
      stage.querySelectorAll('[data-component]').forEach((el) => {
        found.push({
          element: el as HTMLElement,
          type: el.getAttribute('data-component') || '',
          videoId: el.getAttribute('data-video-id') || undefined,
          widgetId: el.getAttribute('data-widget-id') || undefined,
          chart: el.getAttribute('data-chart') || undefined,
          preset: el.getAttribute('data-preset') || undefined,
          orientation: el.getAttribute('data-orientation') || undefined,
        });
      });
      setPortals(found);
    }, 40);
    return () => {
      window.clearTimeout(timer);
      setPortals([]);
    };
  }, [htmlContent, stageId]);

  return (
    <>
      {portals.map((p, idx) => {
        let node: ReactNode = null;
        switch (p.type) {
          case 'flipcards':
            node = <FlipCardsWidget />;
            break;
          case 'accordion':
            node = <AccordionWidget preset={p.preset} />;
            break;
          case 'carousel':
            node = <CarouselWidget preset={p.preset} />;
            break;
          case 'image-carousel':
            node = <ImageCarouselWidget />;
            break;
          case 'timeline':
            node = <TimelineWidget preset={p.preset} />;
            break;
          case 'timeline-detail':
            node = <DetailTimelineWidget preset={p.preset} />;
            break;
          case 'timeline-horizontal':
            node = <HorizontalTimelineWidget preset={p.preset} />;
            break;
          case 'tabs':
            node = (
              <TabsWidget
                preset={p.preset}
                orientation={
                  p.orientation === 'vertical'
                    ? 'vertical'
                    : p.orientation === 'horizontal'
                      ? 'horizontal'
                      : undefined
                }
              />
            );
            break;
          case 'checklist':
            node = <ChecklistWidget preset={p.preset} />;
            break;
          case 'compare-steps':
            node = <CompareStepsWidget />;
            break;
          case 'filter-table':
            node = <FilterTableWidget />;
            break;
          case 'mermaid-graph':
            node = <MermaidWidget chart={p.chart} />;
            break;
          case 'pie-chart':
            node = <PieChartWidget />;
            break;
          case 'yt-video':
            node = <YTVideoWidget videoId={p.videoId} />;
            break;
          case 'course-widget':
            if (p.widgetId)
              node = <CourseWidgetFrame courseFolder={courseFolder} widgetId={p.widgetId} />;
            break;
          default:
            node = null;
        }
        if (!node) return null;
        return createPortal(node, p.element, `${p.type}-${idx}`);
      })}
    </>
  );
}
