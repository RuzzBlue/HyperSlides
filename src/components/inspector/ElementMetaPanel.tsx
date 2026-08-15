import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefs } from '../../prefs/PrefsProvider';
import { useLessonObjectModeOptional } from '../../lesson-objects/LessonObjectMode';
import {
  HC_OBJ_ATTR,
  objectLabel,
  renameObjectId,
  setObjectLabel,
} from '../../lesson-objects/selection';

type MetaDraft = {
  objectId: string;
  displayLabel: string;
  tagName: string;
  zIndex: string;
  opacity: number;
  translateX: number;
  translateY: number;
  rotateDeg: number;
};

function parsePx(raw: string): number {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function parseTransform(el: HTMLElement): Pick<MetaDraft, 'translateX' | 'translateY' | 'rotateDeg'> {
  const translate = (el.style.translate || '').trim();
  if (translate) {
    const parts = translate.split(/\s+/);
    const x = parsePx(parts[0] || '0');
    const y = parsePx(parts[1] || parts[0] || '0');
    const rotRaw = (el.style.rotate || '0deg').trim();
    return { translateX: x, translateY: y, rotateDeg: parsePx(rotRaw) };
  }

  const tf = (el.style.transform || '').trim();
  let translateX = 0;
  let translateY = 0;
  let rotateDeg = 0;
  const t2 = tf.match(/translate\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)/i);
  const t1 = tf.match(/translate\(\s*([^)]+)\s*\)/i);
  const tx = tf.match(/translateX\(\s*([^)]+)\s*\)/i);
  const ty = tf.match(/translateY\(\s*([^)]+)\s*\)/i);
  const rot = tf.match(/rotate\(\s*([^)]+)\s*\)/i);
  if (t2) {
    translateX = parsePx(t2[1]);
    translateY = parsePx(t2[2]);
  } else if (tx || ty) {
    translateX = tx ? parsePx(tx[1]) : 0;
    translateY = ty ? parsePx(ty[1]) : 0;
  } else if (t1) {
    translateX = parsePx(t1[1]);
  }
  if (rot) rotateDeg = parsePx(rot[1]);
  const rotProp = (el.style.rotate || '').trim();
  if (rotProp) rotateDeg = parsePx(rotProp);
  return { translateX, translateY, rotateDeg };
}

function readMeta(el: HTMLElement): MetaDraft {
  const opacityRaw = el.style.opacity;
  const opacity = opacityRaw === '' ? 1 : Number.parseFloat(opacityRaw);
  const customLabel = el.getAttribute('data-hc-label')?.trim() || '';
  return {
    objectId: el.getAttribute(HC_OBJ_ATTR)?.trim() || '',
    displayLabel: customLabel,
    tagName: el.tagName.toLowerCase(),
    zIndex: el.style.zIndex || '',
    opacity: Number.isFinite(opacity) ? opacity : 1,
    ...parseTransform(el),
  };
}

function applyTransform(el: HTMLElement, d: MetaDraft) {
  const x = d.translateX || 0;
  const y = d.translateY || 0;
  const r = d.rotateDeg || 0;
  if (!x && !y) el.style.removeProperty('translate');
  else el.style.translate = `${x}px ${y}px`;
  if (!r) el.style.removeProperty('rotate');
  else el.style.rotate = `${r}deg`;
  // Clear legacy transform pieces we may have read from, if they only held translate/rotate
  if (el.style.transform && /translate|rotate/i.test(el.style.transform)) {
    // Prefer modern longhands; drop transform when it was only used for these
    const cleaned = el.style.transform
      .replace(/translate[XY]?\([^)]*\)/gi, '')
      .replace(/rotate\([^)]*\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[, ]+|[, ]+$/g, '');
    if (cleaned) el.style.transform = cleaned;
    else el.style.removeProperty('transform');
  }
}

function applyMeta(el: HTMLElement, d: MetaDraft) {
  if (d.zIndex.trim() === '' || d.zIndex.trim() === 'auto') {
    el.style.removeProperty('z-index');
  } else {
    el.style.zIndex = d.zIndex.trim();
  }
  if (d.opacity >= 0.999) el.style.removeProperty('opacity');
  else el.style.opacity = String(d.opacity);
  applyTransform(el, d);
}

function RotateKnob({
  angle,
  onChange,
  label,
}: {
  angle: number;
  onChange: (deg: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromPointer = (clientX: number, clientY: number) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    let deg = Math.round((rad * 180) / Math.PI + 90);
    if (deg < 0) deg += 360;
    onChange(((deg % 360) + 360) % 360);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] font-medium text-[var(--ink)]">{label}</span>
      <div
        ref={ref}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(angle) % 360}
        aria-label={label}
        tabIndex={0}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          setFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        className="relative h-14 w-14 cursor-grab rounded-full border-2 border-[var(--line)] bg-[var(--panel)] active:cursor-grabbing"
      >
        <div
          className="absolute left-1/2 top-1/2 h-[42%] w-1 origin-bottom rounded-full bg-[var(--accent)]"
          style={{ transform: `translate(-50%, -100%) rotate(${angle}deg)` }}
        />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ink)]" />
      </div>
      <span className="text-[10px] tabular-nums text-[var(--ink-muted)]">{Math.round(angle) % 360}°</span>
    </div>
  );
}

