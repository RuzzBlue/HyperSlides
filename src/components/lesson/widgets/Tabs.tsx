import { useState, type ReactNode } from 'react';
import {
  AppWindow,
  Boxes,
  KeyRound,
  Layers,
  Link2,
  Lock,
  MapPin,
  Network,
  Shield,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

type TabItem = {
  label: string;
  title: string;
  body: string;
  Icon?: LucideIcon;
};

type TabStyle =
  | 'default'
  | 'card-top'
  | 'card-left'
  | 'compare'
  | 'underline'
  | 'pills'
  | 'icon-line'
  | 'side-nav';

type TabConf = {
  style: TabStyle;
  orientation: 'horizontal' | 'vertical';
  items: TabItem[];
};

const PRESETS: Record<string, TabConf> = {
  ownership: {
    style: 'default',
    orientation: 'horizontal',
    items: [
      {
        label: 'Keys',
        title: 'Private keys authorize',
        body: 'A private key (or seed phrase) is the secret that signs transactions. Treat it like the deed to digital property — never share it.',
        Icon: KeyRound,
      },
      {
        label: 'Addresses',
        title: 'Addresses receive',
        body: 'A public address is safe to share. It identifies where funds can arrive without revealing the authorizing secret.',
        Icon: MapPin,
      },
      {
        label: 'Custody',
        title: 'Who holds the keys?',
        body: 'Self-custody means you hold the secret. Custodial services hold it for you — convenient, but “not your keys, not your coins.”',
        Icon: Shield,
      },
    ],
  },
  layers: {
    style: 'default',
    orientation: 'vertical',
    items: [
      {
        label: 'Settlement',
        title: 'Layer 1 settlement',
        body: 'Base chains finalize ownership with strong security assumptions and global consensus.',
        Icon: Layers,
      },
      {
        label: 'Scaling',
        title: 'Layer 2 throughput',
        body: 'Rollups and side systems batch activity, then settle proofs or state back to L1 for security.',
        Icon: Boxes,
      },
      {
        label: 'Apps',
        title: 'Application layer',
        body: 'Wallets, DEXs, and protocols are the interfaces users touch — still bound by underlying ledger rules.',
        Icon: AppWindow,
      },
    ],
  },
  underline: {
    style: 'underline',
    orientation: 'horizontal',
    items: [
      {
        label: 'Overview',
        title: 'Account overview',
        body: 'Balances, recent activity, and network status in one place — the default home most professional wallets open to.',
        Icon: AppWindow,
      },
      {
        label: 'Activity',
        title: 'Transaction history',
        body: 'Confirmed and pending transfers with explorer links. Filter by asset when the list gets long.',
        Icon: Link2,
      },
      {
        label: 'Security',
        title: 'Security controls',
        body: 'Device lock, connected apps, and recovery reminders. Treat this tab like the settings vault of the product.',
        Icon: Lock,
      },
    ],
  },
  pills: {
    style: 'pills',
    orientation: 'horizontal',
    items: [
      {
        label: 'Send',
        title: 'Send assets',
        body: 'Pick asset and network, paste a destination, review the fee, then sign. Prefer a tiny test on a new address.',
        Icon: Wallet,
      },
      {
        label: 'Receive',
        title: 'Receive assets',
        body: 'Share only the address for the selected network. QR codes help in person; still verify the first and last characters.',
        Icon: MapPin,
      },
      {
        label: 'Swap',
        title: 'Swap assets',
        body: 'Quotes include price impact and fees. Slippage and route details matter as much as the headline rate.',
        Icon: Boxes,
      },
      {
        label: 'Bridge',
        title: 'Bridge networks',
        body: 'Moving value across chains often means delays and a second confirmation. Read the destination network carefully.',
        Icon: Network,
      },
    ],
  },
  'icon-line': {
    style: 'icon-line',
    orientation: 'horizontal',
    items: [
      {
        label: 'Keys',
        title: 'Private keys authorize',
        body: 'A private key (or seed phrase) is the secret that signs transactions. Treat it like the deed to digital property — never share it.',
        Icon: KeyRound,
      },
      {
        label: 'Network',
        title: 'Network selection',
        body: 'Mainnet, testnet, and L2 badges look similar at a glance. Confirm the badge before every send.',
        Icon: Network,
      },
      {
        label: 'Custody',
        title: 'Who holds the keys?',
        body: 'Self-custody means you hold the secret. Custodial services hold it for you — convenient, but “not your keys, not your coins.”',
        Icon: Shield,
      },
      {
        label: 'Apps',
        title: 'Connected applications',
        body: 'Revoke unused dapp connections regularly. A forgotten approval can move tokens later without a new signature.',
        Icon: AppWindow,
      },
    ],
  },
  'side-nav': {
    style: 'side-nav',
    orientation: 'vertical',
    items: [
      {
        label: 'General',
        title: 'General preferences',
        body: 'Language, currency display, and default network. Changes here affect how amounts and chains appear across the app.',
        Icon: AppWindow,
      },
      {
        label: 'Networks',
        title: 'Network list',
        body: 'Enable only the chains you use. Custom RPC endpoints are powerful — and a common phishing vector if pasted blindly.',
        Icon: Network,
      },
      {
        label: 'Security',
        title: 'Security & privacy',
        body: 'Auto-lock timers, password strength, and phishing warnings. Keep recovery material offline and unphotographed.',
        Icon: Lock,
      },
      {
        label: 'Advanced',
        title: 'Advanced controls',
        body: 'Nonce overrides, custom gas, and developer toggles. Leave these alone unless you know why you need them.',
        Icon: Layers,
      },
    ],
  },
  wallets: {
    style: 'card-top',
    orientation: 'horizontal',
    items: [
      {
        label: 'Hot wallet',
        title: 'Connected & convenient',
        body: 'Software wallets stay online for daily use. Great for small balances and frequent transactions — keep the seed offline and never type it into a site.',
      },
      {
        label: 'Hardware',
        title: 'Keys stay in the device',
        body: 'Signing happens on a dedicated chip. The computer never sees the private key. Ideal for larger holdings and long-term storage.',
      },
      {
        label: 'Multisig',
        title: 'Shared authority',
        body: 'Multiple keys must approve a spend. Useful for treasuries and teams — one compromised key is not enough to move funds.',
      },
      {
        label: 'Custodial',
        title: 'Someone else holds keys',
        body: 'An exchange or service signs for you. Easy recovery via account login, but you inherit their security, policies, and downtime.',
      },
    ],
  },
  networks: {
    style: 'card-left',
    orientation: 'vertical',
    items: [
      {
        label: 'Mainnet',
        title: 'Real value, real risk',
        body: 'Production networks move assets with market value. Double-check the network badge before every send.',
      },
      {
        label: 'Testnet',
        title: 'Practice without stakes',
        body: 'Faucet tokens let you rehearse flows safely. Addresses and explorers differ — never mix them up with mainnet.',
      },
      {
        label: 'L2',
        title: 'Faster, cheaper settlement',
        body: 'Layer 2s batch activity and settle back to L1. Bridges and withdrawal delays are part of the design — plan for them.',
      },
    ],
  },
  compare: {
    style: 'compare',
    orientation: 'horizontal',
    items: [
      {
        label: 'Bitcoin',
        title: 'Digital gold rails',
        body: 'Optimized for secure value transfer and scarcity. Scripting is intentionally limited; the focus is monetary settlement and durability.',
      },
      {
        label: 'Ethereum',
        title: 'Programmable settlement',
        body: 'A general-purpose virtual machine hosts tokens, DeFi, and apps. Flexibility brings richer attack surfaces — audits and care matter more.',
      },
    ],
  },
};

function Panel({ item }: { item: TabItem }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h4 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
    </div>
  );
}

