import { usePrefs } from '../../prefs/PrefsProvider';
import type { StringKey } from '../../i18n/strings';

export type StyleInteractionState = 'normal' | 'hover' | 'active';

const LABEL_KEYS: Record<StyleInteractionState, StringKey> = {
  normal: 'styleStateNormal',
  hover: 'styleStateHover',
  active: 'styleStateActive',
};

/** Normal / Hover / Active pill switch for Style & text appearance editors. */
export function StyleStateSwitch({
  value,
  onChange,
  compact,
}: {
  value: StyleInteractionState;
  onChange: (next: StyleInteractionState) => void;
  compact?: boolean;
}) {
  const { tr } = usePrefs();
  return (
    <div
      className={`inline-flex shrink-0 rounded-md border border-[var(--line)] bg-[var(--panel)] p-0.5 ${
        compact ? '' : ''
      }`}
      role="tablist"
      aria-label={tr('styleStateLabel')}
    >
      {(['normal', 'hover', 'active'] as const).map((id) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-semibold transition ${
              active
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            {tr(LABEL_KEYS[id])}
          </button>
        );
      })}
    </div>
  );
}
