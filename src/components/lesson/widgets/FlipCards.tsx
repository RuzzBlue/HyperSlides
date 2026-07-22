import { useState } from 'react';
import { Fingerprint, Hash, KeyRound, Network, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Card = {
  front: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  Icon: LucideIcon;
  accent: string;
};

const cards: Card[] = [
  {
    front: 'Hash function',
    eyebrow: 'Integrity',
    title: 'Cryptographic hash',
    subtitle: 'One-way fingerprint',
    body: 'Maps any input to a fixed-length digest. A tiny change avalanches into a totally different output — perfect for tamper evidence.',
    Icon: Hash,
    accent: 'from-sky-500 to-cyan-600',
  },
  {
    front: 'Private key',
    eyebrow: 'Authority',
    title: 'Private key',
    subtitle: 'Signing secret',
    body: 'Secret material that authorizes spends. Anyone who holds it can move the associated funds — never share or screenshot it.',
    Icon: KeyRound,
    accent: 'from-rose-500 to-orange-500',
  },
  {
    front: 'Public address',
    eyebrow: 'Receive',
    title: 'Public address',
    subtitle: 'Safe to publish',
    body: 'Derived from keys and used only to receive. Share it like an account number — it cannot authorize an outgoing spend by itself.',
    Icon: Fingerprint,
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    front: 'Consensus',
    eyebrow: 'Agreement',
    title: 'Network consensus',
    subtitle: 'Shared history',
    body: 'How peers agree on one ledger tip without a central referee — the foundation of decentralized settlement.',
    Icon: Network,
    accent: 'from-violet-500 to-indigo-600',
  },
];

export function FlipCardsWidget() {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((c, i) => {
        const Icon = c.Icon;
        return (
          <button
            key={c.front}
            type="button"
            onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
            className="group relative h-44 cursor-pointer [perspective:1200px]"
          >
            <div
              className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
                flipped[i] ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-indigo-50/60 p-5 shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md [backface-visibility:hidden] dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-500">
                    Tap to flip
                  </span>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${c.accent} text-white shadow-md`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <span className="text-left text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  {c.front}
                </span>
              </div>
              <div
                className={`absolute inset-0 flex flex-col rounded-2xl bg-gradient-to-br ${c.accent} p-5 text-left text-white shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 opacity-80" />
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] opacity-90">
                    {c.eyebrow}
                  </span>
                </div>
                <h4 className="mt-2 text-base font-black tracking-tight">{c.title}</h4>
                <p className="text-xs font-semibold text-white/85">{c.subtitle}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-white/95">{c.body}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
