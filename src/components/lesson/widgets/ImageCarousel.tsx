import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ExpandableShell } from '../ExpandableShell';

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
    <ExpandableShell title="Visual walkthrough" bodyClassName="relative">
      <div className="relative aspect-[16/9] bg-slate-950">
        <img src={slide.src} alt={slide.caption} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-sm font-medium text-white">{slide.caption}</p>
        </div>
        <button
          type="button"
          onClick={() => setI((v) => (v - 1 + SLIDES.length) % SLIDES.length)}
          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setI((v) => (v + 1) % SLIDES.length)}
          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </ExpandableShell>
  );
}
