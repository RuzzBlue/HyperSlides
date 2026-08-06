import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ExpandableShell } from '../ExpandableShell';
import { attr, childText, field, hasMountItems, queryMountItems } from './mountData';
import { iconFromMountItem, resolveMountIcon } from './mountIcons';
import { useClampedIndex } from './useMountItems';

type Slide = { title: string; body: string; icon: React.ReactNode; cue: string };

const ICONS = ['radio', 'shield-check', 'badge-check'] as const;

const PRESETS: Record<string, Slide[]> = {
  confirm: [
    {
      title: '1 · Broadcast',
      body: 'A signed transaction is shared with network peers and enters the mempool.',
      icon: resolveMountIcon('radio', { className: 'h-8 w-8' }),
      cue: 'Your wallet → network gossip',
    },
    {
      title: '2 · Validate',
      body: 'Nodes check signatures, balances, and protocol rules before inclusion.',
      icon: resolveMountIcon('shield-check', { className: 'h-8 w-8' }),
      cue: 'Rules before rewards',
    },
    {
      title: '3 · Confirm',
      body: 'The tx lands in a block. Extra confirmations deepen confidence in finality.',
      icon: resolveMountIcon('badge-check', { className: 'h-8 w-8' }),
      cue: 'Block → more blocks on top',
    },
  ],
};

function parseSlides(host: HTMLElement | null | undefined, preset?: string): Slide[] {
  if (host && hasMountItems(host)) {
    return queryMountItems(host).map((el, i) => ({
      title: field(el, { attr: 'data-title', child: '[data-title]' }) || `Slide ${i + 1}`,
      body: childText(el, '[data-body]') || attr(el, 'data-body') || '',
      cue: attr(el, 'data-cue') || '',
      icon:
        iconFromMountItem(el, { className: 'h-8 w-8' }) ||
        resolveMountIcon(ICONS[i % ICONS.length], { className: 'h-8 w-8' }),
    }));
  }
  return PRESETS[preset || 'confirm'] || PRESETS.confirm;
}

export function CarouselWidget({
  preset,
  host,
}: {
  preset?: string;
  host?: HTMLElement | null;
}) {
  const slides = useMemo(() => parseSlides(host, preset), [host, preset]);
  const [i, setI] = useClampedIndex(slides.length);
  const slide = slides[i];
  if (!slide) return null;

  return (
    <ExpandableShell title="How a transaction lands on-chain" bodyClassName="relative">
      <div className="relative min-h-[200px] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-[color-mix(in_srgb,var(--lesson-accent,#4f46e5)_45%,#0f172a)] p-6 text-white">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[color-mix(in_srgb,var(--lesson-accent,#a5b4fc)_80%,white)] ring-1 ring-white/20 backdrop-blur [&_svg]:h-8 [&_svg]:w-8">
            {slide.icon}
          </div>
          <div className="min-w-0 flex-1 pr-16">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
              {slide.cue}
            </div>
            <h4 className="mt-1 text-xl font-black tracking-tight">{slide.title}</h4>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-200">{slide.body}</p>
            <div className="mt-4 flex gap-2">
              {slides.map((s, idx) => (
                <button
                  key={`${s.title}-${idx}`}
                  type="button"
                  onClick={() => setI(idx)}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition [&_svg]:h-4 [&_svg]:w-4 ${
                    idx === i ? 'bg-white text-slate-900' : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                  title={s.title}
                >
                  {s.icon}
                </button>
              ))}
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
