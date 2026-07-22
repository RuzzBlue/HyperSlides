import { useState } from 'react';

export type TimelineDetail = {
  y: string;
  t: string;
  subtitle: string;
  body: string;
  extra?: string;
};

export const DETAIL_TIMELINES: Record<string, TimelineDetail[]> = {
  blockchain: [
    {
      y: '2008',
      t: 'Bitcoin Whitepaper',
      subtitle: 'The Genesis Moment (2008)',
      body: 'Satoshi Nakamoto publishes the foundational whitepaper, proposing a fully decentralized peer-to-peer cash network using Proof-of-Work to solve the double-spending problem.',
      extra:
        'No central bank, no trusted clearinghouses. It combined cryptography, digital signatures, and decentralized consensus into a single secure ledger architecture.',
    },
    {
      y: '2015',
      t: 'Ethereum Launch',
      subtitle: 'Programmable Money',
      body: 'Ethereum goes live with a general-purpose virtual machine, unlocking smart contracts beyond simple payments.',
      extra: 'Developers can now encode agreements, tokens, and applications that run on shared infrastructure.',
    },
    {
      y: '2020+',
      t: 'DeFi Summer',
      subtitle: 'Composable Finance',
      body: 'Lending, AMMs, and yield protocols compose like Lego — capital and risk move at internet speed.',
      extra: 'The boom also taught hard lessons about audits, oracles, and economic exploits.',
    },
    {
      y: 'Today',
      t: 'Institutional Rails',
      subtitle: 'Scale & Custody',
      body: 'L2 networks, regulated custody, and real-world asset experiments bridge crypto with traditional finance.',
      extra: 'The core idea remains: a shared, verifiable ledger without a single operator.',
    },
  ],
};

const STEP_PRESETS: Record<string, { y: string; t: string; d: string }[]> = {
  'wallet-setup': [
    { y: '01', t: 'Install', d: 'Download only from a verified official source.' },
    { y: '02', t: 'Back up', d: 'Write the recovery phrase offline — never store it in cloud photos.' },
    { y: '03', t: 'Receive', d: 'Accept a tiny test amount on the correct network.' },
    { y: '04', t: 'Review', d: 'Double-check every network and address before larger moves.' },
  ],
  'send-flow': [
    { y: '01', t: 'Copy', d: 'Pull the destination address from a trusted source — not a DM.' },
    { y: '02', t: 'Compare', d: 'Check the first and last characters after pasting.' },
    { y: '03', t: 'Select', d: 'Confirm the intended asset and network.' },
    { y: '04', t: 'Send', d: 'Broadcast a tiny amount, then wait for confirmation.' },
  ],
};

const yearBase =
  'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black shadow-sm transition cursor-pointer';
const yearIdle =
  'border-slate-200 bg-white text-slate-700 hover:border-[var(--lesson-accent,#4f46e5)] hover:bg-[var(--lesson-accent,#4f46e5)] hover:text-white dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200';
const yearActive =
  'border-[var(--lesson-accent,#4f46e5)] bg-[var(--lesson-accent,#4f46e5)] text-white shadow-md';

export function DetailTimelineWidget({ preset }: { preset?: string }) {
  const events = DETAIL_TIMELINES[preset || 'blockchain'] || DETAIL_TIMELINES.blockchain;
  const [active, setActive] = useState(0);
  const e = events[active];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="relative pl-2">
        {/* Line centered through the 40px year badges (left-2 + 20px = center) */}
        <div
          className="absolute left-[1.25rem] top-5 bottom-5 w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-[var(--lesson-accent,#6366f1)] via-violet-400 to-emerald-400"
          aria-hidden
        />
        <div className="relative space-y-0">
          {events.map((ev, i) => (
            <button
              key={ev.y}
              type="button"
              onClick={() => setActive(i)}
              className="relative mb-4 flex w-full cursor-pointer gap-4 text-left last:mb-0"
            >
              <div className={`${yearBase} ${i === active ? yearActive : yearIdle}`}>{ev.y}</div>
              <div
                className={`min-w-0 flex-1 rounded-2xl border p-3 transition ${
                  i === active
                    ? 'border-[color-mix(in_srgb,var(--lesson-accent,#4f46e5)_40%,transparent)] bg-[color-mix(in_srgb,var(--lesson-accent,#4f46e5)_10%,white)] shadow-md dark:bg-[color-mix(in_srgb,var(--lesson-accent,#4f46e5)_18%,#0f172a)]'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="text-sm font-black text-slate-900 dark:text-white">{ev.t}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lesson-accent,#4f46e5)]">
          Historical timeline detail
        </span>
        <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{e.t}</h3>
        <p className="mt-1 text-sm font-semibold text-[var(--lesson-accent,#4f46e5)]">{e.subtitle}</p>
        <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{e.body}</p>
        {e.extra && (
          <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">
            {e.extra}
          </p>
        )}
      </div>
    </div>
  );
}

export function HorizontalTimelineWidget({ preset }: { preset?: string }) {
  const events = DETAIL_TIMELINES[preset || 'blockchain'] || DETAIL_TIMELINES.blockchain;
  const [active, setActive] = useState(0);
  const e = events[active];

  return (
    <div className="space-y-5">
      <div className="relative overflow-x-auto pt-3 pb-2">
        {/* Line through vertical center of year circles (pt-3 + 20px) */}
        <div
          className="absolute left-6 right-6 top-[2.125rem] h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-[var(--lesson-accent,#6366f1)] via-violet-400 to-emerald-400"
          aria-hidden
        />
        <div className="relative flex min-w-max gap-2 px-2">
          {events.map((ev, i) => (
            <button
              key={ev.y}
              type="button"
              onClick={() => setActive(i)}
              className="flex w-36 cursor-pointer flex-col items-center gap-2"
            >
              <span className={`${yearBase} ${i === active ? yearActive : yearIdle}`}>{ev.y}</span>
              <span
                className={`text-center text-[11px] font-bold leading-tight transition ${
                  i === active
                    ? 'text-[var(--lesson-accent,#4f46e5)]'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {ev.t}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lesson-accent,#4f46e5)]">
          Timeline focus
        </span>
        <h4 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{e.t}</h4>
        <p className="mt-1 text-xs font-semibold text-[var(--lesson-accent,#4f46e5)]">{e.subtitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{e.body}</p>
      </div>
    </div>
  );
}

export function TimelineWidget({ preset }: { preset?: string }) {
  if (!preset || preset === 'blockchain') {
    return <DetailTimelineWidget preset="blockchain" />;
  }
  const events = STEP_PRESETS[preset] || STEP_PRESETS['wallet-setup'];
  return (
    <div className="relative pl-2">
      <div
        className="absolute left-[1.25rem] top-5 bottom-5 w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-[var(--lesson-accent,#6366f1)] via-violet-400 to-emerald-400"
        aria-hidden
      />
      <div className="relative">
        {events.map((e) => (
          <div key={`${e.y}-${e.t}`} className="relative mb-6 flex gap-4 last:mb-0">
            <div className={`${yearBase} ${yearIdle} pointer-events-none`}>{e.y}</div>
            <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-sm font-black text-slate-900 dark:text-white">{e.t}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{e.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