function DefaultTabs({
  items,
  dir,
  active,
  setActive,
}: {
  items: TabItem[];
  dir: 'horizontal' | 'vertical';
  active: number;
  setActive: (i: number) => void;
}) {
  const item = items[active];
  const tabs = (
    <div className={dir === 'vertical' ? 'flex flex-col gap-1' : 'flex flex-wrap gap-1'}>
      {items.map((t, i) => (
        <button
          key={t.label}
          type="button"
          onClick={() => setActive(i)}
          className={`cursor-pointer rounded-xl px-4 py-2.5 text-left text-sm font-bold transition ${
            i === active
              ? 'bg-teal-700 text-white shadow-md shadow-teal-700/25'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  if (dir === 'vertical') {
    return (
      <div className="grid gap-4 md:grid-cols-[11rem_1fr]">
        {tabs}
        <Panel item={item} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tabs}
      <Panel item={item} />
    </div>
  );
}

/** Bootstrap-like nav-tabs: text + bottom border indicator */
function UnderlineTabs({
  items,
  active,
  setActive,
}: {
  items: TabItem[];
  active: number;
  setActive: (i: number) => void;
}) {
  const item = items[active];
  return (
    <div>
      <div
        className="flex flex-wrap gap-0 border-b border-slate-200 dark:border-slate-700"
        role="tablist"
        aria-label="Underline tabs"
      >
        {items.map((t, i) => {
          const on = i === active;
          return (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(i)}
              className={`-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                on
                  ? 'border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="pt-4" role="tabpanel">
        <h4 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h4>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
      </div>
    </div>
  );
}

/** Bootstrap-like nav-pills */
function PillsTabs({
  items,
  active,
  setActive,
}: {
  items: TabItem[];
  active: number;
  setActive: (i: number) => void;
}) {
  const item = items[active];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Pill tabs">
        {items.map((t, i) => {
          const on = i === active;
          const Icon = t.Icon;
          return (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(i)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                on
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={2.25} /> : null}
              {t.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">
        <h4 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h4>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
      </div>
    </div>
  );
}

/** Professional underline tabs with icons (SaaS settings / product chrome) */
function IconLineTabs({
  items,
  active,
  setActive,
}: {
  items: TabItem[];
  active: number;
  setActive: (i: number) => void;
}) {
  const item = items[active];
  return (
    <div>
      <div
        className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700"
        role="tablist"
        aria-label="Icon underline tabs"
      >
        {items.map((t, i) => {
          const on = i === active;
          const Icon = t.Icon;
          return (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(i)}
              className={`-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition ${
                on
                  ? 'border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {Icon ? (
                <Icon
                  className={`h-4 w-4 ${on ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400'}`}
                  strokeWidth={2}
                />
              ) : null}
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="pt-4" role="tabpanel">
        <h4 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h4>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
      </div>
    </div>
  );
}

/** Professional side tabs — left rail with active bar (settings / console pattern) */
function SideNavTabs({
  items,
  active,
  setActive,
}: {
  items: TabItem[];
  active: number;
  setActive: (i: number) => void;
}) {
  const item = items[active];
  return (
    <div className="grid gap-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 md:grid-cols-[13rem_1fr]">
      <nav
        className="flex flex-row gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2 md:flex-col md:border-b-0 md:border-r dark:border-slate-700 dark:bg-slate-950/80"
        role="tablist"
        aria-label="Side navigation tabs"
      >
        {items.map((t, i) => {
          const on = i === active;
          const Icon = t.Icon;
          return (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(i)}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition md:w-full ${
                on
                  ? 'bg-white text-teal-800 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-teal-300 dark:ring-slate-600'
                  : 'text-slate-500 hover:bg-white/80 hover:text-slate-800 dark:hover:bg-slate-900/70 dark:hover:text-slate-200'
              }`}
            >
              <span
                className={`hidden h-4 w-0.5 shrink-0 rounded-full md:block ${
                  on ? 'bg-teal-700 dark:bg-teal-400' : 'bg-transparent'
                }`}
                aria-hidden
              />
              {Icon ? (
                <Icon
                  className={`h-4 w-4 ${on ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400'}`}
                  strokeWidth={2}
                />
              ) : null}
              {t.label}
            </button>
          );
        })}
      </nav>
      <div className="bg-white p-5 dark:bg-slate-900" role="tabpanel">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Settings</p>
        <h4 className="mt-1 text-base font-bold text-slate-900 dark:text-white">{item.title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
      </div>
    </div>
  );
}

function CardTopTabs({
  items,
  active,
  setActive,
}: {
  items: TabItem[];
  active: number;
  setActive: (i: number) => void;
}) {
  const item = items[active];
  return (
    <div className="w-full space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Wallet types">
        {items.map((t, i) => {
          const on = i === active;
          return (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(i)}
              className={`cursor-pointer rounded-2xl border px-4 py-4 text-left transition ${
                on
                  ? 'border-teal-600 bg-teal-700 text-white shadow-lg shadow-teal-700/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              <span className={`block text-[10px] font-black uppercase tracking-[0.16em] ${on ? 'text-teal-100' : 'text-slate-400'}`}>
                Tab {i + 1}
              </span>
              <span className="mt-1 block text-sm font-black">{t.label}</span>
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900" role="tabpanel">
        <h4 className="text-xl font-black text-slate-900 dark:text-white">{item.title}</h4>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
      </div>
    </div>
  );
}

function CardLeftTabs({
  items,
  active,
  setActive,
}: {
  items: TabItem[];
  active: number;
  setActive: (i: number) => void;
}) {
  const item = items[active];
  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="grid md:grid-cols-[10.5rem_1fr]">
        <div
          className="flex flex-row gap-1 border-b border-slate-200 bg-slate-50 p-2 md:flex-col md:border-b-0 md:border-r dark:border-slate-700 dark:bg-slate-950"
          role="tablist"
          aria-label="Networks"
        >
          {items.map((t, i) => {
            const on = i === active;
            return (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActive(i)}
                className={`cursor-pointer rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                  on
                    ? 'bg-white text-teal-800 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-teal-300 dark:ring-slate-600'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="p-5 md:p-6" role="tabpanel">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">Network focus</p>
          <h4 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{item.title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
        </div>
      </div>
    </div>
  );
}

function CompareTabs({
  items,
  active,
  setActive,
}: {
  items: TabItem[];
  active: number;
  setActive: (i: number) => void;
}) {
  const item = items[active];
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center">
      <div
        className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800"
        role="tablist"
        aria-label="Asset comparison"
      >
        {items.map((t, i) => {
          const on = i === active;
          return (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(i)}
              className={`cursor-pointer rounded-full px-6 py-2 text-sm font-black transition ${
                on
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="mt-5 w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900" role="tabpanel">
        <h4 className="text-lg font-black text-slate-900 dark:text-white">{item.title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
      </div>
    </div>
  );
}

export function TabsWidget({
  preset,
  orientation,
}: {
  preset?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  const conf = PRESETS[preset || 'ownership'] || PRESETS.ownership;
  const dir = orientation || conf.orientation;
  const [active, setActive] = useState(0);

  const views: Record<TabStyle, ReactNode> = {
    default: <DefaultTabs items={conf.items} dir={dir} active={active} setActive={setActive} />,
    underline: <UnderlineTabs items={conf.items} active={active} setActive={setActive} />,
    pills: <PillsTabs items={conf.items} active={active} setActive={setActive} />,
    'icon-line': <IconLineTabs items={conf.items} active={active} setActive={setActive} />,
    'side-nav': <SideNavTabs items={conf.items} active={active} setActive={setActive} />,
    'card-top': <CardTopTabs items={conf.items} active={active} setActive={setActive} />,
    'card-left': <CardLeftTabs items={conf.items} active={active} setActive={setActive} />,
    compare: <CompareTabs items={conf.items} active={active} setActive={setActive} />,
  };

  return <>{views[conf.style]}</>;
}
