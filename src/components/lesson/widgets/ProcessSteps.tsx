import { useState } from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  {
    title: 'Gather the facts',
    detail: 'Asset, network, amount, and destination address — write them down before opening the wallet.',
  },
  {
    title: 'Simulate the send',
    detail: 'Use a dry-run or a tiny test transfer when the destination is new or the amount is large.',
  },
  {
    title: 'Review the preview',
    detail: 'Read fee, total debit, and any approval scope. Cancel if anything looks unfamiliar.',
  },
  {
    title: 'Sign and confirm',
    detail: 'Approve only when the preview matches your notes. Record the tx hash for follow-up.',
  },
];

/** Vertical process rail — pick any step; completed steps stay checked. Distinct from reveal & compare. */
export function ProcessStepsWidget() {
  const [active, setActive] = useState(0);
  const [done, setDone] = useState<Record<number, boolean>>({});

  const markDone = () => {
    setDone((d) => ({ ...d, [active]: true }));
    if (active < STEPS.length - 1) setActive(active + 1);
  };

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <ol className="relative m-0 space-y-0 p-0 list-none">
        {STEPS.map((step, i) => {
          const isActive = i === active;
          const isDone = !!done[i];
          return (
            <li key={step.title} className="relative flex gap-3 pb-5 last:pb-0">
              {i < STEPS.length - 1 && (
                <span
                  className="absolute left-[0.9rem] top-8 bottom-0 w-px bg-slate-200 dark:bg-slate-700"
                  aria-hidden
                />
              )}
              <button
                type="button"
                onClick={() => setActive(i)}
                className={`relative z-[1] flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[11px] font-black transition ${
                  isDone
                    ? 'bg-teal-700 text-white'
                    : isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'border border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-900'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </button>
              <button
                type="button"
                onClick={() => setActive(i)}
                className={`min-w-0 flex-1 cursor-pointer rounded-xl px-3 py-2 text-left transition ${
                  isActive ? 'bg-teal-50 dark:bg-teal-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                }`}
              >
                <span
                  className={`block text-sm font-bold ${
                    isActive ? 'text-teal-900 dark:text-teal-200' : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {step.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                  {isDone ? 'Done' : isActive ? 'In focus' : 'Waiting'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
          Process step {active + 1}
        </span>
        <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">{STEPS[active].title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{STEPS[active].detail}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={markDone}
            className="cursor-pointer rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800"
          >
            Mark complete{active < STEPS.length - 1 ? ' & next' : ''}
          </button>
          <button
            type="button"
            onClick={() => {
              setDone({});
              setActive(0);
            }}
            className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-600"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
