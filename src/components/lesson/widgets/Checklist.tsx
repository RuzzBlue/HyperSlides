import { useState } from 'react';

const PRESETS: Record<string, string[]> = {
  send: [
    'Recipient address verified (first & last characters)',
    'Correct network selected',
    'Amount is a deliberate test size',
    'Fee is understood before signing',
    'No seed phrase was typed into any website',
  ],
  wallet: [
    'Installed from an official source',
    'Recovery phrase written offline',
    'Screen lock enabled on device',
    'Bookmarked the real wallet URL',
  ],
};

export function ChecklistWidget({ preset }: { preset?: string }) {
  const items = PRESETS[preset || 'send'] || PRESETS.send;
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
          Interactive checklist
        </span>
        <span className="text-xs font-bold text-slate-500">
          {done} / {items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
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
              <span className={checked[i] ? 'line-through opacity-80' : ''}>{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
