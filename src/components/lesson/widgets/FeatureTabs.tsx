import { useMemo, type ReactNode } from 'react';
import { attr, childText, field, hasMountItems, queryMountItems } from './mountData';
import { iconFromMountItem } from './mountIcons';
import { useClampedIndex } from './useMountItems';

type FeatureTab = {
  id: string;
  title: string;
  blurb: string;
  icon: ReactNode;
  desktop: string;
  mobile: string;
};

const DEFAULT_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" />
    <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" />
    <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z" />
    <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" />
    <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" />
  </svg>
);

const TABS: FeatureTab[] = [
  {
    id: 'workspace',
    title: 'All-in-one workspace',
    blurb: 'Create a business, whether you’ve got a fresh idea.',
    desktop:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=750&fit=crop&q=80',
    mobile:
      'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=1200&fit=crop&q=80',
    icon: DEFAULT_ICON,
  },
  {
    id: 'automation',
    title: 'Automation on a whole new level',
    blurb: 'Use automation to scale campaigns profitably and save time doing it.',
    desktop:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=750&fit=crop&q=80',
    mobile:
      'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&h=1200&fit=crop&q=80',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 14 4-4" />
        <path d="M3.34 19a10 10 0 1 1 17.32 0" />
      </svg>
    ),
  },
  {
    id: 'teams',
    title: 'Solving problems for every team',
    blurb: 'One tool for your company to share knowledge and ship projects.',
    desktop:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=750&fit=crop&q=80',
    mobile:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=1200&fit=crop&q=80',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
      </svg>
    ),
  },
];

function parseTabs(host: HTMLElement | null | undefined): FeatureTab[] {
  if (host && hasMountItems(host)) {
    return queryMountItems(host).map((el, i) => {
      const fallback = TABS[i % TABS.length];
      return {
        id: attr(el, 'data-id') || `feature-${i + 1}`,
        title: field(el, { attr: 'data-title', child: '[data-title]' }) || fallback.title,
        blurb:
          attr(el, 'data-blurb') ||
          childText(el, '[data-blurb]') ||
          childText(el, '[data-body]') ||
          attr(el, 'data-body') ||
          fallback.blurb,
        icon: iconFromMountItem(el, { className: 'h-6 w-6' }) || fallback.icon,
        desktop: attr(el, 'data-desktop') || fallback.desktop,
        mobile: attr(el, 'data-mobile') || fallback.mobile,
      };
    });
  }
  return TABS;
}

export function FeatureTabsWidget({ host }: { host?: HTMLElement | null }) {
  const tabs = useMemo(() => parseTabs(host), [host]);
  const [active, setActive] = useClampedIndex(tabs.length);
  const tab = tabs[active];
  if (!tab) return null;

  return (
    <div className="hc-feature-tabs">
      <nav className="hc-feature-tabs__nav" aria-label="Feature tabs" role="tablist">
        {tabs.map((item, idx) => {
          const selected = idx === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`hc-feature-tabs__tab${selected ? ' is-active' : ''}`}
              onClick={() => setActive(idx)}
            >
              <span className="hc-feature-tabs__icon" aria-hidden>
                {item.icon}
              </span>
              <span className="hc-feature-tabs__copy">
                <span className="hc-feature-tabs__title">{item.title}</span>
                <span className="hc-feature-tabs__blurb">{item.blurb}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="hc-feature-tabs__stage" role="tabpanel">
        <figure className="hc-feature-tabs__phone">
          <div className="hc-feature-tabs__phone-frame">
            <img src={tab.mobile} alt="" loading="lazy" />
          </div>
        </figure>

        <figure className="hc-feature-tabs__browser">
          <div className="hc-feature-tabs__chrome">
            <span className="hc-feature-tabs__dot" />
            <span className="hc-feature-tabs__dot" />
            <span className="hc-feature-tabs__dot" />
            <div className="hc-feature-tabs__url">www.hyperclass.demo</div>
          </div>
          <div className="hc-feature-tabs__screen">
            <img src={tab.desktop} alt="" loading="lazy" />
          </div>
        </figure>
      </div>
    </div>
  );
}
