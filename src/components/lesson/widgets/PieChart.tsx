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
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: SEGMENTS.map((s) => s.label),
        datasets: [
          {
            data: SEGMENTS.map((s) => s.value),
            backgroundColor: SEGMENTS.map((s) => s.color),
            borderWidth: 0,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        cutout: '58%',
        onClick: (_evt, elements) => {
          if (elements[0]) setSelected(elements[0].index);
        },
      },
    });
    return () => chart.destroy();
  }, []);

  const seg = SEGMENTS[selected];

  return (
    <ExpandableShell title="Illustrative distribution model" bodyClassName="p-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="mx-auto w-full max-w-[240px]">
          <canvas ref={canvasRef} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
            Segment detail
          </span>
          <h4 className="mt-2 text-lg font-black text-slate-900 dark:text-white">{seg.label}</h4>
          <p className="mt-1 text-2xl font-black tabular-nums text-indigo-600">{seg.value}%</p>
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
                className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  i === selected
                    ? 'text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
                style={i === selected ? { backgroundColor: s.color } : undefined}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ExpandableShell>
  );
}
