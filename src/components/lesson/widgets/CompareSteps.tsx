import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ExpandableShell } from '../ExpandableShell';

const STEPS = [
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

export function CompareStepsWidget() {
  const [step, setStep] = useState(0);
  const s = STEPS[step];

  return (
    <ExpandableShell title="BTC ↔ ETH comparison" bodyClassName="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((v) => Math.max(0, v - 1))}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Step {step + 1} / {STEPS.length} · {s.label}
        </span>
        <button
          type="button"
          disabled={step === STEPS.length - 1}
          onClick={() => setStep((v) => Math.min(STEPS.length - 1, v + 1))}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

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
          className="animate-[slide-in_0.35s_ease-out] rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-indigo-700/40 dark:from-indigo-950/30 dark:to-slate-900"
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
            Ethereum
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">{s.eth}</p>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-1.5">
        {STEPS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className={`h-1.5 cursor-pointer rounded-full transition-all ${
              i === step ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
            }`}
          />
        ))}
      </div>
    </ExpandableShell>
  );
}
