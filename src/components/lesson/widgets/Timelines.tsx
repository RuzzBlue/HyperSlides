import { useMemo, type ReactNode } from 'react';
import { Check, Lock, Play } from 'lucide-react';
import { attr, childText, field, hasMountItems, queryMountItems } from './mountData';
import { useClampedIndex } from './useMountItems';

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

type TrailStep = {
  id: string;
  title: string;
  tipTitle: string;
  tipSub: string;
  tipBody: string;
  tipItems: string[];
};

const TRAIL_STEPS: TrailStep[] = [
  {
    id: 'discover',
    title: 'Discover',
    tipTitle: 'Start from a trusted entry',
    tipSub: 'Step 1 of the trail',
    tipBody: 'Open the wallet from a bookmark you created yourself — never from a cold search result or DM link.',
    tipItems: ['Official store / vendor', 'Bookmark the real URL', 'Ignore lookalike domains'],
  },
  {
    id: 'verify',
    title: 'Verify',
    tipTitle: 'Confirm network & asset',
    tipSub: 'Step 2 of the trail',
    tipBody: 'Match the network badge and ticker before you touch amounts. Wrong chain = stuck or lost funds.',
    tipItems: ['Network badge visible', 'Asset ticker matches', 'Cancel if anything feels off'],
  },
  {
    id: 'address',
    title: 'Address',
    tipTitle: 'Paste, then re-check',
    tipSub: 'Step 3 of the trail',
    tipBody: 'Paste the destination once, then compare the first and last characters against your notes.',
    tipItems: ['Prefer paste over typing', 'Check first 4 + last 4', 'No address from strangers'],
  },
  {
    id: 'amount',
    title: 'Amount',
    tipTitle: 'Start tiny on new paths',
    tipSub: 'Step 4 of the trail',
    tipBody: 'Send a dust-sized test first when the destination is new. Scale up only after confirmation.',
    tipItems: ['Leave room for fees', 'Test before large sends', 'Note the tx hash'],
  },
  {
    id: 'review',
    title: 'Review',
    tipTitle: 'Read the preview twice',
    tipSub: 'Step 5 of the trail',
    tipBody: 'Asset, network, amount, fee, and recipient must match your intent. Anything odd → cancel.',
    tipItems: ['Recipient matches', 'Fee understood', 'No seed phrase fields'],
  },
  {
    id: 'sign',
    title: 'Sign',
    tipTitle: 'Approve only when sure',
    tipSub: 'Step 6 of the trail',
    tipBody: 'Signing proves authority. After broadcast, watch the explorer until you trust the confirmation depth.',
    tipItems: ['Hardware confirm if used', 'Save the hash', 'Wait for confirmations'],
  },
];

/** Circle is h-10 w-10 (2.5rem). Line must sit at horizontal center = 1.25rem from column start. */
const yearBase =
  'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black shadow-sm transition cursor-pointer';
const yearIdle =
  'border-slate-200 bg-white text-slate-700 hover:border-[var(--lesson-accent,#0e6e6a)] hover:bg-[var(--lesson-accent,#0e6e6a)] hover:text-white dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200';
const yearActive =
  'border-[var(--lesson-accent,#0e6e6a)] bg-[var(--lesson-accent,#0e6e6a)] text-white shadow-md';