/** Shared Element tab — common node identity + stacking + transform shortcuts. */
export function ElementMetaPanel({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { tr } = usePrefs();
  const objectMode = useLessonObjectModeOptional();
  const selected = objectMode?.selected ?? null;
  const el = selected?.element ?? null;
  const [draft, setDraft] = useState<MetaDraft | null>(null);
  const [idError, setIdError] = useState<string | null>(null);

  useEffect(() => {
    if (!el?.isConnected) {
      setDraft(null);
      setIdError(null);
      return;
    }
    setDraft(readMeta(el));
    setIdError(null);
  }, [el, selected?.objectId]);

  const apply = useCallback(
    (next: MetaDraft) => {
      if (!el?.isConnected) return;
      applyMeta(el, next);
      setDraft(next);
      onDirtyChange?.(true);
    },
    [el, onDirtyChange],
  );

  const patch = (partial: Partial<MetaDraft>) => {
    if (!draft) return;
    apply({ ...draft, ...partial });
  };

  if (!selected || !el) {
    return (
      <p className="px-1 text-[12px] text-[var(--ink-muted)]">{tr('styleSelectHint')}</p>
    );
  }
  if (!draft) return null;

  const previewLabel = draft.displayLabel.trim() || objectLabel(el);

  return (
    <div className="space-y-4">
      <p className="text-[10px] leading-snug text-[var(--ink-muted)]">{tr('elementMetaHint')}</p>

      <section className="space-y-2 rounded-lg border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_8%,var(--panel))] p-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
          {tr('elementMetaIdentity')}
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
            {tr('elementMetaObjectId')}
          </span>
          <input
            className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 font-mono text-[12px]"
            value={draft.objectId}
            onChange={(e) => {
              setDraft({ ...draft, objectId: e.target.value });
              setIdError(null);
            }}
            onBlur={() => {
              if (!objectMode?.root || !el.isConnected) return;
              if (draft.objectId.trim() === selected.objectId) return;
              const res = renameObjectId(objectMode.root, el, draft.objectId);
              if (!res.ok) {
                setIdError(res.error);
                setDraft(readMeta(el));
                return;
              }
              setIdError(null);
              objectMode.selectElement(el);
              objectMode.signalPicked();
              onDirtyChange?.(true);
            }}
          />
          {idError && <p className="mt-1 text-[10px] text-[var(--danger)]">{idError}</p>}
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
            {tr('elementMetaDisplayLabel')}
          </span>
          <input
            className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px]"
            value={draft.displayLabel}
            placeholder={previewLabel}
            onChange={(e) => {
              const displayLabel = e.target.value;
              setObjectLabel(el, displayLabel);
              setDraft({ ...draft, displayLabel });
              if (objectMode) {
                objectMode.selectElement(el);
              }
              onDirtyChange?.(true);
            }}
          />
          <p className="mt-0.5 text-[10px] text-[var(--ink-muted)]">{tr('elementMetaDisplayLabelHint')}</p>
        </label>
        <div>
          <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
            {tr('elementMetaType')}
          </span>
          <div className="rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5 font-mono text-[12px] text-[var(--ink-muted)]">
            &lt;{draft.tagName}&gt;
            {el.className && typeof el.className === 'string' && el.className.trim()
              ? ` · .${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
              : ''}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
          {tr('elementMetaStack')}
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
            {tr('styleZIndex')}
          </span>
          <input
            className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px]"
            placeholder="auto"
            value={draft.zIndex}
            onChange={(e) => patch({ zIndex: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 flex justify-between text-[11px] font-medium text-[var(--ink)]">
            <span>{tr('styleOpacity')}</span>
            <span className="tabular-nums text-[var(--ink-muted)]">
              {Math.round(draft.opacity * 100)}%
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(draft.opacity * 100)}
            onChange={(e) => patch({ opacity: Number(e.target.value) / 100 })}
            className="w-full cursor-pointer accent-[var(--accent)]"
          />
        </label>
      </section>

      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
          {tr('elementMetaTransform')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('elementMetaTranslateX')}
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px] tabular-nums"
                value={draft.translateX}
                onChange={(e) => patch({ translateX: Number(e.target.value) || 0 })}
              />
              <span className="text-[10px] text-[var(--ink-muted)]">px</span>
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('elementMetaTranslateY')}
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px] tabular-nums"
                value={draft.translateY}
                onChange={(e) => patch({ translateY: Number(e.target.value) || 0 })}
              />
              <span className="text-[10px] text-[var(--ink-muted)]">px</span>
            </div>
          </label>
        </div>
        <div className="flex items-start gap-3">
          <RotateKnob
            angle={draft.rotateDeg}
            label={tr('elementMetaRotate')}
            onChange={(rotateDeg) => patch({ rotateDeg })}
          />
          <label className="block flex-1 pt-5">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('elementMetaRotate')}
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={359}
                className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px] tabular-nums"
                value={Math.round(draft.rotateDeg) % 360}
                onChange={(e) => patch({ rotateDeg: Number(e.target.value) || 0 })}
              />
              <span className="text-[10px] text-[var(--ink-muted)]">°</span>
            </div>
          </label>
        </div>
      </section>

      <section className="space-y-1.5 rounded-lg border border-dashed border-[var(--line)] bg-[var(--stage)]/50 p-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
          {tr('elementMetaCompositing')}
        </div>
        <p className="text-[11px] leading-snug text-[var(--ink-muted)]">
          {tr('elementMetaCompositingSoon')}
        </p>
        <div className="pointer-events-none space-y-1 opacity-45">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium">{tr('elementMetaBlendMode')}</span>
            <select
              disabled
              className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px]"
            >
              <option>normal</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium">{tr('elementMetaIsolation')}</span>
            <select
              disabled
              className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px]"
            >
              <option>auto</option>
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}
