import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FlipCardsWidget } from './FlipCards';
import { AccordionWidget } from './Accordion';
import { CarouselWidget } from './Carousel';
import {
  TimelineWidget,
  DetailTimelineWidget,
  HorizontalTimelineWidget,
  TrailTimelineWidget,
} from './Timelines';
import { TabsWidget } from './Tabs';
import { ChecklistWidget } from './Checklist';
import { ImageCarouselWidget } from './ImageCarousel';
import { MarqueeCarouselWidget } from './MarqueeCarousel';
import { FeatureTabsWidget } from './FeatureTabs';
import { MetricsStatsWidget } from './MetricsStats';
import { ComparePlansWidget } from './ComparePlans';
import { CompareStepsWidget } from './CompareSteps';
import { ProcessStepsWidget } from './ProcessSteps';
import { StepShowcaseWidget } from './StepShowcase';
import { FilterTableWidget } from './FilterTable';
import { MermaidWidget } from './Mermaid';
import { PieChartWidget } from './PieChart';
import { DemoChartWidget } from './DemoCharts';
import { ImageCompareWidget } from './ImageCompare';
import { YTVideoWidget } from './YTVideo';
import { CourseWidgetFrame } from './CourseWidget';
import { RevealStepsWidget } from './RevealSteps';
import { AssetDownloadWidget, AssetImageWidget, PdfEmbedWidget } from './AssetEmbeds';

type PortalSpec = {
  element: HTMLElement;
  type: string;
  videoId?: string;
  widgetId?: string;
  chart?: string;
  preset?: string;
  orientation?: string;
  src?: string;
  title?: string;
  caption?: string;
  label?: string;
};

export function PortalsRenderer({
  stageId,
  htmlContent,
  courseFolder,
}: {
  stageId: string;
  htmlContent: string;
  courseFolder: string;
}) {
  const [portals, setPortals] = useState<PortalSpec[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stage = document.getElementById(stageId);
      if (!stage) return;
      const found: PortalSpec[] = [];

      stage.querySelectorAll('[data-component]').forEach((el) => {
        found.push({
          element: el as HTMLElement,
          type: el.getAttribute('data-component') || '',
          videoId: el.getAttribute('data-video-id') || undefined,
          widgetId: el.getAttribute('data-widget-id') || undefined,
          chart: el.getAttribute('data-chart') || undefined,
          preset: el.getAttribute('data-preset') || undefined,
          orientation: el.getAttribute('data-orientation') || undefined,
          src: el.getAttribute('data-src') || undefined,
          title: el.getAttribute('data-title') || undefined,
          caption: el.getAttribute('data-caption') || undefined,
          label: el.getAttribute('data-label') || undefined,
        });
      });

      // Fallback: raw <widget id="…"> tags if server conversion was skipped
      stage.querySelectorAll('widget[id]').forEach((el) => {
        const widgetId = el.getAttribute('id') || '';
        if (!widgetId) return;
        const mount = document.createElement('div');
        mount.setAttribute('data-component', 'course-widget');
        mount.setAttribute('data-widget-id', widgetId);
        mount.className = 'my-2 min-h-[320px]';
        el.replaceWith(mount);
        found.push({
          element: mount,
          type: 'course-widget',
          widgetId,
        });
      });

      setPortals(found);
    }, 50);
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
            node = <FlipCardsWidget preset={p.preset} />;
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
          case 'marquee-carousel':
            node = <MarqueeCarouselWidget />;
            break;
          case 'feature-tabs':
            node = <FeatureTabsWidget />;
            break;
          case 'metrics-stats':
            node = <MetricsStatsWidget preset={p.preset} />;
            break;
          case 'compare-plans':
            node = <ComparePlansWidget preset={p.preset} />;
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
          case 'timeline-trail':
            node = <TrailTimelineWidget />;
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
            node = <CompareStepsWidget preset={p.preset} />;
            break;
          case 'process-steps':
            node = <ProcessStepsWidget />;
            break;
          case 'step-showcase':
            node = <StepShowcaseWidget preset={p.preset} />;
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
          case 'demo-chart':
            node = <DemoChartWidget preset={p.preset} />;
            break;
          case 'image-compare':
            node = <ImageCompareWidget />;
            break;
          case 'yt-video':
            node = <YTVideoWidget videoId={p.videoId} />;
            break;
          case 'reveal-steps':
            node = <RevealStepsWidget preset={p.preset} />;
            break;
          case 'pdf-embed':
            node = (
              <PdfEmbedWidget courseFolder={courseFolder} src={p.src} title={p.title} />
            );
            break;
          case 'asset-image':
            node = (
              <AssetImageWidget
                courseFolder={courseFolder}
                src={p.src}
                title={p.title}
                caption={p.caption}
              />
            );
            break;
          case 'asset-download':
            node = (
              <AssetDownloadWidget courseFolder={courseFolder} src={p.src} label={p.label} />
            );
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
