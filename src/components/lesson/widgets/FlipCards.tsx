import { useMemo, useState, type ReactNode } from 'react';
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
import { attr, childText, field, hasMountItems, queryMountItems } from './mountData';
import { iconFromMountItem, resolveMountIcon } from './mountIcons';

const ACCENTS = [
  'from-sky-500 to-cyan-600',
  'from-rose-500 to-orange-500',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-indigo-600',
  'from-teal-500 to-emerald-600',
  'from-indigo-500 to-violet-600',
];

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=800&fit=crop&q=80';

type Card = {
  front: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  icon: ReactNode;
  accent: string;
  image?: string;
};

function lucideNode(Icon: LucideIcon, className: string): ReactNode {
  return <Icon className={className} />;
}

const GRID_CARDS: Card[] = [
  {
    front: 'Hash function',
    eyebrow: 'Integrity',
    title: 'Cryptographic hash',
    subtitle: 'One-way fingerprint',
    body: 'Maps any input to a fixed-length digest. A tiny change avalanches into a totally different output — perfect for tamper evidence.',
    icon: lucideNode(Hash, 'h-4 w-4'),
    accent: 'from-sky-500 to-cyan-600',
  },
  {
    front: 'Private key',
    eyebrow: 'Authority',
    title: 'Private key',
    subtitle: 'Signing secret',
    body: 'Secret material that authorizes spends. Anyone who holds it can move the associated funds — never share or screenshot it.',
    icon: lucideNode(KeyRound, 'h-4 w-4'),
    accent: 'from-rose-500 to-orange-500',
  },
  {
    front: 'Public address',
    eyebrow: 'Receive',
    title: 'Public address',
    subtitle: 'Safe to publish',
    body: 'Derived from keys and used only to receive. Share it like an account number — it cannot authorize an outgoing spend by itself.',
    icon: lucideNode(Fingerprint, 'h-4 w-4'),
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    front: 'Consensus',
    eyebrow: 'Agreement',
    title: 'Network consensus',
    subtitle: 'Shared history',
    body: 'How peers agree on one ledger tip without a central referee — the foundation of decentralized settlement.',
    icon: lucideNode(Network, 'h-4 w-4'),
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
    icon: lucideNode(Lock, 'h-4 w-4'),
    accent: 'from-teal-500 to-emerald-600',
  },
  {
    front: 'Hot wallet',
    eyebrow: 'Access',
    title: 'Software wallet',
    subtitle: 'Connected to the net',
    body: 'Convenient for day-to-day amounts. Keep only what you need online; move larger balances to colder storage.',
    icon: lucideNode(Wallet, 'h-4 w-4'),
    accent: 'from-indigo-500 to-violet-600',
  },
];

const RICH_DEFAULT: Card = {
  front: 'What is finality?',
  eyebrow: 'Rich flip · topic card',
  title: 'Finality, in practice',
  subtitle: 'Definitions & checklist',
  body: [
    'Finality is confidence that a confirmed transaction will not be reversed under normal network assumptions.',
    'Probabilistic chains deepen confidence with each block; some systems offer economic finality after a checkpoint.',
    'Wait for the confirmations your risk model requires. Prefer reputable explorers for status, not random DMs.',
    'Large transfers: consider a test send first. Keep facilitator talking points on the back where scrolling is expected.',
  ].join('\n\n'),
  icon: resolveMountIcon('shield', { className: 'h-5 w-5' }),
  accent: 'from-teal-700 to-slate-900',
};

