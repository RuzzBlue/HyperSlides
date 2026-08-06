import { useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  Circle,
  Globe2,
  KeyRound,
  Lock,
  PackageCheck,
  Shield,
} from 'lucide-react';
import { attr, childText, field, hasMountItems, queryMountItems } from './mountData';

type ChecklistItem = {
  label: string;
  hint?: string;
};

const PRESETS: Record<string, { title: string; items: ChecklistItem[] }> = {
  send: {
    title: 'Before you send',
    items: [
      { label: 'Recipient address verified (first & last characters)' },
      { label: 'Correct network selected' },
      { label: 'Amount is a deliberate test size' },
      { label: 'Fee is understood before signing' },
      { label: 'No seed phrase was typed into any website' },
    ],
  },
  wallet: {
    title: 'Wallet hardening',
    items: [
      { label: 'Installed from an official source', hint: 'Store or vendor site only' },
      { label: 'Recovery phrase written offline', hint: 'Paper / metal — never a screenshot' },
      { label: 'Screen lock enabled on device', hint: 'PIN, biometrics, or both' },
      { label: 'Bookmarked the real wallet URL', hint: 'Avoid search-result phishing' },
    ],
  },
  guided: {
    title: 'First send checklist',
    items: [
      { label: 'Open wallet from your bookmark', hint: 'Not a search result' },
      { label: 'Confirm network badge', hint: 'Mainnet vs testnet' },
      { label: 'Paste the recipient address', hint: 'Match first/last chars' },
      { label: 'Enter a small test amount', hint: 'Dust-sized first transfer' },
      { label: 'Review fee, then approve', hint: 'Cancel if anything looks off' },
    ],
  },
};

