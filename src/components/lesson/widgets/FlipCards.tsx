import { useState } from 'react';

export function FlipCardsWidget() {
  const cards = [
    {
      front: 'Hash function',
      back: 'Maps any input to a fixed-length digest. Tiny input changes avalanche into a totally different output.',
    },
    {
      front: 'Private key',
      back: 'Secret material that authorizes spends. Anyone with it can move the associated funds.',
    },
    {
      front: 'Public address',
      back: 'Safe to share — like an account number. Derived from keys; used only to receive.',
    },
    {
      front: 'Consensus',
      back: 'How a network of peers agrees on a single shared history without a central referee.',
    },
  ];
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((c, i) => (
        <button
          key={c.front}
          type="button"
          onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
          className="group relative h-36 cursor-pointer [perspective:1000px]"
        >
          <div
            className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
              flipped[i] ? '[transform:rotateY(180deg)]' : ''
            }`}
          >
            <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm [backface-visibility:hidden] dark:border-indigo-800 dark:from-indigo-950 dark:to-slate-900">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-500">
                Tap to flip
              </span>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {c.front}
              </span>
            </div>
            <div className="absolute inset-0 flex items-center rounded-2xl border border-indigo-200 bg-indigo-600 p-5 text-left text-sm leading-relaxed text-white shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
              {c.back}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
