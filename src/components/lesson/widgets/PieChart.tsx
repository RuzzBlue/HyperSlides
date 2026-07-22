import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  DoughnutController,
} from 'chart.js';
import { ExpandableShell } from '../ExpandableShell';

Chart.register(ArcElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController);

const SEGMENTS = [
  {
    label: 'Community Airdrop',
    value: 45,
    color: '#4f46e5',
    vesting: '100% fully unlocked at Token Generation (TGE)',
    use: 'Distributed to early active sandbox testers and network stress-testers.',
  },
  {
    label: 'Team',
    value: 20,
    color: '#0d9488',
    vesting: '12-month cliff, then 24-month linear unlock',
    use: 'Core contributors building and maintaining the protocol.',
  },
  {
    label: 'Treasury',
    value: 20,
    color: '#f59e0b',
    vesting: 'Multisig-governed releases',
    use: 'Grants, audits, and long-term ecosystem runway.',
  },
  {
    label: 'Liquidity',
    value: 15,
    color: '#e11d48',
    vesting: 'Bootstrapped at launch',
    use: 'Market making and exchange listing liquidity.',
  },
];

export function PieChartWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    const chart = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: SEGMENTS.map((s) => `${s.label} (${s.value}%)`),
        datasets: [
          {
            data: SEGMENTS.map((s) => s.value),
            backgroundColor: SEGMENTS.map((s) => s.color),
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              padding: 12,
              font: { family: 'Outfit', size: 11, weight: 600 },
              generateLabels: (c) => {
                const data = c.data;
                if (!data.labels?.length || !data.datasets.length) return [];
                const ds = data.datasets[0];
                const colors = (ds.backgroundColor as string[]) || [];
                return data.labels.map((label, i) => ({
                  text: String(label),
                  fillStyle: colors[i],
                  strokeStyle: colors[i],
                  hidden: false,
                  index: i,
                }));
              },
            },
            onClick: (_e, item) => {
              if (typeof item.index === 'number') setSelected(item.index);
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const s = SEGMENTS[ctx.dataIndex];
                return s ? `${s.label}: ${s.value}%` : '';
              },
            },
          },
        },
        cutout: '58%',
        onClick: (_evt, elements) => {
          if (elements[0]) setSelected(elements[0].index);
        },
      },
    });
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  const seg = SEGMENTS[selected];

  return (
    <ExpandableShell title="Illustrative distribution model" bodyClassName="p-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="mx-auto w-full max-w-[280px]">
          <canvas ref={canvasRef} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
            Segment detail
          </span>
          <div className="mt-3 flex items-start gap-3">
            <span
              className="mt-1 h-8 w-8 shrink-0 rounded-lg shadow-sm ring-2 ring-white dark:ring-slate-800"
              style={{ backgroundColor: seg.color }}
              aria-hidden
            />
            <div className="min-w-0">
              <h4 className="text-lg font-black text-slate-900 dark:text-white">{seg.label}</h4>
              <p className="mt-0.5 text-2xl font-black tabular-nums" style={{ color: seg.color }}>
                {seg.value}%
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <p>
              <span className="font-bold text-slate-800 dark:text-slate-200">Vesting rules:</span>{' '}
              {seg.vesting}
            </p>
            <p>
              <span className="font-bold text-slate-800 dark:text-slate-200">Description &amp; use:</span>{' '}
              {seg.use}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {SEGMENTS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setSelected(i)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  i === selected
                    ? 'text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
                style={i === selected ? { backgroundColor: s.color } : undefined}
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                {s.label} · {s.value}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </ExpandableShell>
  );
}
