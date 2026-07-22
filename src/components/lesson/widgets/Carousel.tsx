import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ExpandableShell } from '../ExpandableShell';

const PRESETS: Record<string, { title: string; body: string }[]> = {
  confirm: [
    {
      title: '1 · Broadcast',
      body: 'A signed transaction is shared with network peers and enters the mempool.',
    },
    {
      title: '2 · Validate',
      body: 'Nodes check signatures, balances, and protocol rules before inclusion.',
    },
    {
      title: '3 · Confirm',
      body: 'The tx lands in a block. Extra confirmations deepen confidence in finality.',
    },
  ],
};

export function CarouselWidget({ preset }: { preset?: string }) {
  const slides = PRESETS[preset || 'confirm'] || PRESETS.confirm;
  const [i, setI] = useState(0);

  return (
    <ExpandableShell title="How a transaction lands on-chain" bodyClassName="relative">
      <div className="relative min-h-[180px] bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white">
        <h4 className="text-xl font-black tracking-tight">{slides[i].title}</h4>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-200">{slides[i].body}</p>
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
              idx === i ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
            }`}
          />
        ))}
      </div>
    </ExpandableShell>
  );
}
