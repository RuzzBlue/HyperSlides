import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables, type ChartConfiguration, type ChartType } from 'chart.js';
import { ExpandableShell, PanZoomSurface } from '../ExpandableShell';

Chart.register(...registerables);

type HcChartType = 'bar' | 'line' | 'area' | 'pie' | 'doughnut' | 'horizontalBar';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function boolAttr(host: HTMLElement | null | undefined, name: string, fallback = true): boolean {
  const value = host?.getAttribute(name);
  return value == null ? fallback : value !== '0' && value !== 'false';
}

function readType(host: HTMLElement | null | undefined): HcChartType {
  const value = host?.getAttribute('data-chart-type') || 'bar';
  return ['bar', 'line', 'area', 'pie', 'doughnut', 'horizontalBar'].includes(value)
    ? (value as HcChartType)
    : 'bar';
}

export function HcChartWidget({ host }: { host?: HTMLElement | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!host) return;
    const observer = new MutationObserver((records) => {
      const sourceChanged = records.some((record) => {
        if (record.type === 'attributes') {
          return (
            (record.target === host && record.attributeName?.startsWith('data-')) ||
            (record.target instanceof HTMLElement && record.target.hasAttribute('data-item'))
          );
        }
        const changedNodes = [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)];
        return changedNodes.some(
          (node) =>
            node instanceof HTMLElement &&
            (node.hasAttribute('data-item') || Boolean(node.querySelector('[data-item]'))),
        );
      });
      if (sourceChanged) setRevision((value) => value + 1);
    });
    observer.observe(host, { attributes: true, childList: true, subtree: true });
    return () => observer.disconnect();
  }, [host]);

  const model = useMemo(() => {
    const items = host ? Array.from(host.querySelectorAll<HTMLElement>('[data-item]')) : [];
    const chartType = readType(host);
    return {
      chartType,
      labels: items.map((item, index) => item.getAttribute('data-label') || `Item ${index + 1}`),
      values: items.map((item) => Number.parseFloat(item.getAttribute('data-value') || '0') || 0),
      colors: items.map((item, index) => item.getAttribute('data-color') || COLORS[index % COLORS.length]),
      title: host?.getAttribute('data-shell-title') || host?.getAttribute('data-hc-label') || 'Graph',
      expand: boolAttr(host, 'data-shell-expand'),
      zoom: boolAttr(host, 'data-shell-zoom'),
      pan: boolAttr(host, 'data-shell-pan'),
      snapshot: host?.getAttribute('data-shell-snapshot') === '1',
    };
  }, [host, revision]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    chartRef.current?.destroy();
    const radial = model.chartType === 'pie' || model.chartType === 'doughnut';
    const horizontal = model.chartType === 'horizontalBar';
    const chartType: ChartType =
      model.chartType === 'pie'
        ? 'pie'
        : model.chartType === 'doughnut'
          ? 'doughnut'
          : model.chartType === 'bar' || horizontal
            ? 'bar'
            : 'line';
    const config: ChartConfiguration = {
      type: chartType,
      data: {
        labels: model.labels,
        datasets: [
          {
            label: model.title,
            data: model.values,
            backgroundColor: radial ? model.colors : model.colors.map((color) => `${color}cc`),
            borderColor: radial ? '#ffffff' : model.colors,
            borderWidth: radial ? 2 : 2,
            fill: model.chartType === 'area',
            tension: model.chartType === 'line' || model.chartType === 'area' ? 0.32 : 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {
          legend: { display: radial, position: 'bottom' },
        },
        scales: radial ? undefined : { y: { beginAtZero: true } },
      },
    };
    const chart = new Chart(canvas, config);
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [model]);

  const canvas = (
    <div className="h-full min-h-[280px] w-full p-4">
      <canvas ref={canvasRef} />
    </div>
  );
  const content =
    model.zoom || model.pan ? (
      <PanZoomSurface
        className="h-full min-h-[280px] bg-white dark:bg-slate-950"
        enableZoom={model.zoom}
        enablePan={model.pan}
      >
        <div className="h-[280px] w-[min(760px,80vw)]">{canvas}</div>
      </PanZoomSurface>
    ) : (
      canvas
    );

  return (
    <ExpandableShell
      title={model.title}
      allowExpand={model.expand}
      allowSnapshot={model.snapshot}
      snapshotName={model.title}
      bodyClassName="h-[320px]"
      expandedBodyClassName="min-h-0 flex-1"
    >
      {content}
    </ExpandableShell>
  );
}
