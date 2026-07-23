import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
  LineController,
  BarController,
} from 'chart.js';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
  LineController,
  BarController,
);

const ACCENT = '#0e6e6a';
const ACCENT_2 = '#38bdf8';
const ACCENT_3 = '#f59e0b';

type Preset = 'neg-line' | 'multi-bar' | 'area' | 'multi-line';

function resolvePreset(raw?: string): Preset {
  if (raw === 'multi-bar' || raw === 'area' || raw === 'multi-line' || raw === 'neg-line') return raw;
  return 'neg-line';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MetricSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded-lg border-0 bg-transparent py-1.5 pe-6 ps-2 text-sm font-medium text-slate-900 outline-none hover:bg-slate-100 focus:bg-slate-100 dark:text-white dark:hover:bg-slate-800 dark:focus:bg-slate-800"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function NegLineCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [metric, setMetric] = useState('Members');

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const free = [12, 18, 14, 22, 19, 28, 24, 31, 27, 35, 30, 38];
    const paid = [8, 6, -2, 4, 9, 12, 7, 15, 11, 18, 14, 20];
    const scale =
      metric === 'Posts' ? 0.45 : metric === 'Views' ? 2.8 : 1;

    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: 'Free',
            data: free.map((n) => Math.round(n * scale * 600)),
            borderColor: ACCENT,
            backgroundColor: ACCENT,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: 'Paid',
            data: paid.map((n) => Math.round(n * scale * 600)),
            borderColor: ACCENT_3,
            backgroundColor: ACCENT_3,
            borderDash: [4, 4],
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(148,163,184,0.25)' },
            ticks: { color: '#94a3b8', font: { size: 11 } },
            border: { display: false },
          },
        },
      },
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [metric]);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <MetricSelect value={metric} onChange={setMetric} options={['Members', 'Posts', 'Views']} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">22,900</span>
            <span className="inline-flex items-center gap-0.5 text-sm text-emerald-600 dark:text-emerald-400">
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m5 12 7-7 7 7" />
                <path d="M12 19V5" />
              </svg>
              0.2%
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-3 rounded-sm" style={{ background: ACCENT }} />
            <span className="text-sm text-slate-500 dark:text-slate-400">Free</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-0.5 text-sm text-emerald-600 dark:text-emerald-400">
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m5 12 7-7 7 7" />
                <path d="M12 19V5" />
              </svg>
              14.5%
            </span>
            <span className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">24,300</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-3 rounded-sm"
              style={{
                backgroundImage: `repeating-linear-gradient(135deg, ${ACCENT_3} 0 2px, transparent 2px 4px)`,
              }}
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">Paid</span>
          </div>
        </div>
      </div>
      <div className="mt-3 h-64 min-h-[16rem]">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function MultiBarCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: MONTHS.slice(0, 8),
        datasets: [
          {
            label: 'Income',
            data: [18, 24, 21, 32, 28, 36, 30, 41],
            backgroundColor: ACCENT,
            borderRadius: 6,
            barPercentage: 0.55,
          },
          {
            label: 'Expenses',
            data: [12, 14, 16, 18, 17, 20, 19, 22],
            backgroundColor: '#99f6e4',
            borderRadius: 6,
            barPercentage: 0.55,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(148,163,184,0.25)' },
            ticks: { color: '#94a3b8', font: { size: 11 } },
            border: { display: false },
          },
        },
      },
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  return (
    <div className="flex min-h-[22rem] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm text-slate-500 dark:text-slate-400">Income</h3>
          <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white sm:text-2xl">
            $126,238.49
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-1.5 py-2 text-xs font-medium text-teal-800 dark:bg-teal-500/10 dark:text-teal-400">
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </svg>
          25%
        </span>
      </div>
      <div className="mt-4 min-h-[14rem] flex-1">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function AreaCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: 'Visitors',
            data: [42, 48, 45, 58, 62, 70, 68, 74, 71, 80, 78, 86],
            borderColor: ACCENT,
            backgroundColor: 'rgba(14, 110, 106, 0.18)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(148,163,184,0.25)' },
            ticks: { color: '#94a3b8', font: { size: 11 } },
            border: { display: false },
          },
        },
      },
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  return (
    <div className="flex min-h-[22rem] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm text-slate-500 dark:text-slate-400">Visitors</h3>
          <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white sm:text-2xl">
            80.3k
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-2 text-xs font-medium text-red-800 dark:bg-red-500/10 dark:text-red-400">
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </svg>
          2%
        </span>
      </div>
      <div className="mt-4 min-h-[14rem] flex-1">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function MultiLineCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: 'Desktop',
            data: [28, 32, 30, 36, 40, 44, 42, 48, 46, 52, 55, 60],
            borderColor: ACCENT,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: 'Mobile',
            data: [18, 22, 26, 24, 30, 34, 38, 36, 42, 45, 48, 53],
            borderColor: ACCENT_2,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: 'Tablet',
            data: [8, 9, 10, 11, 12, 13, 12, 14, 15, 16, 17, 18],
            borderColor: ACCENT_3,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, boxHeight: 10, font: { size: 11, weight: 600 } },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(148,163,184,0.25)' },
            ticks: { color: '#94a3b8', font: { size: 11 } },
            border: { display: false },
          },
        },
      },
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  return (
    <div className="flex min-h-[22rem] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm text-slate-500 dark:text-slate-400">Sessions by device</h3>
          <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white sm:text-2xl">
            131.4k
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Last 12 months · three series</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m5 12 7-7 7 7" />
            <path d="M12 19V5" />
          </svg>
          8.4%
        </span>
      </div>
      <div className="mt-4 min-h-[14rem] flex-1">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export function DemoChartWidget({ preset }: { preset?: string }) {
  const mode = resolvePreset(preset);
  if (mode === 'multi-bar') return <MultiBarCard />;
  if (mode === 'area') return <AreaCard />;
  if (mode === 'multi-line') return <MultiLineCard />;
  return <NegLineCard />;
}