function VerticalRail({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {/* Center of 2.5rem circle = left 1.25rem; 2px line half-shifted */}
      <div
        className="absolute left-5 top-5 bottom-5 w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-[var(--lesson-accent,#0e6e6a)] via-teal-400 to-emerald-400"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function parseDetailEvents(host: HTMLElement | null | undefined, preset?: string): TimelineDetail[] {
  if (host && hasMountItems(host)) {
    return queryMountItems(host).map((el, i) => ({
      y: attr(el, 'data-y') || String(i + 1).padStart(2, '0'),
      t: field(el, { attr: 'data-title', child: '[data-title]' }) || 'Event',
      subtitle: attr(el, 'data-subtitle') || childText(el, '[data-subtitle]') || '',
      body: childText(el, '[data-body]') || attr(el, 'data-body') || '',
      extra: childText(el, '[data-extra]') || attr(el, 'data-extra') || undefined,
    }));
  }
  return DETAIL_TIMELINES[preset || 'blockchain'] || DETAIL_TIMELINES.blockchain;
}

function parseStepEvents(host: HTMLElement | null | undefined, preset?: string) {
  if (host && hasMountItems(host)) {
    return queryMountItems(host).map((el, i) => ({
      y: attr(el, 'data-y') || String(i + 1).padStart(2, '0'),
      t: field(el, { attr: 'data-title', child: '[data-title]' }) || 'Step',
      d: childText(el, '[data-body]') || attr(el, 'data-body') || '',
    }));
  }
  return STEP_PRESETS[preset || 'wallet-setup'] || STEP_PRESETS['wallet-setup'];
}

function parseTrailSteps(host: HTMLElement | null | undefined): TrailStep[] {
  if (host && hasMountItems(host)) {
    return queryMountItems(host).map((el, i) => {
      const tipList = el.querySelector('ul[data-tip-items]');
      const tipItems = tipList
        ? Array.from(tipList.querySelectorAll('li')).map((li) => (li.textContent || '').trim()).filter(Boolean)
        : [];
      return {
        id: attr(el, 'data-id') || `step-${i + 1}`,
        title: field(el, { attr: 'data-title', child: '[data-title]' }) || `Step ${i + 1}`,
        tipTitle: attr(el, 'data-tip-title') || field(el, { attr: 'data-title' }) || 'Tip',
        tipSub: attr(el, 'data-tip-sub') || `Step ${i + 1} of the trail`,
        tipBody: childText(el, '[data-body]') || attr(el, 'data-body') || '',
        tipItems,
      };
    });
  }
  return TRAIL_STEPS;
}

export function DetailTimelineWidget({
  preset,
  host,
}: {
  preset?: string;
  host?: HTMLElement | null;
}) {
  const events = useMemo(() => parseDetailEvents(host, preset), [host, preset]);
  const [active, setActive] = useClampedIndex(events.length);
  const e = events[active] ?? events[0];
  if (!e) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <VerticalRail>
        {events.map((ev, i) => (
          <button
            key={`${ev.y}-${ev.t}-${i}`}
            type="button"
            onClick={() => setActive(i)}
            className="relative mb-4 flex w-full cursor-pointer gap-4 text-left last:mb-0"
          >
            <div className={`${yearBase} ${i === active ? yearActive : yearIdle}`}>{ev.y}</div>
            <div
              className={`min-w-0 flex-1 rounded-2xl border p-3 transition ${
                i === active
                  ? 'border-[color-mix(in_srgb,var(--lesson-accent,#0e6e6a)_40%,transparent)] bg-[color-mix(in_srgb,var(--lesson-accent,#0e6e6a)_10%,white)] shadow-md dark:bg-[color-mix(in_srgb,var(--lesson-accent,#0e6e6a)_18%,#0f172a)]'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="text-sm font-black text-slate-900 dark:text-white">{ev.t}</div>
            </div>
          </button>
        ))}
      </VerticalRail>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lesson-accent,#0e6e6a)]">
          Historical timeline detail
        </span>
        <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{e.t}</h3>
        <p className="mt-1 text-sm font-semibold text-[var(--lesson-accent,#0e6e6a)]">{e.subtitle}</p>
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

export function HorizontalTimelineWidget({
  preset,
  host,
}: {
  preset?: string;
  host?: HTMLElement | null;
}) {
  const events = useMemo(() => parseDetailEvents(host, preset), [host, preset]);
  const [active, setActive] = useClampedIndex(events.length);
  const e = events[active] ?? events[0];
  if (!e) return null;

  return (
    <div className="space-y-5">
      <div className="relative overflow-x-auto pt-3 pb-2">
        {/* pt-3 (0.75rem) + half circle (1.25rem) = 2rem */}
        <div
          className="absolute left-6 right-6 top-8 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-[var(--lesson-accent,#0e6e6a)] via-teal-400 to-emerald-400"
          aria-hidden
        />
        <div className="relative flex min-w-max gap-2 px-2">
          {events.map((ev, i) => (
            <button
              key={`${ev.y}-${ev.t}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className="flex w-36 cursor-pointer flex-col items-center gap-2"
            >
              <span className={`${yearBase} ${i === active ? yearActive : yearIdle}`}>{ev.y}</span>
              <span
                className={`text-center text-[11px] font-bold leading-tight transition ${
                  i === active
                    ? 'text-[var(--lesson-accent,#0e6e6a)]'
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
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lesson-accent,#0e6e6a)]">
          Timeline focus
        </span>
        <h4 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{e.t}</h4>
        <p className="mt-1 text-xs font-semibold text-[var(--lesson-accent,#0e6e6a)]">{e.subtitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{e.body}</p>
      </div>
    </div>
  );
}

export function TimelineWidget({
  preset,
  host,
}: {
  preset?: string;
  host?: HTMLElement | null;
}) {
  const isDetail = !preset || preset === 'blockchain';
  const events = useMemo(
    () => (isDetail ? [] : parseStepEvents(host, preset)),
    [host, preset, isDetail],
  );

  // Pass host through to Detail when no step preset.
  if (isDetail) {
    return <DetailTimelineWidget preset="blockchain" host={host} />;
  }

  return (
    <VerticalRail>
      {events.map((e, i) => (
        <div key={`${e.y}-${e.t}-${i}`} className="relative mb-6 flex gap-4 last:mb-0">
          <div className={`${yearBase} ${yearIdle} pointer-events-none`}>{e.y}</div>
          <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-black text-slate-900 dark:text-white">{e.t}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{e.d}</p>
          </div>
        </div>
      ))}
    </VerticalRail>
  );
}

/** Snake trail: left→right, down, right→left, … Click to complete; unlocks next. Rich tip on hover. */
export function TrailTimelineWidget({ host }: { host?: HTMLElement | null }) {
  const steps = useMemo(() => parseTrailSteps(host), [host]);
  const [completed, setCompleted] = useClampedIndex(steps.length + 1, 0);
  const [active, setActive] = useClampedIndex(steps.length);

  const onActivate = (i: number) => {
    if (i > completed) return;
    setActive(i);
    if (i === completed) {
      setCompleted((c) => Math.min(c + 1, steps.length));
    }
  };

  const reset = () => {
    setCompleted(0);
    setActive(0);
  };

  if (!steps.length) return null;
  const focus = steps[Math.min(active, steps.length - 1)];

  return (
    <div className="hc-trail">
      <div className="hc-trail__header">
        <div>
          <p className="hc-trail__eyebrow">Unlock trail</p>
          <p className="hc-trail__status">
            {completed >= steps.length
              ? 'Trail complete — every step unlocked'
              : `Click step ${completed + 1} to unlock the next`}
          </p>
        </div>
        <button type="button" className="hc-trail__reset" onClick={reset}>
          Reset trail
        </button>
      </div>

      <div className="hc-trail__board" role="list">
        <svg className="hc-trail__path" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden>
          <path
            d="M 12 12 H 50 H 88 V 36 H 50 H 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {steps.map((step, i) => {
          const unlocked = i <= completed;
          const done = i < completed;
          const current = i === completed && completed < steps.length;
          const tipSide = i % 3 === 0 ? 'hc-tip--right' : i % 3 === 2 ? 'hc-tip--left' : 'hc-tip--top';

          return (
            <div
              key={step.id}
              role="listitem"
              className={`hc-trail__node hc-trail__node--${i} ${done ? 'is-done' : ''} ${
                current ? 'is-current' : ''
              } ${!unlocked ? 'is-locked' : ''}`}
            >
              <button
                type="button"
                className={`hc-tip ${tipSide} hc-tip--rich hc-trail__btn`}
                aria-disabled={!unlocked}
                onClick={() => onActivate(i)}
                aria-label={
                  !unlocked
                    ? `${step.title} locked — complete earlier steps first`
                    : done
                      ? `${step.title} completed — view again`
                      : `Start ${step.title}`
                }
              >
                <span className="hc-trail__badge" aria-hidden>
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : !unlocked ? <Lock className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </span>
                <span className="hc-trail__label">
                  <span className="hc-trail__num">0{i + 1}</span>
                  <span className="hc-trail__title">{step.title}</span>
                </span>
                <span className="hc-tip__bubble hc-tip__bubble--rich" role="tooltip">
                  <strong className="hc-tip__title">{step.tipTitle}</strong>
                  <span className="hc-tip__sub">{step.tipSub}</span>
                  <span className="hc-tip__desc">{step.tipBody}</span>
                  <span className="hc-tip__bold">Checklist</span>
                  <ul>
                    {step.tipItems.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="hc-trail__focus">
        <span className="hc-trail__focus-eyebrow">
          {active < completed ? 'Completed step' : active === completed ? 'Active step' : 'Locked'}
        </span>
        <h4>{focus.tipTitle}</h4>
        <p>{focus.tipBody}</p>
      </div>
    </div>
  );
}
