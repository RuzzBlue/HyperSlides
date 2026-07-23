import { useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  ShieldCheck,
  BadgeCheck,
  Search,
  type LucideIcon,
} from 'lucide-react';

type IconStep = {
  title: string;
  body: string;
  cue: string;
  Icon: LucideIcon;
};

const ICON_STEPS: IconStep[] = [
  {
    title: 'Discover',
    cue: 'Step 1 · Find the path',
    body: 'Start from a trusted bookmark. Confirm the network and asset before you touch any form fields.',
    Icon: Search,
  },
  {
    title: 'Broadcast',
    cue: 'Step 2 · Share the signed tx',
    body: 'Your wallet publishes the signed payload to peers. It sits in the mempool until a block includes it.',
    Icon: Radio,
  },
  {
    title: 'Validate',
    cue: 'Step 3 · Rules before rewards',
    body: 'Nodes check signatures, balances, and protocol rules. Invalid work is dropped without drama.',
    Icon: ShieldCheck,
  },
  {
    title: 'Confirm',
    cue: 'Step 4 · Depth builds trust',
    body: 'Inclusion in a block is the first win. Extra confirmations make a reorganization increasingly unlikely.',
    Icon: BadgeCheck,
  },
];

type CompactStep = { title: string; body: string };

const COMPACT_STEPS: CompactStep[] = [
  {
    title: 'Prepare the destination',
    body: 'Copy the receive address from the other wallet. Prefer paste over typing. Match the network badge.',
  },
  {
    title: 'Set a safe amount',
    body: 'Leave room for fees. For a first send to a new address, start with a dust-sized test.',
  },
  {
    title: 'Read the preview twice',
    body: 'Asset, network, amount, fee, and recipient must match your notes. Anything odd → cancel.',
  },
  {
    title: 'Sign only when sure',
    body: 'Approve on the device or in-app prompt. Save the transaction hash for the explorer check.',
  },
];

type CodeStep = {
  title: string;
  description: string;
  file: string;
  code: ReactNode;
};

const CODE_STEPS: CodeStep[] = [
  {
    title: 'Declare the payload',
    description:
      'We start with a plain object that describes what we want to send. No network call yet — just data you can inspect.',
    file: 'demo.js · declare',
    code: (
      <>
        <span className="tok-comment">{'// Step 1 — shape the intent before signing'}</span>
        {'\n'}
        <span className="tok-key">const</span> transfer <span className="tok-op">=</span> {'{'}
        {'\n'}
        {'  '}asset: <span className="tok-str">"ETH"</span>,
        {'\n'}
        {'  '}network: <span className="tok-str">"mainnet"</span>,
        {'\n'}
        {'  '}to: <span className="tok-str">"0xabc…"</span>,
        {'\n'}
        {'  '}amount: <span className="tok-str">"0.05"</span>,
        {'\n'}
        {'}'};{'\n'}
      </>
    ),
  },
  {
    title: 'Estimate the fee',
    description:
      'Ask the provider for a fee suggestion. Surface it in the UI so the learner sees cost before commitment.',
    file: 'demo.js · fee',
    code: (
      <>
        <span className="tok-comment">{'// Step 2 — quote a fee the user can refuse'}</span>
        {'\n'}
        <span className="tok-key">const</span> fee <span className="tok-op">=</span>{' '}
        <span className="tok-key">await</span> <span className="tok-fn">estimateFee</span>(transfer);
        {'\n'}
        <span className="tok-fn">console</span>.log(<span className="tok-str">"max fee"</span>, fee.max);
        {'\n'}
        <span className="tok-key">if</span> (fee.max <span className="tok-op">&gt;</span> budget) {'{'}
        {'\n'}
        {'  '}
        <span className="tok-key">throw</span> <span className="tok-key">new</span> Error(
        <span className="tok-str">"fee too high"</span>);
        {'\n'}
        {'}'}
        {'\n'}
      </>
    ),
  },
  {
    title: 'Sign the transaction',
    description:
      'Signing proves authority without revealing the private key to the dapp page. Keep this step explicit and cancellable.',
    file: 'demo.js · sign',
    code: (
      <>
        <span className="tok-comment">{'// Step 3 — user gesture required'}</span>
        {'\n'}
        <span className="tok-key">const</span> signed <span className="tok-op">=</span>{' '}
        <span className="tok-key">await</span> wallet.<span className="tok-fn">sign</span>({'{'}
        {'\n'}
        {'  '}...transfer,
        {'\n'}
        {'  '}fee,
        {'\n'}
        {'}'});
        {'\n'}
        <span className="tok-comment">{'// signed.raw is opaque hex — never edit by hand'}</span>
        {'\n'}
      </>
    ),
  },
  {
    title: 'Broadcast and watch',
    description:
      'Push the signed payload to the network, then poll (or subscribe) until you see a confirmation depth you trust.',
    file: 'demo.js · send',
    code: (
      <>
        <span className="tok-comment">{'// Step 4 — publish, then verify on an explorer'}</span>
        {'\n'}
        <span className="tok-key">const</span> hash <span className="tok-op">=</span>{' '}
        <span className="tok-key">await</span> <span className="tok-fn">broadcast</span>(signed.raw);
        {'\n'}
        <span className="tok-key">await</span> <span className="tok-fn">waitForConfirmations</span>(hash,{' '}
        <span className="tok-op">3</span>);
        {'\n'}
        <span className="tok-fn">echo</span> <span className="tok-str">"settled:"</span>, hash;
        {'\n'}
      </>
    ),
  },
];

