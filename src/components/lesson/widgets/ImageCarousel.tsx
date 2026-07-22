import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ExpandableShell, PanZoomSurface } from '../ExpandableShell';

const SLIDES = [
  {
    src: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1200&q=80',
    caption: 'Hardware wallets keep keys offline for larger balances.',
  },
  {
    src: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&q=80',
    caption: 'Public ledgers make settlement transparent without revealing private keys.',
  },
  {
    src: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=1200&q=80',
    caption: 'Mobile hot wallets are convenient for learning — start with tiny amounts.',
  },
];

export function ImageCarouselWidget() {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];

  return (
    <ExpandableShell
      title="Visual walkthrough"
      bodyClassName="relative h-[280px]"
      expandedBodyClassName="min-h-0 flex-1"
    >
      <PanZoomSurface className="h-full min-h-[280px] bg-slate-950">
        <div className="relative w-full max-w-4xl">
          <img
            src={slide.src}
            alt={slide.caption}
            className="max-h-[70vh] w-full rounded-lg object-contain"
            loading="lazy"
            draggable={false}
          />
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center">
            <p className="max-w-xl rounded-lg bg-black/65 px-4 py-2 text-center text-sm font-medium text-white shadow-lg backdrop-blur-sm">
              {slide.caption}
            </p>
          </div>
        </div>
      </PanZoomSurface>
      <div className="absolute bottom-3 left-3 z-20 flex gap-2">
        <button
          type="button"
          onClick={() => setI((v) => (v - 1 + SLIDES.length) % SLIDES.length)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/70"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setI((v) => (v + 1) % SLIDES.length)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/70"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </ExpandableShell>
  );
}
