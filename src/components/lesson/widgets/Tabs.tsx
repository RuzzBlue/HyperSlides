import { useState } from 'react';

const PRESETS: Record<
  string,
  { orientation: 'horizontal' | 'vertical'; items: { label: string; title: string; body: string }[] }
> = {
  ownership: {
    orientation: 'horizontal',
    items: [
      {
        label: 'Keys',
        title: 'Private keys authorize',
        body: 'A private key (or seed phrase) is the secret that signs transactions. Treat it like the deed to digital property — never share it.',
      },
      {
        label: 'Addresses',
        title: 'Addresses receive',
        body: 'A public address is safe to share. It identifies where funds can arrive without revealing the authorizing secret.',
      },
      {
        label: 'Custody',
        title: 'Who holds the keys?',
        body: 'Self-custody means you hold the secret. Custodial services hold it for you — convenient, but “not your keys, not your coins.”',
      },
    ],
  },
  layers: {
    orientation: 'vertical',
    items: [
      {
        label: 'Settlement',
        title: 'Layer 1 settlement',
        body: 'Base chains finalize ownership with strong security assumptions and global consensus.',
      },
      {
        label: 'Scaling',
        title: 'Layer 2 throughput',
        body: 'Rollups and side systems batch activity, then settle proofs or state back to L1 for security.',
      },
      {
        label: 'Apps',
        title: 'Application layer',
        body: 'Wallets, DEXs, and protocols are the interfaces users touch — still bound by underlying ledger rules.',
      },
    ],
  },
};

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
  const item = conf.items[active];

  const tabs = (
    <div className={dir === 'vertical' ? 'flex flex-col gap-1' : 'flex flex-wrap gap-1'}>
      {conf.items.map((t, i) => (
        <button
          key={t.label}
          type="button"
          onClick={() => setActive(i)}
          className={`cursor-pointer rounded-xl px-4 py-2.5 text-left text-sm font-bold transition ${
            i === active
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const panel = (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h4 className="text-lg font-black text-slate-900 dark:text-white">{item.title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.body}</p>
    </div>
  );

  if (dir === 'vertical') {
    return (
      <div className="grid gap-4 md:grid-cols-[11rem_1fr]">
        {tabs}
        {panel}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tabs}
      {panel}
    </div>
  );
}
