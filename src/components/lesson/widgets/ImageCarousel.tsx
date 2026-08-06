import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ExpandableShell } from '../ExpandableShell';
import { attr, hasMountItems, queryMountItems } from './mountData';
import { useClampedIndex } from './useMountItems';

type Slide = { src: string; caption: string };

const DEFAULT_SLIDES: Slide[] = [
  {
    src: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1200&h=675&fit=crop&q=80',
    caption: 'Hardware wallets keep keys offline for larger balances.',
  },
  {
    src: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=675&fit=crop&q=80',
    caption: 'Public ledgers make settlement transparent without revealing private keys.',
  },
  {
    src: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=1200&h=675&fit=crop&q=80',
    caption: 'Mobile hot wallets are convenient for learning — start with tiny amounts.',
  },
];

function parseSlides(host: HTMLElement | null | undefined): Slide[] {
  if (host && hasMountItems(host)) {
    return queryMountItems(host).map((el, i) => ({
      src: attr(el, 'data-src') || DEFAULT_SLIDES[i % DEFAULT_SLIDES.length].src,
      caption: attr(el, 'data-caption') || attr(el, 'data-label') || '',
    }));
  }
  return DEFAULT_SLIDES;
}

export function ImageCarouselWidget({ host }: { host?: HTMLElement | null }) {
  const slides = useMemo(() => parseSlides(host), [host]);
  const [i, setI] = useClampedIndex(slides.length);
  const slide = slides[i];
  if (!slide) return null;

  return (
    <ExpandableShell
      title="Visual walkthrough"
      bodyClassName="relative aspect-[16/9] overflow-hidden bg-slate-950"
      expandedBodyClassName="relative min-h-0 flex-1 overflow-hidden bg-slate-950"
    >
      {/* Fixed frame — every slide crops to the same 16:9 box */}
      <img
        src={slide.src}
        alt={slide.caption}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        draggable={false}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-4 pt-10">
        <p
          className="mx-auto max-w-2xl rounded-md bg-black/70 px-3 py-2 text-center text-sm font-semibold leading-snug shadow-lg backdrop-blur-sm"
          style={{ color: '#ffffff' }}
        >
          {slide.caption}
        </p>
      </div>

      <div className="absolute bottom-3 left-3 z-30 flex gap-2">
        <button
          type="button"
          onClick={() => setI((v) => (v - 1 + slides.length) % slides.length)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setI((v) => (v + 1) % slides.length)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </ExpandableShell>
  );
}
