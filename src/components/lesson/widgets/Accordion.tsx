import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

const PRESETS: Record<string, { t: string; d: string }[]> = {
  platform: [
    {
      t: 'Interactive HTML lessons',
      d: 'Full-bleed article layouts with media, diagrams, and live widgets — not trapped in a 16:9 box.',
    },
    {
      t: 'Auto-graded knowledge checks',
      d: 'Multiple choice, matching, sequencing, short answers, and polls with instant feedback.',
    },
    {
      t: 'Hands-on labs with rubrics',
      d: 'Multi-section labs, evidence drawers, and clear expected outcomes for each step.',
    },
  ],
  security: [
    {
      t: 'Before opening a wallet',
      d: 'Update your device, use a screen lock, and reach the wallet from a bookmarked official source — not a link in a message.',
    },
    {
      t: 'Before signing or sending',
      d: 'Read the network, recipient, amount, approval scope, and fee. When unsure, cancel and research from a trusted source.',
    },
    {
      t: 'After a transaction',
      d: 'Record what happened, check its status, and revoke unnecessary token approvals where your network supports that control.',
    },
  ],
};

export function AccordionWidget({ preset }: { preset?: string }) {
  const items = PRESETS[preset || 'platform'] || PRESETS.platform;
  const [open, setOpen] = useState(0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {items.map((item, i) => {
        const on = open === i;
        return (
          <div key={item.t} className={i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}>
            <button
              type="button"
              onClick={() => setOpen(on ? -1 : i)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white">{item.t}</span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 text-indigo-600 transition-transform duration-200 dark:text-indigo-400 ${
                  on ? 'rotate-90' : ''
                }`}
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ${
                on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.d}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
