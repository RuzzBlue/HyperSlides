import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { attr, childText, field, hasMountItems, queryMountItems } from './mountData';
import { useClampedIndex } from './useMountItems';

type CompareStep = { label: string; btc: string; eth: string };

const DEFAULT_STEPS: CompareStep[] = [
  {
    label: 'Purpose',
    btc: 'Digital cash / store of value with a fixed monetary policy.',
    eth: 'Programmable settlement layer for smart contracts and tokens.',
  },
  {
    label: 'Consensus',
    btc: 'Proof-of-Work mining secures the chain.',
    eth: 'Proof-of-Stake validators secure the chain.',
  },
  {
    label: 'Scripting',
    btc: 'Limited scripting focused on payments and covenants.',
    eth: 'Turing-complete EVM enables complex on-chain apps.',
  },
  {
    label: 'Fees',
    btc: 'Fee market for scarce block space (sats/vByte).',
    eth: 'Base fee + tip model (EIP-1559) with L2 scaling paths.',
  },
];

type Nav = 'top' | 'bottom' | 'tl' | 'tr' | 'bl' | 'br';

function resolveNav(preset?: string): Nav {
  if (preset === 'nav-bottom' || preset === 'bottom') return 'bottom';
  if (preset === 'nav-tl' || preset === 'tl') return 'tl';
  if (preset === 'nav-tr' || preset === 'tr') return 'tr';
  if (preset === 'nav-bl' || preset === 'bl') return 'bl';
  if (preset === 'nav-br' || preset === 'br') return 'br';
  return 'top';
}

function parseSteps(host: HTMLElement | null | undefined): CompareStep[] {
  if (host && hasMountItems(host)) {
    return queryMountItems(host).map((el) => {
      const children = Array.from(el.children) as HTMLElement[];
      const btcChild = children.find((c) => attr(c, 'data-side') === 'btc' || /btc|bitcoin/i.test(c.className));
      const ethChild = children.find((c) => attr(c, 'data-side') === 'eth' || /eth|ethereum/i.test(c.className));
      return {
        label: attr(el, 'data-label') || field(el, { attr: 'data-title' }) || 'Step',
        btc: attr(el, 'data-btc') || (btcChild ? (btcChild.textContent || '').trim() : '') || childText(el, '[data-btc]') || '',
        eth: attr(el, 'data-eth') || (ethChild ? (ethChild.textContent || '').trim() : '') || childText(el, '[data-eth]') || '',
      };
    });
  }
  return DEFAULT_STEPS;
}

function NavButtons({
  step,
  setStep,
  align,
  steps,
}: {
  step: number;
  setStep: (n: number | ((v: number) => number)) => void;
  align: 'start' | 'center' | 'end' | 'between';
  steps: CompareStep[];
}) {
  const justify =
    align === 'start'
      ? 'justify-start'
      : align === 'end'
        ? 'justify-end'
        : align === 'between'
          ? 'justify-between'
          : 'justify-center';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${justify}`}>
      <button
        type="button"
        disabled={step === 0}
        onClick={() => setStep((v) => Math.max(0, v - 1))}
        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800"
      >
        <ChevronLeft className="h-4 w-4" /> Prev
      </button>
      <span className="text-[11px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
        Step {step + 1} / {steps.length} · {steps[step]?.label}
      </span>
      <button
        type="button"
        disabled={step === steps.length - 1}
        onClick={() => setStep((v) => Math.min(steps.length - 1, v + 1))}
        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800"
      >
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function CompareStepsWidget({
  preset,
  host,
}: {
  preset?: string;
  host?: HTMLElement | null;
}) {
  const steps = useMemo(() => parseSteps(host), [host]);
  const [step, setStep] = useClampedIndex(steps.length);
  const s = steps[step];
  const nav = resolveNav(preset);

  const navAlign: 'start' | 'center' | 'end' | 'between' =
    nav === 'tl' || nav === 'bl' ? 'start' : nav === 'tr' || nav === 'br' ? 'end' : nav === 'top' ? 'between' : 'end';

  const showNavTop = nav === 'top' || nav === 'tl' || nav === 'tr';
  const showNavBottom = nav === 'bottom' || nav === 'bl' || nav === 'br';

  if (!s) return null;

  return (
    <div className="space-y-4">
      {showNavTop && <NavButtons step={step} setStep={setStep} align={navAlign} steps={steps} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div
          key={`btc-${step}`}
          className="animate-[slide-in_0.35s_ease-out] rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 dark:border-amber-700/40 dark:from-amber-950/30 dark:to-slate-900"
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Bitcoin
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">{s.btc}</p>
        </div>
        <div
          key={`eth-${step}`}
          className="animate-[slide-in_0.35s_ease-out] rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 dark:border-teal-700/40 dark:from-teal-950/30 dark:to-slate-900"
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
            Ethereum
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">{s.eth}</p>
        </div>
      </div>

      <div className="flex justify-center gap-1.5">
        {steps.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className={`h-1.5 cursor-pointer rounded-full transition-all ${
              i === step ? 'w-6 bg-teal-700' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
            }`}
          />
        ))}
      </div>

      {showNavBottom && <NavButtons step={step} setStep={setStep} align={navAlign} steps={steps} />}
    </div>
  );
}
