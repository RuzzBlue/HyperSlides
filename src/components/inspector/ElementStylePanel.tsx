import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePrefs } from '../../prefs/PrefsProvider';
import { useLessonObjectModeOptional } from '../../lesson-objects/LessonObjectMode';

export type BoxSides = { top: string; right: string; bottom: string; left: string };

export type ElementStyleSnapshot = {
  margin: BoxSides;
  padding: BoxSides;
  zIndex: string;
  className: string;
  id: string;
  color: string;
  background: string;
  backgroundAlpha: number;
  borderWidth: string;
  borderStyle: string;
  borderColor: string;
  borderRadius: string;
  opacity: string;
  width: string;
  maxWidth: string;
  height: string;
  display: string;
  position: string;
};

const fieldClass =
  'w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';

function parseSide(value: string): string {
  const v = (value || '').trim();
  if (!v || v === '0px') return '';
  return v;
}

function readBox(el: HTMLElement, kind: 'margin' | 'padding'): BoxSides {
  if (kind === 'margin') {
    return {
      top: parseSide(el.style.marginTop || '') || '',
      right: parseSide(el.style.marginRight || '') || '',
      bottom: parseSide(el.style.marginBottom || '') || '',
      left: parseSide(el.style.marginLeft || '') || '',
    };
  }
  return {
    top: parseSide(el.style.paddingTop || '') || '',
    right: parseSide(el.style.paddingRight || '') || '',
    bottom: parseSide(el.style.paddingBottom || '') || '',
    left: parseSide(el.style.paddingLeft || '') || '',
  };
}

