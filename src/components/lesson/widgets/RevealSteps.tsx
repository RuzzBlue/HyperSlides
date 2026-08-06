import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { attr, childText, field, hasMountItems, queryMountItems } from './mountData';
import { useClampedIndex } from './useMountItems';

type Step = { title: string; body: string };

const PRESETS: Record<string, Step[]> = {
  'wallet-prepare': [
    {
      title: 'Verify the source',
      body: 'Type or use a trusted bookmark for the official wallet site or app store listing.',
    },
    {
      title: 'Create and back up',
      body: 'Write the phrase offline, in order. Never photograph it. Verify when the wallet asks.',
    },
    {
      title: 'Find receive',
      body: 'Select the correct asset and network, then copy the public receiving address.',
    },
  ],
};

function parseSteps(host: HTMLElement | null | undefined, preset?: string): Step[] {
  if (host && hasMountItems(host)) {
    return queryMountItems(host).map((el) => ({
      title: field(el, { attr: 'data-title', child: '[data-title]' }) || 'Step',
      body: childText(el, '[data-body]') || attr(el, 'data-body') || '',
    }));
  }
  return PRESETS[preset || 'wallet-prepare'] || PRESETS['wallet-prepare'];
}

/** Progressive reveal: card 1 → click arrow → card 2 → card 3 */
export function RevealStepsWidget({
  preset,
  host,
}: {
  preset?: string;
  host?: HTMLElement | null;
}) {
  const steps = useMemo(() => parseSteps(host, preset), [host, preset]);
  const [visible, setVisible] = useClampedIndex(steps.length + 1, 1);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      {steps.map((step, i) => {
        const shown = i < visible;
        const isLastShown = i === visible - 1;
        const canRevealNext = isLastShown && visible < steps.length;

        if (!shown) {
          return (
            <div
              key={`${step.title}-${i}`}
              className="hidden min-h-[8rem] flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 sm:flex dark:border-slate-700 dark:bg-slate-900/40"
              aria-hidden
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Step {i + 1}
              </span>
            </div>
          );
        }

        return (
          <div key={`${step.title}-${i}`} className="relative flex flex-1 items-stretch gap-2">
            <div
              className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              style={{
                borderColor: 'color-mix(in srgb, var(--lesson-accent, #0e6e6a) 28%, transparent)',
              }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-white"
                style={{ backgroundColor: 'var(--lesson-accent, #0e6e6a)' }}
              >
                {i + 1}
              </span>
              <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{step.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {step.body}
              </p>
            </div>
            {canRevealNext && (
              <button
                type="button"
                onClick={() => setVisible((v) => Math.min(steps.length, v + 1))}
                className="flex shrink-0 cursor-pointer items-center self-center rounded-full p-2 text-white shadow-md transition hover:scale-105 hover:brightness-110"
                style={{ backgroundColor: 'var(--lesson-accent, #0e6e6a)' }}
                title="Reveal next step"
                aria-label="Reveal next step"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
