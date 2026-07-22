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

export function DetailTimelineWidget({ preset }: { preset?: string }) {
  const events = DETAIL_TIMELINES[preset || 'blockchain'] || DETAIL_TIMELINES.blockchain;
  const [active, setActive] = useState(0);
  const e = events[active];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="relative space-y-0 pl-2">
        <div className="absolute bottom-2 left-[19px] top-2 w-0.5 bg-gradient-to-b from-indigo-500 via-violet-400 to-emerald-400" />
        {events.map((ev, i) => (
          <button
            key={ev.y}
            type="button"
            onClick={() => setActive(i)}
            className={`relative mb-4 flex w-full cursor-pointer gap-4 text-left last:mb-0 ${
              i === active ? 'opacity-100' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black shadow-sm ${
                i === active
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-indigo-200 bg-white text-indigo-700 dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-300'
              }`}
            >
              {ev.y}
            </div>
            <div
              className={`min-w-0 flex-1 rounded-2xl border p-3 ${
                i === active
                  ? 'border-indigo-300 bg-indigo-50 shadow-md dark:border-indigo-600 dark:bg-indigo-950/40'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="text-sm font-black text-slate-900 dark:text-white">{ev.t}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/80 p-6 shadow-lg dark:border-indigo-900 dark:from-slate-900 dark:to-indigo-950/40">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
          Historical timeline detail
        </span>
        <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{e.t}</h3>
        <p className="mt-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">{e.subtitle}</p>
        <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{e.body}</p>
        {e.extra && (
          <p className="mt-3 border-t border-indigo-100 pt-3 text-sm leading-relaxed text-slate-600 dark:border-indigo-900 dark:text-slate-400">
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
      <div className="relative overflow-x-auto pb-2">
        <div className="absolute left-4 right-4 top-5 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-400 to-emerald-400" />
        <div className="relative flex min-w-max gap-2 px-2">
          {events.map((ev, i) => (
            <button
              key={ev.y}
              type="button"
              onClick={() => setActive(i)}
              className="flex w-36 cursor-pointer flex-col items-center gap-2"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-[10px] font-black ${
                  i === active
                    ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'border-white bg-slate-100 text-slate-600 ring-2 ring-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
                }`}
              >
                {ev.y}
              </span>
              <span
                className={`text-center text-[11px] font-bold leading-tight ${
                  i === active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500'
                }`}
              >
                {ev.t}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
          Timeline focus
        </span>
        <h4 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{e.t}</h4>
        <p className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">{e.subtitle}</p>
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
    <div className="relative space-y-0 pl-2">
      <div className="absolute bottom-2 left-[19px] top-2 w-0.5 bg-gradient-to-b from-indigo-500 via-violet-400 to-emerald-400" />
      {events.map((e) => (
        <div key={`${e.y}-${e.t}`} className="relative flex gap-4 pb-6 last:pb-0">
          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-indigo-200 bg-white text-[10px] font-black text-indigo-700 shadow-sm dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-300">
            {e.y}
          </div>
          <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-black text-slate-900 dark:text-white">{e.t}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{e.d}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