function rgbaToParts(input: string): { hex: string; alpha: number } | null {
  const s = input.trim();
  if (!s || s === 'transparent') return { hex: '#ffffff', alpha: 0 };
  if (s.startsWith('#')) {
    if (s.length === 9) {
      const a = parseInt(s.slice(7, 9), 16);
      return { hex: s.slice(0, 7).toLowerCase(), alpha: Number.isFinite(a) ? a / 255 : 1 };
    }
    if (s.length === 4) {
      return {
        hex: `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase(),
        alpha: 1,
      };
    }
    return { hex: s.slice(0, 7).toLowerCase(), alpha: 1 };
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
  if (!m) return null;
  const h = (n: string) => Number(n).toString(16).padStart(2, '0');
  return {
    hex: `#${h(m[1]!)}${h(m[2]!)}${h(m[3]!)}`,
    alpha: m[4] != null ? Math.max(0, Math.min(1, Number(m[4]))) : 1,
  };
}

export function hexAlphaToCss(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const h = hex.startsWith('#') ? hex.slice(0, 7) : `#${hex}`.slice(0, 7);
  if (a >= 0.999) return h;
  if (a <= 0.001) return 'transparent';
  const r = parseInt(h.slice(1, 3), 16) || 0;
  const g = parseInt(h.slice(3, 5), 16) || 0;
  const b = parseInt(h.slice(5, 7), 16) || 0;
  const rounded = Math.round(a * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${rounded})`;
}

function readColorHex(input: string, fallback: string): string {
  return rgbaToParts(input)?.hex || fallback;
}

function readSnapshot(el: HTMLElement): ElementStyleSnapshot {
  const cs = getComputedStyle(el);
  const bg = rgbaToParts(el.style.backgroundColor || '') ||
    (el.style.backgroundColor ? null : { hex: '#ffffff', alpha: 0 });
  const bgParts = bg ?? { hex: '#ffffff', alpha: 0 };

  return {
    margin: readBox(el, 'margin'),
    padding: readBox(el, 'padding'),
    zIndex: el.style.zIndex || '',
    className: el.getAttribute('class') || '',
    id: el.id || '',
    color: readColorHex(el.style.color || '', '#1c1f26'),
    background: bgParts.hex,
    backgroundAlpha: bgParts.alpha,
    borderWidth: el.style.borderWidth || '',
    borderStyle: el.style.borderStyle || 'none',
    borderColor: readColorHex(el.style.borderColor || cs.borderColor, '#d0d5dd'),
    borderRadius: el.style.borderRadius || '',
    opacity: el.style.opacity || '',
    width: el.style.width || '',
    maxWidth: el.style.maxWidth || '',
    height: el.style.height || '',
    display: el.style.display || '',
    position: el.style.position || '',
  };
}

function applySide(el: HTMLElement, prop: string, value: string) {
  const v = value.trim();
  if (!v) el.style.removeProperty(prop);
  else el.style.setProperty(prop, v);
}

function applySnapshot(el: HTMLElement, s: ElementStyleSnapshot) {
  applySide(el, 'margin-top', s.margin.top);
  applySide(el, 'margin-right', s.margin.right);
  applySide(el, 'margin-bottom', s.margin.bottom);
  applySide(el, 'margin-left', s.margin.left);
  applySide(el, 'padding-top', s.padding.top);
  applySide(el, 'padding-right', s.padding.right);
  applySide(el, 'padding-bottom', s.padding.bottom);
  applySide(el, 'padding-left', s.padding.left);

  applySide(el, 'z-index', s.zIndex);
  applySide(el, 'opacity', s.opacity);
  applySide(el, 'width', s.width);
  applySide(el, 'max-width', s.maxWidth);
  applySide(el, 'height', s.height);
  applySide(el, 'display', s.display);
  applySide(el, 'position', s.position);

  if (s.color) el.style.setProperty('color', s.color);
  else el.style.removeProperty('color');

  const bgCss = hexAlphaToCss(s.background || '#ffffff', s.backgroundAlpha);
  if (bgCss === 'transparent' || s.backgroundAlpha <= 0) {
    el.style.removeProperty('background-color');
  } else {
    el.style.setProperty('background-color', bgCss);
  }

  applySide(el, 'border-width', s.borderWidth);
  if (!s.borderStyle || s.borderStyle === 'none') {
    el.style.removeProperty('border-style');
    if (!s.borderWidth) el.style.removeProperty('border-width');
  } else {
    el.style.setProperty('border-style', s.borderStyle);
  }
  if (s.borderColor) el.style.setProperty('border-color', s.borderColor);
  else el.style.removeProperty('border-color');
  applySide(el, 'border-radius', s.borderRadius);

  const cls = s.className.trim();
  if (cls) el.setAttribute('class', cls);
  else el.removeAttribute('class');

  const id = s.id.trim().replace(/\s+/g, '-');
  if (id) el.id = id;
  else el.removeAttribute('id');
}

/** Elementor-style common CSS controls for the selected lesson node. */
export function ElementStylePanel({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { tr } = usePrefs();
  const objectMode = useLessonObjectModeOptional();
  const selected = objectMode?.selected ?? null;
  const el = selected?.element ?? null;
  const [draft, setDraft] = useState<ElementStyleSnapshot | null>(null);

  useEffect(() => {
    if (!el || !el.isConnected) {
      setDraft(null);
      return;
    }
    setDraft(readSnapshot(el));
  }, [el, selected?.objectId]);

  const apply = useCallback(
    (next: ElementStyleSnapshot) => {
      if (!el || !el.isConnected) return;
      applySnapshot(el, next);
      setDraft(next);
      onDirtyChange?.(true);
    },
    [el, onDirtyChange],
  );

  const patch = (partial: Partial<ElementStyleSnapshot>) => {
    if (!draft) return;
    apply({ ...draft, ...partial });
  };

  const patchBox = (kind: 'margin' | 'padding', side: keyof BoxSides, value: string) => {
    if (!draft) return;
    apply({ ...draft, [kind]: { ...draft[kind], [side]: value } });
  };

  if (!selected || !el) {
    return (
      <p className="px-1 text-[12px] text-[var(--ink-muted)]">{tr('styleSelectHint')}</p>
    );
  }

  if (!draft) return null;

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('styleSpacing')}
        </div>
        <BoxFields
          label={tr('styleMargin')}
          value={draft.margin}
          onChange={(side, v) => patchBox('margin', side, v)}
        />
        <BoxFields
          label={tr('stylePadding')}
          value={draft.padding}
          onChange={(side, v) => patchBox('padding', side, v)}
        />
      </section>

      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('styleLayout')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={tr('styleWidth')}>
            <input
              className={fieldClass}
              placeholder="auto"
              value={draft.width}
              onChange={(e) => patch({ width: e.target.value })}
            />
          </Field>
          <Field label={tr('styleMaxWidth')}>
            <input
              className={fieldClass}
              placeholder="none"
              value={draft.maxWidth}
              onChange={(e) => patch({ maxWidth: e.target.value })}
            />
          </Field>
          <Field label={tr('styleHeight')}>
            <input
              className={fieldClass}
              placeholder="auto"
              value={draft.height}
              onChange={(e) => patch({ height: e.target.value })}
            />
          </Field>
          <Field label={tr('styleZIndex')}>
            <input
              className={fieldClass}
              placeholder="auto"
              value={draft.zIndex}
              onChange={(e) => patch({ zIndex: e.target.value })}
            />
          </Field>
          <Field label={tr('styleDisplay')}>
            <select
              className={fieldClass}
              value={draft.display || ''}
              onChange={(e) => patch({ display: e.target.value })}
            >
              <option value="">Default</option>
              <option value="block">block</option>
              <option value="inline">inline</option>
              <option value="inline-block">inline-block</option>
              <option value="flex">flex</option>
              <option value="grid">grid</option>
              <option value="none">none</option>
            </select>
          </Field>
          <Field label={tr('stylePosition')}>
            <select
              className={fieldClass}
              value={draft.position || ''}
              onChange={(e) => patch({ position: e.target.value })}
            >
              <option value="">Default</option>
              <option value="static">static</option>
              <option value="relative">relative</option>
              <option value="absolute">absolute</option>
              <option value="sticky">sticky</option>
              <option value="fixed">fixed</option>
            </select>
          </Field>
          <Field label={tr('styleOpacity')}>
            <input
              className={fieldClass}
              placeholder="1"
              value={draft.opacity}
              onChange={(e) => patch({ opacity: e.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('styleColors')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={tr('inspectorColor')}>
            <input
              type="color"
              className="h-8 w-full cursor-pointer rounded-md border border-[var(--line)] bg-[var(--panel)] p-1"
              value={draft.color}
              onChange={(e) => patch({ color: e.target.value })}
            />
          </Field>
          <Field label={tr('styleBackground')}>
            <input
              type="color"
              className="h-8 w-full cursor-pointer rounded-md border border-[var(--line)] bg-[var(--panel)] p-1"
              value={draft.background}
              onChange={(e) =>
                patch({
                  background: e.target.value,
                  backgroundAlpha: draft.backgroundAlpha <= 0 ? 1 : draft.backgroundAlpha,
                })
              }
            />
          </Field>
        </div>
        <Field label={`${tr('styleBgOpacity')} (${Math.round(draft.backgroundAlpha * 100)}%)`}>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(draft.backgroundAlpha * 100)}
            onChange={(e) => patch({ backgroundAlpha: Number(e.target.value) / 100 })}
            className="w-full cursor-pointer accent-[var(--accent)]"
          />
        </Field>
      </section>

      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('styleBorder')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={tr('styleBorderWidth')}>
            <input
              className={fieldClass}
              placeholder="0"
              value={draft.borderWidth}
              onChange={(e) => patch({ borderWidth: e.target.value })}
            />
          </Field>
          <Field label={tr('styleBorderStyle')}>
            <select
              className={fieldClass}
              value={draft.borderStyle || 'none'}
              onChange={(e) => patch({ borderStyle: e.target.value })}
            >
              <option value="none">none</option>
              <option value="solid">solid</option>
              <option value="dashed">dashed</option>
              <option value="dotted">dotted</option>
              <option value="double">double</option>
            </select>
          </Field>
          <Field label={tr('styleBorderColor')}>
            <input
              type="color"
              className="h-8 w-full cursor-pointer rounded-md border border-[var(--line)] bg-[var(--panel)] p-1"
              value={draft.borderColor}
              onChange={(e) => patch({ borderColor: e.target.value })}
            />
          </Field>
          <Field label={tr('styleBorderRadius')}>
            <input
              className={fieldClass}
              placeholder="0"
              value={draft.borderRadius}
              onChange={(e) => patch({ borderRadius: e.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('styleAttributes')}
        </div>
        <Field label={tr('styleCssClass')}>
          <input
            className={fieldClass}
            placeholder="my-class another-class"
            value={draft.className}
            onChange={(e) => patch({ className: e.target.value })}
          />
        </Field>
        <Field label={tr('styleCssId')}>
          <input
            className={fieldClass}
            placeholder="my-id"
            value={draft.id}
            onChange={(e) => patch({ id: e.target.value })}
          />
        </Field>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">{label}</span>
      {children}
    </label>
  );
}

function BoxFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: BoxSides;
  onChange: (side: keyof BoxSides, value: string) => void;
}) {
  const { tr } = usePrefs();
  const sides: Array<[keyof BoxSides, string]> = [
    ['top', tr('styleSideTop')],
    ['right', tr('styleSideRight')],
    ['bottom', tr('styleSideBottom')],
    ['left', tr('styleSideLeft')],
  ];
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium text-[var(--ink)]">{label}</div>
      <div className="grid grid-cols-4 gap-1.5">
        {sides.map(([side, sideLabel]) => (
          <label key={side} className="block">
            <span className="mb-0.5 block text-center text-[9px] uppercase tracking-wide text-[var(--ink-muted)]">
              {sideLabel}
            </span>
            <input
              className={fieldClass}
              placeholder="—"
              value={value[side]}
              onChange={(e) => onChange(side, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/** Shared Content | Style tab chrome for inspectors. */
export function InspectorContentStyleTabs({
  tab,
  onTabChange,
  content,
  style,
}: {
  tab: 'content' | 'style';
  onTabChange: (tab: 'content' | 'style') => void;
  content: ReactNode;
  style: ReactNode;
}) {
  const { tr } = usePrefs();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1 border-b border-[var(--line)] px-3 pt-2">
        {(
          [
            ['content', tr('inspectorTabContent')],
            ['style', tr('inspectorTabStyle')],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`cursor-pointer rounded-t-md px-3 py-1.5 text-[11px] font-semibold ${
              tab === id
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {tab === 'content' ? content : style}
      </div>
    </div>
  );
}
