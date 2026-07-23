import { useState } from 'react';
import {
  Fingerprint,
  Hash,
  KeyRound,
  Network,
  Shield,
  Lock,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

type Card = {
  front: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  Icon: LucideIcon;
  accent: string;
};

const GRID_CARDS: Card[] = [
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

const ICON_CARDS: Card[] = [
  {
    front: 'Seed phrase',
    eyebrow: 'Backup',
    title: 'Recovery phrase',
    subtitle: 'Human-readable secret',
    body: 'Usually 12 or 24 words that regenerate your keys. Write it offline, store it safely, never type it into a website.',
    Icon: Lock,
    accent: 'from-teal-500 to-emerald-600',
  },
  {
    front: 'Hot wallet',
    eyebrow: 'Access',
    title: 'Software wallet',
    subtitle: 'Connected to the net',
    body: 'Convenient for day-to-day amounts. Keep only what you need online; move larger balances to colder storage.',
    Icon: Wallet,
    accent: 'from-indigo-500 to-violet-600',
  },
];

function FlipFace({
  card,
  flipped,
  onFlip,
  tall,
}: {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  tall?: boolean;
}) {
  const Icon = card.Icon;
  return (
    <button
      type="button"
      onClick={onFlip}
      className={`group relative w-full cursor-pointer [perspective:1200px] ${tall ? 'h-56' : 'h-44'}`}
    >
      <div
        className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-teal-50/50 p-5 shadow-sm [backface-visibility:hidden] dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
              Tap to flip
            </span>
            <span
              className={`flex items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${card.accent} ${
                tall ? 'h-12 w-12' : 'h-9 w-9'
              }`}
            >
              <Icon className={tall ? 'h-6 w-6' : 'h-4 w-4'} />
            </span>
          </div>
          <span className={`text-left font-black tracking-tight text-slate-900 dark:text-white ${tall ? 'text-2xl' : 'text-lg'}`}>
            {card.front}
          </span>
        </div>
        <div
          className={`absolute inset-0 flex flex-col rounded-2xl bg-gradient-to-br p-5 text-left text-white shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] ${card.accent}`}
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 opacity-80" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] opacity-90">{card.eyebrow}</span>
          </div>
          <h4 className="mt-2 text-base font-black tracking-tight">{card.title}</h4>
          <p className="text-xs font-semibold text-white/85">{card.subtitle}</p>
          <p className="mt-2 text-[12px] leading-relaxed text-white/95">{card.body}</p>
        </div>
      </div>
    </button>
  );
}

function RichFlipCard() {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      className="group relative h-72 w-full cursor-pointer [perspective:1400px] sm:h-80"
    >
      <div
        className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm [backface-visibility:hidden] dark:border-slate-700 dark:bg-slate-900">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700 dark:text-teal-400">
              Rich flip · topic card
            </span>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              What is finality?
            </h3>
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
              Tap to flip for a fuller explanation — definitions, nuance, and a short checklist.
            </p>
          </div>
          <p className="text-xs font-bold text-slate-400">Front · teaser</p>
        </div>
        <div className="absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 to-slate-900 p-6 text-left text-white shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-200">Back · rich explanation</span>
          <h4 className="mt-2 text-xl font-black">Finality, in practice</h4>
          <p className="mt-2 text-sm leading-relaxed text-teal-50/95">
            <strong>Finality</strong> is confidence that a confirmed transaction will not be reversed under normal
            network assumptions. Probabilistic chains deepen confidence with each block; some systems offer economic
            finality after a checkpoint.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-teal-50/90">
            <li>· Wait for the confirmations your risk model requires</li>
            <li>· Prefer reputable explorers for status, not random DMs</li>
            <li>· Large transfers: consider a test send first</li>
          </ul>
          <p className="mt-3 text-xs text-teal-200/80">Tap again to return.</p>
        </div>
      </div>
    </button>
  );
}

function ImageFlipCard() {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="relative h-72 w-full [perspective:1400px] sm:h-80">
      <div
        className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="absolute inset-0 cursor-pointer overflow-hidden rounded-2xl border border-slate-200 shadow-sm [backface-visibility:hidden] dark:border-slate-700"
        >
          <img
            src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=800&fit=crop&q=80"
            alt="Ledger visualization"
            className="h-full w-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent p-5 text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">Image flip</span>
            <p className="mt-1 text-lg font-black text-white">Distributed ledger</p>
            <p className="text-xs text-white/75">Tap to read the long description</p>
          </div>
        </button>
        <div className="absolute inset-0 flex flex-col rounded-2xl border border-slate-200 bg-white text-left shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
              Back · scrollable
            </span>
            <button
              type="button"
              className="cursor-pointer rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setFlipped(false)}
            >
              Flip back
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <h4 className="text-base font-black text-slate-900 dark:text-white">How shared ledgers stay in sync</h4>
            <p className="mt-2">
              A blockchain is a replicated state machine: each honest peer applies the same ordered transactions and
              arrives at the same balances. Forks happen when peers temporarily disagree on the tip; consensus rules
              decide which history wins.
            </p>
            <p className="mt-3">
              Light clients may trust headers or proofs instead of downloading every byte. Full nodes verify
              everything they can. Exchanges and custodians often run their own infrastructure because incorrect
              balances are a business risk, not just a curiosity.
            </p>
            <p className="mt-3">
              When you “check a confirmation,” you are asking how deep your transaction sits under subsequent blocks —
              and therefore how expensive a reorganization would need to be to undo it. That cost is the practical
              meaning of security for most users.
            </p>
            <p className="mt-3">
              Scroll continues here on purpose: image-backed flip cards are useful when the reverse side must hold more
              than a single paragraph — glossary notes, caveats, and facilitator talking points without leaving the
              slide.
            </p>
            <p className="mt-3 pb-2">
              Tip: keep the front visual memorable; put the dense copy on the back where scrolling is expected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FlipCardsWidget({ preset }: { preset?: string }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const mode = preset || 'grid';

  if (mode === 'icons') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {ICON_CARDS.map((c, i) => (
          <FlipFace
            key={c.front}
            card={c}
            tall
            flipped={!!flipped[i]}
            onFlip={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
          />
        ))}
      </div>
    );
  }

  if (mode === 'rich') return <RichFlipCard />;
  if (mode === 'image') return <ImageFlipCard />;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {GRID_CARDS.map((c, i) => (
        <FlipFace
          key={c.front}
          card={c}
          flipped={!!flipped[i]}
          onFlip={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
        />
      ))}
    </div>
  );
}
