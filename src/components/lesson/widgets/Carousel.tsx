import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  ShieldCheck,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react';
import { ExpandableShell } from '../ExpandableShell';

const PRESETS: Record<string, { title: string; body: string; Icon: LucideIcon; cue: string }[]> = {
  confirm: [
    {
      title: '1 · Broadcast',
      body: 'A signed transaction is shared with network peers and enters the mempool.',
      Icon: Radio,
      cue: 'Your wallet → network gossip',
    },
    {
      title: '2 · Validate',
      body: 'Nodes check signatures, balances, and protocol rules before inclusion.',
      Icon: ShieldCheck,
      cue: 'Rules before rewards',
    },
    {
      title: '3 · Confirm',
      body: 'The tx lands in a block. Extra confirmations deepen confidence in finality.',
      Icon: BadgeCheck,
      cue: 'Block → more blocks on top',
    },
  ],
};

export function CarouselWidget({ preset }: { preset?: string }) {
  const slides = PRESETS[preset || 'confirm'] || PRESETS.confirm;
  const [i, setI] = useState(0);
  const slide = slides[i];
  const Icon = slide.Icon;

  return (
    <ExpandableShell title="How a transaction lands on-chain" bodyClassName="relative">
      <div className="relative min-h-[200px] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-[color-mix(in_srgb,var(--lesson-accent,#4f46e5)_45%,#0f172a)] p-6 text-white">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <Icon className="h-8 w-8 text-[color-mix(in_srgb,var(--lesson-accent,#a5b4fc)_80%,white)]" />
          </div>
          <div className="min-w-0 flex-1 pr-16">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
              {slide.cue}
            </div>
            <h4 className="mt-1 text-xl font-black tracking-tight">{slide.title}</h4>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-200">{slide.body}</p>
            <div className="mt-4 flex gap-2">
              {slides.map((s, idx) => {
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
            onClick={() => setI((v) => (v - 1 + slides.length) % slides.length)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setI((v) => (v + 1) % slides.length)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex justify-center gap-1.5 bg-slate-50 px-4 py-3 dark:bg-slate-950">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setI(idx)}
            className={`h-1.5 cursor-pointer rounded-full transition-all ${
              idx === i
                ? 'w-6 bg-[var(--lesson-accent,#4f46e5)]'
                : 'w-1.5 bg-slate-300 dark:bg-slate-600'
            }`}
          />
        ))}
      </div>
    </ExpandableShell>
  );
}