const IMAGE_DEFAULT: Card = {
  front: 'Distributed ledger',
  eyebrow: 'Image flip',
  title: 'How shared ledgers stay in sync',
  subtitle: 'Tap to read the long description',
  body: [
    'A blockchain is a replicated state machine: each honest peer applies the same ordered transactions and arrives at the same balances. Forks happen when peers temporarily disagree on the tip; consensus rules decide which history wins.',
    'Light clients may trust headers or proofs instead of downloading every byte. Full nodes verify everything they can. Exchanges and custodians often run their own infrastructure because incorrect balances are a business risk, not just a curiosity.',
    'When you “check a confirmation,” you are asking how deep your transaction sits under subsequent blocks — and therefore how expensive a reorganization would need to be to undo it. That cost is the practical meaning of security for most users.',
    'Scroll continues here on purpose: image-backed flip cards are useful when the reverse side must hold more than a single paragraph — glossary notes, caveats, and facilitator talking points without leaving the slide.',
    'Tip: keep the front visual memorable; put the dense copy on the back where scrolling is expected.',
  ].join('\n\n'),
  icon: resolveMountIcon('network', { className: 'h-4 w-4' }),
  accent: 'from-slate-800 to-teal-900',
  image: DEFAULT_IMAGE,
};

function BodyParagraphs({ text, className }: { text: string; className?: string }) {
  const parts = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  return (
    <>
      {parts.map((p, i) => (
        <p key={i} className={i === 0 ? className : `mt-3 ${className ?? ''}`}>
          {p}
        </p>
      ))}
    </>
  );
}

/** Compact grid / icon flip — scroll when front or back copy overflows. */
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
  return (
    <div
      className={`relative w-full [perspective:1200px] ${tall ? 'h-56' : 'h-44'}`}
    >
      <div
        className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <button
          type="button"
          onClick={onFlip}
          className="absolute inset-0 flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-teal-50/50 text-left shadow-sm [backface-visibility:hidden] dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/30"
        >
          <div className="flex shrink-0 items-center justify-between px-5 pt-5">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
              Tap to flip
            </span>
            <span
              className={`flex items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${card.accent} ${
                tall ? 'h-12 w-12 [&_svg]:h-6 [&_svg]:w-6' : 'h-9 w-9 [&_svg]:h-4 [&_svg]:w-4'
              }`}
            >
              {card.icon}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">
            <span
              className={`block font-black tracking-tight text-slate-900 dark:text-white ${
                tall ? 'text-2xl' : 'text-lg'
              }`}
            >
              {card.front}
            </span>
          </div>
        </button>

        <div
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br text-left text-white shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] ${card.accent}`}
        >
          <button
            type="button"
            onClick={onFlip}
            className="flex shrink-0 cursor-pointer items-center gap-2 px-5 pt-5 text-left"
          >
            <Shield className="h-4 w-4 opacity-80" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] opacity-90">
              {card.eyebrow}
            </span>
          </button>
          <div
            className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2"
            onClick={onFlip}
            onWheel={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-black tracking-tight">{card.title}</h4>
            {card.subtitle ? (
              <p className="text-xs font-semibold text-white/85">{card.subtitle}</p>
            ) : null}
            <BodyParagraphs text={card.body} className="mt-2 text-[12px] leading-relaxed text-white/95" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full-bleed rich topic card — taller, full width, scrollable back. */
function RichFlipCard({ card }: { card: Card }) {
  const [flipped, setFlipped] = useState(false);
  const flip = () => setFlipped((v) => !v);

  return (
    <div className="relative h-80 w-full [perspective:1400px] sm:h-96">
      <div
        className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        <button
          type="button"
          onClick={flip}
          className="absolute inset-0 flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm [backface-visibility:hidden] dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-6" onWheel={(e) => e.stopPropagation()}>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700 dark:text-teal-400">
              {card.eyebrow || 'Rich flip · topic card'}
            </span>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {card.front}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              {card.subtitle ||
                'Tap to flip for a fuller explanation — definitions, nuance, and a short checklist.'}
            </p>
          </div>
          <p className="shrink-0 px-6 pb-5 text-xs font-bold text-slate-400">Front · teaser</p>
        </button>

        <div
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br text-left text-white shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] ${card.accent || 'from-teal-700 to-slate-900'}`}
        >
          <button
            type="button"
            onClick={flip}
            className="flex shrink-0 cursor-pointer items-center justify-between px-6 pt-6 text-left"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-200">
              Back · rich explanation
            </span>
            <span className="text-xs font-bold text-white/70">Tap to return</span>
          </button>
          <div
            className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3"
            onClick={flip}
            onWheel={(e) => e.stopPropagation()}
          >
            <h4 className="text-xl font-black">{card.title}</h4>
            <BodyParagraphs text={card.body} className="mt-2 text-sm leading-relaxed text-teal-50/95" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full-bleed image front — full width, scrollable reverse. */
