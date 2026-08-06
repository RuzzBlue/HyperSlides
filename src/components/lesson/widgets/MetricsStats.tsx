import { useEffect, useMemo, useRef, useState } from 'react';
import { attr, childText, field, hasMountItems, queryMountItems } from './mountData';

type StatItem = {
  label?: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  caption: string;
  badge?: string;
};

type MetricsPreset = 'triple' | 'featured' | 'cards';

const PRESETS: Record<MetricsPreset, { title: string; items: StatItem[]; hero?: StatItem }> = {
  triple: {
    title: 'Triple stats · count-up',
    items: [
      { label: 'Accuracy rate', value: 99.95, decimals: 2, suffix: '%', caption: 'in fulfilling orders' },
      { label: 'Startup businesses', value: 2000, suffix: '+', caption: 'partner with HyperClass' },
      { label: 'Happy customer', value: 85, suffix: '%', caption: 'this year alone' },
    ],
  },
  featured: {
    title: 'Featured metric · count-up',
    hero: {
      value: 92,
      suffix: '%',
      caption: 'of U.S. adults have bought from businesses using Space',
      badge: '+7% this month',
    },
    items: [
      { value: 99.95, decimals: 2, suffix: '%', caption: 'in fulfilling orders' },
      { value: 2000, suffix: '+', caption: 'partner with HyperClass' },
      { value: 85, suffix: '%', caption: 'this year alone' },
    ],
  },
  cards: {
    title: 'Metric cards · count-up',
    items: [
      { label: 'Courses shipped', value: 128, suffix: '', caption: 'demo packages ready' },
      { label: 'Avg. completion', value: 76, suffix: '%', caption: 'across active learners' },
      { label: 'Slide layouts', value: 42, suffix: '+', caption: 'patterns in this demo' },
      { label: 'Components', value: 18, suffix: '', caption: 'interactive portals live' },
    ],
  },
};

function formatValue(n: number, decimals = 0) {
  const fixed = n.toFixed(decimals);
  const [whole, frac] = fixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac != null ? `${withCommas}.${frac}` : withCommas;
}

function useCountUp(target: number, active: boolean, durationMs = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, durationMs]);

  return value;
}

function CountValue({
  item,
  active,
  className,
}: {
  item: StatItem;
  active: boolean;
  className?: string;
}) {
  const n = useCountUp(item.value, active);
  return (
    <span className={className}>
      {item.prefix ?? ''}
      {formatValue(n, item.decimals ?? 0)}
      {item.suffix ?? ''}
    </span>
  );
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, active };
}

function parseStatItem(el: Element): StatItem {
  const decimalsRaw = attr(el, 'data-decimals');
  const valueRaw = attr(el, 'data-value') || childText(el, '[data-value]') || '0';
  return {
    label: attr(el, 'data-label') || field(el, { attr: 'data-title' }) || undefined,
    value: Number.parseFloat(valueRaw) || 0,
    decimals: decimalsRaw ? Number.parseInt(decimalsRaw, 10) : undefined,
    prefix: attr(el, 'data-prefix') || undefined,
    suffix: attr(el, 'data-suffix') || undefined,
    caption: attr(el, 'data-caption') || childText(el, '[data-caption]') || '',
    badge: attr(el, 'data-badge') || undefined,
  };
}

function parseMetrics(host: HTMLElement | null | undefined, preset?: string) {
  const key: MetricsPreset =
    preset === 'featured' || preset === 'cards' || preset === 'triple' ? preset : 'triple';
  const base = PRESETS[key];

  if (host && (hasMountItems(host) || host.querySelector(':scope > [data-hero]'))) {
    const title = attr(host, 'data-title') || base.title;
    const heroEl = host.querySelector(':scope > [data-hero]');
    const hero = heroEl ? parseStatItem(heroEl) : undefined;
    const items = hasMountItems(host)
      ? queryMountItems(host).map(parseStatItem)
      : base.items;
    return {
      key: hero ? ('featured' as MetricsPreset) : key,
      title,
      items,
      hero,
    };
  }

  return { key, title: base.title, items: base.items, hero: base.hero };
}

export function MetricsStatsWidget({
  preset,
  host,
}: {
  preset?: string;
  host?: HTMLElement | null;
}) {
  const data = useMemo(() => parseMetrics(host, preset), [host, preset]);
  const { ref, active } = useInView<HTMLDivElement>();

  if (data.key === 'featured' && data.hero) {
    return (
      <div ref={ref} className="hc-metrics hc-metrics--featured">
        <div className="hc-metrics__hero">
          <p className="hc-metrics__hero-value">
            <CountValue item={data.hero} active={active} />
            {data.hero.badge && (
              <span className="hc-metrics__badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01-.622-.636zm.287 5.984-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7 8.793l2.646-2.647a.5.5 0 0 1 .708.708z" />
                </svg>
                {data.hero.badge}
              </span>
            )}
          </p>
          <p className="hc-metrics__caption">{data.hero.caption}</p>
        </div>
        <div className="hc-metrics__side">
          {data.items.map((item, i) => (
            <div key={`${item.caption}-${i}`} className="hc-metrics__mini">
              <CountValue item={item} active={active} className="hc-metrics__mini-value" />
              <p className="hc-metrics__caption">{item.caption}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.key === 'cards') {
    return (
      <div ref={ref} className="hc-metrics hc-metrics--cards">
        {data.items.map((item, i) => (
          <article key={`${item.label}-${i}`} className="hc-metrics__card">
            <p className="hc-metrics__card-label">{item.label}</p>
            <CountValue item={item} active={active} className="hc-metrics__card-value" />
            <p className="hc-metrics__caption">{item.caption}</p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="hc-metrics hc-metrics--triple">
      {data.items.map((item, i) => (
        <div key={`${item.label}-${i}`} className="hc-metrics__stat">
          <h4 className="hc-metrics__label">{item.label}</h4>
          <CountValue item={item} active={active} className="hc-metrics__value" />
          <p className="hc-metrics__caption">{item.caption}</p>
        </div>
      ))}
    </div>
  );
}
