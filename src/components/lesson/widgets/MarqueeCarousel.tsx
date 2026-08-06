import { useMemo } from 'react';
import { attr, hasMountItems, queryMountItems } from './mountData';

type Item = { src: string; label: string };

const DEFAULT_ITEMS: Item[] = [
  {
    src: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=480&h=320&fit=crop&q=80',
    label: 'Lorem felis',
  },
  {
    src: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=480&h=320&fit=crop&q=80',
    label: 'Ipsum nisl',
  },
  {
    src: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=480&h=320&fit=crop&q=80',
    label: 'Dolor amet',
  },
  {
    src: 'https://cataas.com/cat?width=480&height=320',
    label: 'Sit elit',
  },
  {
    src: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=480&h=320&fit=crop&q=80',
    label: 'Consectetur',
  },
  {
    src: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=480&h=320&fit=crop&q=80',
    label: 'Adipiscing',
  },
];

function parseItems(host: HTMLElement | null | undefined): Item[] {
  if (host && hasMountItems(host)) {
    return queryMountItems(host).map((el, i) => ({
      src: attr(el, 'data-src') || DEFAULT_ITEMS[i % DEFAULT_ITEMS.length].src,
      label: attr(el, 'data-caption') || attr(el, 'data-label') || `Item ${i + 1}`,
    }));
  }
  return DEFAULT_ITEMS;
}

/** Continuous auto-scrolling image strip (website-style marquee). */
export function MarqueeCarouselWidget({ host }: { host?: HTMLElement | null }) {
  const items = useMemo(() => parseItems(host), [host]);
  const loop = [...items, ...items];

  return (
    <div className="hc-marquee overflow-hidden rounded-2xl border border-slate-200 bg-white py-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="hc-marquee__track">
        {loop.map((item, idx) => (
          <figure key={`${item.label}-${idx}`} className="hc-marquee__item">
            <img src={item.src} alt={item.label} loading="lazy" draggable={false} />
            <figcaption>{item.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