function ImageFlipCard({ card }: { card: Card }) {
  const [flipped, setFlipped] = useState(false);
  const src = card.image || DEFAULT_IMAGE;

  return (
    <div className="relative h-80 w-full [perspective:1400px] sm:h-96">
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
            src={src}
            alt={card.front}
            className="h-full w-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[55%] overflow-y-auto bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent p-5 text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">
              {card.eyebrow || 'Image flip'}
            </span>
            <p className="mt-1 text-lg font-black text-white">{card.front}</p>
            <p className="text-xs text-white/75">
              {card.subtitle || 'Tap to read the long description'}
            </p>
          </div>
        </button>

        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-slate-700 dark:bg-slate-900">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
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
          <div
            className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
            onWheel={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-black text-slate-900 dark:text-white">{card.title}</h4>
            <BodyParagraphs text={card.body} className="mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function parseCards(host: HTMLElement | null | undefined): Card[] | null {
  if (!host || !hasMountItems(host)) return null;
  return queryMountItems(host).map((el, i) => ({
    front:
      attr(el, 'data-front') ||
      childText(el, '[data-front]') ||
      field(el, { attr: 'data-title' }) ||
      'Card',
    eyebrow: attr(el, 'data-eyebrow') || 'Topic',
    title: field(el, { attr: 'data-title', child: '[data-title]' }) || 'Title',
    subtitle: attr(el, 'data-subtitle') || '',
    body: childText(el, '[data-body]') || attr(el, 'data-body') || '',
    icon:
      iconFromMountItem(el, { className: 'h-4 w-4' }) ||
      resolveMountIcon('shield', { className: 'h-4 w-4' }),
    accent: attr(el, 'data-accent') || ACCENTS[i % ACCENTS.length],
    image: attr(el, 'data-image') || attr(el, 'data-src') || undefined,
  }));
}

function CardGrid({
  cards,
  tall,
}: {
  cards: Card[];
  tall?: boolean;
}) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((c, i) => (
        <FlipFace
          key={`${c.front}-${i}`}
          card={c}
          tall={tall}
          flipped={!!flipped[i]}
          onFlip={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
        />
      ))}
    </div>
  );
}

export function FlipCardsWidget({
  preset,
  host,
}: {
  preset?: string;
  host?: HTMLElement | null;
}) {
  const mode = preset || 'grid';
  const hostCards = useMemo(() => parseCards(host), [host]);

  if (mode === 'rich') {
    const cards = hostCards?.length ? hostCards : [RICH_DEFAULT];
    return (
      <div className="flex w-full flex-col gap-4">
        {cards.map((c, i) => (
          <RichFlipCard key={`${c.front}-${i}`} card={c} />
        ))}
      </div>
    );
  }

  if (mode === 'image') {
    const cards = hostCards?.length ? hostCards : [IMAGE_DEFAULT];
    return (
      <div className="flex w-full flex-col gap-4">
        {cards.map((c, i) => (
          <ImageFlipCard
            key={`${c.front}-${i}`}
            card={{ ...IMAGE_DEFAULT, ...c, image: c.image || IMAGE_DEFAULT.image }}
          />
        ))}
      </div>
    );
  }

  if (mode === 'icons') {
    return <CardGrid cards={hostCards?.length ? hostCards : ICON_CARDS} tall />;
  }

  return <CardGrid cards={hostCards?.length ? hostCards : GRID_CARDS} />;
}
