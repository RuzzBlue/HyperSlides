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
import { hideMountSourceContent } from './mountData';

type PortalSpec = {
  element: HTMLElement;
  type: string;
  videoId?: string;
  widgetId?: string;
  chart?: string;
  preset?: string;
  orientation?: string;
  style?: string;
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
        const host = el as HTMLElement;
        // Keep [data-item] markup for hydration + Code edits, but hide it so it
        // does not show as plain text above the React portal UI.
        hideMountSourceContent(host);
        found.push({
          element: host,
          type: el.getAttribute('data-component') || '',
          videoId: el.getAttribute('data-video-id') || undefined,
          widgetId: el.getAttribute('data-widget-id') || undefined,
          chart: el.getAttribute('data-chart') || undefined,
          preset: el.getAttribute('data-preset') || undefined,
          orientation: el.getAttribute('data-orientation') || undefined,
          style: el.getAttribute('data-style') || undefined,
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
        const host = p.element;
        let node: ReactNode = null;
        switch (p.type) {
          case 'flipcards':
            node = <FlipCardsWidget preset={p.preset} host={host} />;
            break;
          case 'accordion':
            node = <AccordionWidget preset={p.preset} host={host} />;
            break;
          case 'carousel':
            node = <CarouselWidget preset={p.preset} host={host} />;
            break;
          case 'image-carousel':
            node = <ImageCarouselWidget host={host} />;
            break;
          case 'marquee-carousel':
            node = <MarqueeCarouselWidget host={host} />;
            break;
          case 'feature-tabs':
            node = <FeatureTabsWidget host={host} />;
            break;
          case 'metrics-stats':
            node = <MetricsStatsWidget preset={p.preset} host={host} />;
            break;
          case 'compare-plans':
            node = <ComparePlansWidget preset={p.preset} host={host} />;
            break;
          case 'timeline':
            node = <TimelineWidget preset={p.preset} host={host} />;
            break;
          case 'timeline-detail':
            node = <DetailTimelineWidget preset={p.preset} host={host} />;
            break;
          case 'timeline-horizontal':
            node = <HorizontalTimelineWidget preset={p.preset} host={host} />;
            break;
          case 'timeline-trail':
            node = <TrailTimelineWidget host={host} />;
            break;
          case 'tabs':
            node = (
              <TabsWidget
                preset={p.preset}
                style={p.style}
                host={host}
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
            node = <ChecklistWidget preset={p.preset} host={host} />;
            break;
          case 'compare-steps':
            node = <CompareStepsWidget preset={p.preset} host={host} />;
            break;
          case 'process-steps':
            node = <ProcessStepsWidget host={host} />;
            break;
          case 'step-showcase':
            node = <StepShowcaseWidget preset={p.preset} host={host} />;
            break;
          case 'filter-table':
            node = <FilterTableWidget host={host} />;
            break;
          case 'mermaid-graph':
            node = <MermaidWidget chart={p.chart} host={host} />;
            break;
          case 'pie-chart':
            node = <PieChartWidget host={host} />;
            break;
          case 'demo-chart':
            node = <DemoChartWidget preset={p.preset} host={host} />;
            break;
          case 'image-compare':
            node = <ImageCompareWidget host={host} />;
            break;
          case 'yt-video':
            node = <YTVideoWidget videoId={p.videoId} />;
            break;
          case 'reveal-steps':
            node = <RevealStepsWidget preset={p.preset} host={host} />;
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