function IconCardSteps() {
  const [i, setI] = useState(0);
  const step = ICON_STEPS[i];
  const Icon = step.Icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 p-6 text-white dark:border-slate-700">
      <div className="flex flex-col gap-4 pr-28 sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
          <Icon className="h-8 w-8 text-teal-200" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">{step.cue}</p>
          <h3 className="mt-1 text-xl font-black tracking-tight">{step.title}</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-200">{step.body}</p>
          <div className="mt-4 flex gap-2">
            {ICON_STEPS.map((s, idx) => {
              const StepIcon = s.Icon;
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setI(idx)}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition ${
                    idx === i ? 'bg-white text-slate-900' : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                  title={s.title}
                >
                  <StepIcon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          type="button"
          onClick={() => setI((v) => (v - 1 + ICON_STEPS.length) % ICON_STEPS.length)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
          aria-label="Previous step"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setI((v) => (v + 1) % ICON_STEPS.length)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
          aria-label="Next step"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CompactCountSteps() {
  const [i, setI] = useState(0);
  const step = COMPACT_STEPS[i];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          disabled={i === 0}
          onClick={() => setI((v) => Math.max(0, v - 1))}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={i === COMPACT_STEPS.length - 1}
          onClick={() => setI((v) => Math.min(COMPACT_STEPS.length - 1, v + 1))}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-700 disabled:opacity-30 dark:border-slate-600 dark:text-slate-200"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="ms-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-black tabular-nums tracking-wide text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
          {i + 1}/{COMPACT_STEPS.length} steps
        </span>
      </div>

      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
        Compact walkthrough
      </p>
      <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">{step.title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.body}</p>

      <div className="mt-5 flex gap-1.5">
        {COMPACT_STEPS.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setI(idx)}
            className={`h-1.5 cursor-pointer rounded-full transition-all ${
              idx === i ? 'w-7 bg-teal-700' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
            }`}
            aria-label={`Go to step ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function CodeWalkSteps() {
  const [i, setI] = useState(0);
  const step = CODE_STEPS[i];

  return (
    <div className="relative grid gap-5 md:grid-cols-2 md:items-stretch">
      <div className="flex flex-col justify-center pe-2 pb-14 md:pb-12">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
          Code walkthrough
        </span>
        <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{step.description}</p>
      </div>

      <div className="hc-terminal min-h-[14rem]">
        <div className="hc-terminal__bar">
          <span>{step.file}</span>
          <span style={{ color: '#818cf8' }}>
            {i + 1}/{CODE_STEPS.length}
          </span>
        </div>
        <pre>{step.code}</pre>
      </div>

      <div className="absolute bottom-0 left-0 flex items-center gap-2">
        <button
          type="button"
          disabled={i === 0}
          onClick={() => setI((v) => Math.max(0, v - 1))}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button
          type="button"
          disabled={i === CODE_STEPS.length - 1}
          onClick={() => setI((v) => Math.min(CODE_STEPS.length - 1, v + 1))}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          Part {i + 1} of {CODE_STEPS.length}
        </span>
      </div>
    </div>
  );
}

export function StepShowcaseWidget({ preset }: { preset?: string }) {
  if (preset === 'compact-count') return <CompactCountSteps />;
  if (preset === 'code-walk') return <CodeWalkSteps />;
  return <IconCardSteps />;
}