function DefaultChecklist({
  title,
  items,
  checked,
  toggle,
  done,
}: {
  title: string;
  items: ChecklistItem[];
  checked: Record<number, boolean>;
  toggle: (i: number) => void;
  done: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
          {title}
        </span>
        <span className="text-xs font-bold text-slate-500">
          {done} / {items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => toggle(i)}
              className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                checked[i]
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-100'
                  : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-black ${
                  checked[i]
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                }`}
              >
                {checked[i] ? '✓' : ''}
              </span>
              <span className={checked[i] ? 'line-through opacity-80' : ''}>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NumberedRailChecklist({
  title,
  items,
  checked,
  toggle,
  done,
}: {
  title: string;
  items: ChecklistItem[];
  checked: Record<number, boolean>;
  toggle: (i: number) => void;
  done: number;
}) {
  const pct = Math.round((done / items.length) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-end justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Numbered rail</p>
          <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{title}</h3>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tabular-nums text-teal-700 dark:text-teal-400">{pct}%</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {done}/{items.length} done
          </p>
        </div>
      </div>

      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full bg-teal-600 transition-all duration-300 dark:bg-teal-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="divide-y divide-slate-200 dark:divide-slate-800">
        {items.map((item, i) => {
          const on = !!checked[i];
          return (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className="flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition hover:bg-white/80 dark:hover:bg-slate-900/80"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition ${
                    on
                      ? 'bg-teal-700 text-white'
                      : 'bg-white text-slate-500 ring-1 ring-slate-300 dark:bg-slate-900 dark:ring-slate-600'
                  }`}
                >
                  {on ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-semibold ${
                      on
                        ? 'text-slate-400 line-through dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.hint ? (
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{item.hint}</span>
                  ) : null}
                </span>
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    on ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function GuidedDemoPanel({ checked }: { checked: Record<number, boolean> }) {
  const steps = useMemo(
    () => [
      {
        icon: Bookmark,
        label: 'Bookmark',
        live: 'hyperclass.app/wallet',
        idle: 'open from search…',
      },
      {
        icon: Globe2,
        label: 'Network',
        live: 'Ethereum · Mainnet',
        idle: 'Select network',
      },
      {
        icon: KeyRound,
        label: 'Recipient',
        live: '0xA1b2…9fE4',
        idle: 'Paste address',
      },
      {
        icon: PackageCheck,
        label: 'Amount',
        live: '0.01 ETH',
        idle: '0.00',
      },
      {
        icon: Shield,
        label: 'Approve',
        live: 'Signed · waiting confirm',
        idle: 'Review & sign',
      },
    ],
    [],
  );

  const done = steps.filter((_, i) => checked[i]).length;
  const allDone = done === steps.length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-lg">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-teal-300" />
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Live send preview
          </span>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-teal-200">
          {done}/{steps.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {steps.map((step, i) => {
          const on = !!checked[i];
          const Icon = step.icon;
          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300 ${
                on
                  ? 'border-teal-500/50 bg-teal-500/10'
                  : 'border-white/10 bg-white/[0.03] opacity-55'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  on ? 'bg-teal-500 text-slate-950' : 'bg-white/10 text-slate-400'
                }`}
              >
                {on ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{step.label}</p>
                <p
                  className={`truncate font-mono text-xs ${
                    on ? 'text-teal-100' : 'text-slate-500'
                  }`}
                >
                  {on ? step.live : step.idle}
                </p>
              </div>
              {on ? (
                <Circle className="h-2 w-2 fill-teal-400 text-teal-400" />
              ) : (
                <Circle className="h-2 w-2 text-slate-600" />
              )}
            </div>
          );
        })}
      </div>

      <div
        className={`border-t border-white/10 px-4 py-3 text-center text-xs font-semibold transition ${
          allDone ? 'bg-teal-500/20 text-teal-100' : 'bg-white/[0.03] text-slate-500'
        }`}
      >
        {allDone
          ? 'Checklist complete — ready to broadcast'
          : 'Check items on the left to fill this preview'}
      </div>
    </div>
  );
}

function GuidedSplitChecklist({
  title,
  items,
  checked,
  toggle,
  done,
}: {
  title: string;
  items: ChecklistItem[];
  checked: Record<number, boolean>;
  toggle: (i: number) => void;
  done: number;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2 md:items-stretch">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
              Guided checklist
            </p>
            <h3 className="mt-1 text-base font-black text-slate-900 dark:text-white">{title}</h3>
          </div>
          <span className="shrink-0 text-xs font-bold tabular-nums text-slate-500">
            {done}/{items.length}
          </span>
        </div>

        <ul className="space-y-2">
          {items.map((item, i) => {
            const on = !!checked[i];
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className={`flex w-full cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 text-left transition ${
                    on ? 'bg-teal-50 dark:bg-teal-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      on
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-slate-300 bg-transparent dark:border-slate-500'
                    }`}
                  >
                    {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-semibold ${
                        on
                          ? 'text-teal-900 line-through dark:text-teal-200/80'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.hint ? (
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                        {item.hint}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <GuidedDemoPanel checked={checked} />
    </div>
  );
}

function parseChecklist(host: HTMLElement | null | undefined, preset?: string) {
  const key = preset && PRESETS[preset] ? preset : 'send';
  const base = PRESETS[key];
  if (host && hasMountItems(host)) {
    const title = attr(host, 'data-title') || base.title;
    const items = queryMountItems(host).map((el) => ({
      label: attr(el, 'data-label') || field(el, { attr: 'data-title', fallbackText: true }) || 'Item',
      hint: attr(el, 'data-hint') || childText(el, '[data-hint]') || undefined,
    }));
    return { key, title, items };
  }
  return { key, title: base.title, items: base.items };
}

export function ChecklistWidget({
  preset,
  host,
}: {
  preset?: string;
  host?: HTMLElement | null;
}) {
  const { key, title, items } = useMemo(() => parseChecklist(host, preset), [host, preset]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const done = Object.values(checked).filter(Boolean).length;

  const toggle = (i: number) => setChecked((c) => ({ ...c, [i]: !c[i] }));

  if (key === 'wallet') {
    return (
      <NumberedRailChecklist title={title} items={items} checked={checked} toggle={toggle} done={done} />
    );
  }

  if (key === 'guided') {
    return (
      <GuidedSplitChecklist title={title} items={items} checked={checked} toggle={toggle} done={done} />
    );
  }

  return <DefaultChecklist title={title} items={items} checked={checked} toggle={toggle} done={done} />;
}
