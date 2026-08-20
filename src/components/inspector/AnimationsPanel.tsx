import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Crosshair,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';
import { effectsForKind, getEffectDef } from '@shared/animations/effects';
import {
  emptyLessonAnimationsDoc,
  isAnimationOrderValid,
  normalizeAnimationList,
  type AnimKind,
  type AnimStart,
  type AnimationAdvanceKey,
  type LessonAnimationsDoc,
  type SlideAnimation,
  type SlideAnimationParams,
} from '@shared/animations/types';
import { useLessonObjectModeOptional } from '../../lesson-objects/LessonObjectMode';
import { serializeLessonRoot } from '../../lesson-objects/lessonHtml';
import { playSlideAnimation, readAuthorOpacity } from '../../lesson-objects/AnimationRunner';
import {
  ensureObjectId,
  findByObjectId,
  HC_OBJ_ATTR,
  setObjectLabel,
} from '../../lesson-objects/selection';
import type { StringKey } from '../../i18n/strings';

type Level = 'list' | 'detail';

function newId(): string {
  return `anim_${Math.random().toString(36).slice(2, 10)}`;
}

function advanceKeyShort(key: AnimationAdvanceKey, tr: (k: StringKey) => string): string | null {
  if (key === 'none') return null;
  const map: Record<Exclude<AnimationAdvanceKey, 'none'>, StringKey> = {
    next: 'animAdvanceShortNext',
    'right-click': 'animAdvanceShortRightClick',
    space: 'animAdvanceShortSpace',
    enter: 'animAdvanceShortEnter',
    tab: 'animAdvanceShortTab',
    up: 'animAdvanceShortUp',
    down: 'animAdvanceShortDown',
    'left-click': 'animAdvanceShortLeftClick',
  };
  return tr(map[key]);
}

export function AnimationsPanel({
  courseId,
  slideKey,
  onHtmlPersist,
  onDocChange,
  onDirtyChange,
  onSavingChange,
  onDetailChange,
  registerSave,
  registerDelete,
}: {
  courseId: string;
  slideKey: string;
  onHtmlPersist?: (html: string) => Promise<void>;
  onDocChange?: (doc: LessonAnimationsDoc) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onDetailChange?: (inDetail: boolean) => void;
  registerSave?: (fn: () => Promise<void>) => void;
  registerDelete?: (fn: () => Promise<void>) => void;
}) {
  const { tr, settings } = usePrefs();
  const objectMode = useLessonObjectModeOptional();
  const [doc, setDoc] = useState<LessonAnimationsDoc>(emptyLessonAnimationsDoc());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderToast, setOrderToast] = useState<string | null>(null);
  const [libraryTab, setLibraryTab] = useState<AnimKind>('entrance');
  const [level, setLevel] = useState<Level>('list');
  const [draft, setDraft] = useState<SlideAnimation | null>(null);
  const [dirty, setDirty] = useState(false);
  const [labelEdit, setLabelEdit] = useState('');
  const [focusedAnimId, setFocusedAnimId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    null | { kind: 'discard' } | { kind: 'remove'; id: string } | { kind: 'order-invalid' }
  >(null);

  const saveRef = useRef<() => Promise<void>>(async () => {});
  const deleteRef = useRef<() => Promise<void>>(async () => {});

  const load = useCallback(async () => {
    setLoaded(false);
    setError(null);
    const res = await apiFetch<{ slideKey: string; file: string; animations: LessonAnimationsDoc }>({
      method: 'GET',
      path: `/api/courses/${courseId}/lesson-animations`,
      params: { slideKey },
    });
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Failed to load animations');
      setDoc(emptyLessonAnimationsDoc());
      setLoaded(true);
      return;
    }
    setDoc(res.data.animations);
    setLoaded(true);
  }, [courseId, slideKey]);

  useEffect(() => {
    void load();
    setLevel('list');
    setDraft(null);
    setDirty(false);
    setFocusedAnimId(null);
  }, [load]);

  useEffect(() => {
    if (objectMode?.active) objectMode.stampIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectMode?.active, objectMode?.stampIds]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  useEffect(() => {
    onDetailChange?.(level === 'detail');
  }, [level, onDetailChange]);

  useEffect(() => {
    if (!orderToast) return;
    const t = window.setTimeout(() => setOrderToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [orderToast]);

  const normalizeOpts = useCallback(() => {
    const root = objectMode?.root;
    return {
      ancestorObjectIds: (objectId: string): string[] => {
        if (!root) return [];
        const el = findByObjectId(root, objectId);
        if (!el) return [];
        const ids: string[] = [];
        let cur = el.parentElement;
        while (cur && root.contains(cur)) {
          const id = cur.getAttribute(HC_OBJ_ATTR)?.trim();
          if (id) ids.push(id);
          cur = cur.parentElement;
        }
        return ids;
      },
    };
  }, [objectMode?.root]);

  const items = useMemo(
    () => normalizeAnimationList(doc.items, normalizeOpts()),
    [doc.items, normalizeOpts],
  );

  const selectedObjectId = objectMode?.selected?.objectId ?? null;
  const hasElementSelection = Boolean(objectMode?.selected || focusedAnimId);

  const appliedEffectsForSelection = useMemo(() => {
    if (!selectedObjectId) return new Map<AnimKind, string>();
    const map = new Map<AnimKind, string>();
    for (const it of items) {
      if (it.objectId === selectedObjectId) map.set(it.kind, it.effectId);
    }
    return map;
  }, [items, selectedObjectId]);

  const onKeyLabel = useMemo(() => {
    const keys = settings.animationAdvanceKeys ?? ['next', 'right-click', 'space'];
    const parts = keys
      .map((k) => advanceKeyShort(k, tr))
      .filter((s): s is string => Boolean(s));
    return `${tr('animStartOnKeyPrefix')}: ${parts.join('/') || '—'}`;
  }, [settings.animationAdvanceKeys, tr]);

  const displayNameFor = useCallback(
    (objectId: string) => {
      const el = objectMode?.root ? findByObjectId(objectMode.root, objectId) : null;
      const label = el?.getAttribute('data-hc-label')?.trim();
      return label || objectId;
    },
    [objectMode?.root],
  );

  const persistDoc = useCallback(
    async (next: LessonAnimationsDoc) => {
      setSaving(true);
      setError(null);
      const normalized = {
        version: 1 as const,
        items: normalizeAnimationList(next.items, normalizeOpts()),
      };
      const res = await apiFetch({
        method: 'PUT',
        path: `/api/courses/${courseId}/lesson-animations`,
        body: { slideKey, animations: normalized },
      });
      setSaving(false);
      if (!res.ok) {
        setError(res.error ?? 'Failed to save');
        return false;
      }
      setDoc(normalized);
      onDocChange?.(normalized);
      return true;
    },
    [courseId, slideKey, onDocChange, normalizeOpts],
  );

  const ensureSelectedObject = useCallback(async (): Promise<string | null> => {
    const sel = objectMode?.selected;
    if (!sel) return null;
    const id = ensureObjectId(sel.element);
    if (objectMode?.root && onHtmlPersist) {
      objectMode.stampIds();
      await onHtmlPersist(serializeLessonRoot(objectMode.root));
    }
    return id;
  }, [objectMode, onHtmlPersist]);

  const focusAnim = (anim: SlideAnimation) => {
    setFocusedAnimId(anim.id);
    setLibraryTab(anim.kind);
    objectMode?.selectByObjectId(anim.objectId);
    objectMode?.stopPicking();
  };

  // Stage pick → highlight the first animation already on this object (if any).
  useEffect(() => {
    if (!objectMode?.pickEpoch || level === 'detail') return;
    const objectId = objectMode.selected?.objectId;
    if (!objectId) return;
    const first = items.find((i) => i.objectId === objectId);
    if (first) {
      setFocusedAnimId(first.id);
      setLibraryTab(first.kind);
    } else {
      setFocusedAnimId(null);
    }
  }, [objectMode?.pickEpoch, objectMode?.selected?.objectId, items, level]);

  const selectLibraryTab = (kind: AnimKind) => {
    setLibraryTab(kind);
    const objectId =
      objectMode?.selected?.objectId ??
      (focusedAnimId ? items.find((i) => i.id === focusedAnimId)?.objectId : null);
    if (!objectId) {
      setFocusedAnimId(null);
      return;
    }
    const match = items.find((i) => i.objectId === objectId && i.kind === kind);
    if (match) {
      focusAnim(match);
    } else {
      setFocusedAnimId(null);
    }
  };

  const openDetail = (anim: SlideAnimation) => {
    focusAnim(anim);
    setDraft({ ...anim, params: { ...anim.params } });
    const el = objectMode?.root ? findByObjectId(objectMode.root, anim.objectId) : null;
    setLabelEdit(el?.getAttribute('data-hc-label') ?? '');
    setDirty(false);
    setLevel('detail');
  };

  const applyEffectFromLibrary = async (effectId: string, kind: AnimKind) => {
    if (!hasElementSelection && !objectMode?.selected) {
      setError(tr('animSelectElementFirst'));
      return;
    }
    const objectId = await ensureSelectedObject();
    if (!objectId) {
      setError(tr('animSelectElementFirst'));
      return;
    }
    const def = getEffectDef(effectId);
    if (!def) return;
    const existing = items.find((i) => i.objectId === objectId && i.kind === kind);
    const nextOrder =
      existing?.order ??
      (items.length === 0 ? 1 : Math.max(...items.map((i) => i.order), 0) + 1);
    const draftAnim: SlideAnimation = {
      id: existing?.id ?? newId(),
      objectId,
      kind,
      effectId,
      order: existing?.order === 0 ? 0 : nextOrder,
      start: existing?.start ?? 'on-key',
      durationSec: def.defaultDurationSec,
      repeat: kind === 'action' ? existing?.repeat ?? 1 : 1,
      params: { ...def.defaultParams },
    };
    setFocusedAnimId(draftAnim.id);
    setDraft(draftAnim);
    setLabelEdit(objectMode?.selected?.element.getAttribute('data-hc-label') ?? '');
    setDirty(true);
    setLevel('detail');
    setLibraryTab(kind);
    if (objectMode?.root) {
      const el = findByObjectId(objectMode.root, objectId);
      if (el) {
        const authorOpacity = el.style.opacity;
        const authorVisibility = el.style.visibility;
        const base = readAuthorOpacity(el);
        el.style.visibility = 'visible';
        void playSlideAnimation(objectMode.root, draftAnim, base).finally(() => {
          // Preview only — restore authored opacity / visibility afterward.
          if (authorOpacity) el.style.opacity = authorOpacity;
          else el.style.removeProperty('opacity');
          if (authorVisibility) el.style.visibility = authorVisibility;
          else el.style.removeProperty('visibility');
          el.style.transform = '';
          el.style.filter = '';
          el.style.pointerEvents = '';
        });
      }
    }
  };

  const saveDraft = useCallback(
    async (opts?: { acceptAutoOrder?: boolean }) => {
      if (!draft) return;

      const without = items.filter(
        (i) =>
          !(i.objectId === draft.objectId && i.kind === draft.kind && i.id !== draft.id),
      );
      const withoutSameId = without.filter((i) => i.id !== draft.id);
      const nextDraft: SlideAnimation = {
        ...draft,
        repeat:
          draft.kind === 'action'
            ? Math.max(1, Math.min(30, Math.round(Number(draft.repeat) || 1)))
            : 1,
      };
      const merged = [...withoutSameId, nextDraft];
      if (!opts?.acceptAutoOrder && !isAnimationOrderValid(merged, normalizeOpts())) {
        setConfirm({ kind: 'order-invalid' });
        return;
      }

      const root = objectMode?.root;
      if (root) {
        const el = findByObjectId(root, draft.objectId);
        if (el) {
          setObjectLabel(el, labelEdit);
          objectMode?.selectElement(el);
        }
        if (onHtmlPersist) {
          await onHtmlPersist(serializeLessonRoot(root));
        }
      }

      const nextItems = normalizeAnimationList(merged, normalizeOpts());
      const ok = await persistDoc({ version: 1, items: nextItems });
      if (ok) {
        setConfirm(null);
        setDirty(false);
        setLevel('list');
        setDraft(null);
        setFocusedAnimId(nextDraft.id);
      }
    },
    [draft, objectMode, labelEdit, items, onHtmlPersist, persistDoc, normalizeOpts],
  );

  const deleteDraft = useCallback(async () => {
    if (!draft) return;
    const nextItems = items.filter((i) => i.id !== draft.id);
    const ok = await persistDoc({ version: 1, items: nextItems });
    if (ok) {
      setDirty(false);
      setLevel('list');
      setDraft(null);
      setFocusedAnimId(null);
    }
  }, [draft, items, persistDoc]);

  saveRef.current = () => saveDraft();
  deleteRef.current = deleteDraft;

  useEffect(() => {
    registerSave?.(() => saveRef.current());
  }, [registerSave]);

  useEffect(() => {
    registerDelete?.(() => deleteRef.current());
  }, [registerDelete]);

  const tryBack = () => {
    if (dirty) {
      setConfirm({ kind: 'discard' });
      return;
    }
    setDirty(false);
    setDraft(null);
    setLevel('list');
  };

  const confirmDiscard = () => {
    setConfirm(null);
    setDirty(false);
    setDraft(null);
    setLevel('list');
  };

  const updateStart = async (id: string, start: AnimStart) => {
    const next = items.map((it, idx) => {
      if (it.id !== id) return it;
      if (idx === 0 && start === 'after-previous') return { ...it, start: 'on-key' as const };
      if (idx === 0 && start === 'with-previous') return { ...it, start, order: 0 };
      return { ...it, start };
    });
    await persistDoc({ version: 1, items: next });
  };

  const removeItem = (id: string) => {
    setConfirm({ kind: 'remove', id });
  };

  const confirmRemove = async () => {
    if (!confirm || confirm.kind !== 'remove') return;
    const id = confirm.id;
    setConfirm(null);
    const nextItems = items.filter((i) => i.id !== id);
    const ok = await persistDoc({ version: 1, items: nextItems });
    if (ok && focusedAnimId === id) setFocusedAnimId(null);
  };

  const moveItem = async (id: string, dir: -1 | 1) => {
    const list = [...items].sort((a, b) => a.order - b.order);
    const idx = list.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    const a = list[idx]!;
    const b = list[swap]!;
    const ao = a.order;
    const bo = b.order;
    const proposed = list.map((it, i) => {
      if (i === idx) return { ...a, order: bo === 0 ? 1 : bo };
      if (i === swap) return { ...b, order: ao === 0 ? 1 : ao };
      return it;
    });
    if (!isAnimationOrderValid(proposed, normalizeOpts())) {
      setOrderToast(tr('animOrderBlocked'));
      return;
    }
    await persistDoc({ version: 1, items: proposed });
  };

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center text-[12px] text-[var(--ink-muted)]">
        …
      </div>
    );
  }

  if (level === 'detail' && draft) {
    const def = getEffectDef(draft.effectId);
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--line)] px-3 py-2">
          <button
            type="button"
            onClick={tryBack}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {tr('animBackToList')}
          </button>
          <span className="truncate text-[12px] font-semibold text-[var(--ink)]">
            {def?.label ?? draft.effectId} · {draft.kind}
          </span>
        </div>
        {error && (
          <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">
            {error}
          </div>
        )}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr('animObjectId')}>
              <div className="truncate rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 font-mono text-[11px] font-semibold text-[var(--ink)]">
                {draft.objectId}
              </div>
            </Field>
            <Field label={tr('animOrder')}>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={draft.order}
                onChange={(e) => {
                  setDraft({ ...draft, order: Number(e.target.value) || 0 });
                  setDirty(true);
                }}
              />
            </Field>
          </div>
          <Field label={tr('animObjectLabel')} hint={tr('animObjectLabelHint')}>
            <input
              className={inputClass}
              value={labelEdit}
              onChange={(e) => {
                setLabelEdit(e.target.value);
                setDirty(true);
              }}
              placeholder={tr('animObjectLabelPlaceholder')}
            />
          </Field>
          <Field label={tr('animDuration')}>
            <input
              type="number"
              min={0.1}
              max={30}
              step={0.1}
              className={inputClass}
              value={draft.durationSec}
              onChange={(e) => {
                setDraft({
                  ...draft,
                  durationSec: Math.max(0.1, Number(e.target.value) || 0.5),
                });
                setDirty(true);
              }}
            />
          </Field>
          {draft.kind === 'action' && (
            <Field label={tr('animRepeat')} hint={tr('animRepeatHint')}>
              <input
                type="number"
                min={1}
                max={30}
                step={1}
                className={inputClass}
                value={draft.repeat ?? 1}
                onChange={(e) => {
                  setDraft({
                    ...draft,
                    repeat: Math.max(1, Math.min(30, Math.round(Number(e.target.value) || 1))),
                  });
                  setDirty(true);
                }}
              />
            </Field>
          )}
          {(def?.params ?? []).map((spec) => (
            <Field key={spec.key} label={spec.label}>
              <select
                className={inputClass}
                value={
                  (draft.params[spec.key as keyof SlideAnimationParams] as string) ?? ''
                }
                onChange={(e) => {
                  setDraft({
                    ...draft,
                    params: {
                      ...draft.params,
                      [spec.key]: e.target.value,
                    },
                  });
                  setDirty(true);
                }}
              >
                {spec.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        </div>
        <AnimConfirmModal
          open={confirm?.kind === 'discard'}
          title={tr('animDiscardTitle')}
          body={tr('animUnsavedConfirm')}
          confirmLabel={tr('animDiscardConfirm')}
          danger
          onClose={() => setConfirm(null)}
          onConfirm={confirmDiscard}
        />
        <AnimConfirmModal
          open={confirm?.kind === 'order-invalid'}
          title={tr('animOrderInvalidTitle')}
          body={tr('animOrderInvalidBody')}
          confirmLabel={tr('animOrderSaveAsLast')}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            void saveDraft({ acceptAutoOrder: true });
          }}
        />
        <AnimOrderToast message={orderToast} onDismiss={() => setOrderToast(null)} />
      </div>
    );
  }

  const library = effectsForKind(libraryTab);
  const libraryEnabled = Boolean(objectMode?.selected);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error && (
        <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">
          {error}
        </div>
      )}
      {!objectMode?.selected && !objectMode?.picking && (
        <div className="shrink-0 space-y-2 border-b border-[var(--line)] px-3 py-2">
          {!libraryEnabled && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
              {tr('animLibrarySelectFirst')}
            </p>
          )}
          <button
            type="button"
            onClick={() => objectMode?.startPicking()}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110"
          >
            <Crosshair className="h-3.5 w-3.5" />
            {tr('animPickButton')}
          </button>
        </div>
      )}
      {objectMode?.picking && (
        <div className="shrink-0 space-y-2 border-b border-[var(--accent)] bg-[var(--accent-soft)]/60 px-3 py-2">
          <p className="text-[11px] text-[var(--ink-muted)]">{tr('animPickHint')}</p>
          <button
            type="button"
            onClick={() => objectMode.stopPicking()}
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] hover:bg-black/5"
          >
            {tr('animPickCancel')}
          </button>
        </div>
      )}
      {objectMode?.selected && !objectMode?.picking && (
        <div className="shrink-0 space-y-2 border-b border-[var(--line)] px-3 py-2">
          <div className="text-[11px]">
            <span className="font-semibold text-[var(--accent)]">{tr('animSelected')}: </span>
            <span className="text-[var(--ink)]">{objectMode.selected.label}</span>
          </div>
          <button
            type="button"
            onClick={() => objectMode.startPicking()}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[var(--accent)] bg-[var(--panel)] px-3 py-1.5 text-[12px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            <Crosshair className="h-3.5 w-3.5" />
            {tr('animPickButton')}
          </button>
        </div>
      )}
      {!objectMode && (
        <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">
          {tr('animPickUnavailable')}
        </div>
      )}

      <div
        className={`flex min-h-0 shrink-0 flex-col border-b border-[var(--line)] ${
          libraryEnabled ? '' : 'opacity-55'
        }`}
      >
        <div className="shrink-0 px-3 pt-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {tr('animEffectLibrary')}
          </div>
        </div>
        <div className="flex shrink-0 gap-1 px-3 py-1.5">
          {(['entrance', 'action', 'exit'] as AnimKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => selectLibraryTab(k)}
              className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold ${
                libraryTab === k
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--ink-muted)] hover:bg-black/5'
              }`}
            >
              {k === 'entrance'
                ? tr('animTabEntrance')
                : k === 'action'
                  ? tr('animTabAction')
                  : tr('animTabExit')}
            </button>
          ))}
        </div>
        <div
          className={`max-h-[7.75rem] overflow-y-auto px-3 pb-2 ${
            libraryEnabled ? '' : 'pointer-events-none'
          }`}
          aria-disabled={!libraryEnabled}
        >
          <div className="grid grid-cols-2 gap-1.5">
            {library.map((fx) => {
              const applied = appliedEffectsForSelection.get(fx.kind) === fx.id;
              return (
                <button
                  key={fx.id}
                  type="button"
                  disabled={!libraryEnabled}
                  onClick={() => void applyEffectFromLibrary(fx.id, fx.kind)}
                  className={`rounded-lg border px-2 py-2 text-left text-[11px] font-semibold disabled:cursor-not-allowed ${
                    applied
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]'
                      : 'border-[var(--line)] bg-[var(--stage)] text-[var(--ink)] enabled:cursor-pointer enabled:hover:border-[var(--accent)] enabled:hover:bg-[var(--accent-soft)]/40'
                  }`}
                >
                  {fx.label}
                  {applied ? (
                    <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wide opacity-80">
                      {tr('animEffectApplied')}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between px-3 pt-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            {tr('animAnimationList')}
          </div>
          {saving && (
            <span className="text-[10px] text-[var(--ink-muted)]">{tr('animSaving')}</span>
          )}
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
          {items.length === 0 && (
            <p className="px-2 text-[11px] text-[var(--ink-muted)]">{tr('animListEmpty')}</p>
          )}
          {items.map((it, idx) => {
            const def = getEffectDef(it.effectId);
            const grouped =
              it.start === 'after-previous' || it.start === 'with-previous';
            const focused = focusedAnimId === it.id;
            const kindLabel =
              it.kind === 'entrance'
                ? tr('animKindEntrance')
                : it.kind === 'action'
                  ? tr('animKindAction')
                  : tr('animKindExit');
            const kindTone =
              it.kind === 'entrance'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : it.kind === 'action'
                  ? 'bg-sky-100 text-sky-800 border-sky-200'
                  : 'bg-rose-100 text-rose-800 border-rose-200';
            return (
              <div
                key={it.id}
                role="button"
                tabIndex={0}
                ref={(node) => {
                  if (focused && node) {
                    node.scrollIntoView({ block: 'nearest' });
                  }
                }}
                onClick={() => focusAnim(it)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    focusAnim(it);
                  }
                }}
                className={`cursor-pointer rounded-lg border px-2 py-1.5 ${
                  focused
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]/50'
                    : 'border-[var(--line)] bg-[var(--panel)]'
                } ${grouped ? 'ml-3 border-l-2 border-l-[var(--accent)]' : ''}`}
              >
                <div className="flex items-start gap-1">
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <button
                      type="button"
                      title="Move up"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        void moveItem(it.id, -1);
                      }}
                      className="cursor-pointer rounded p-0.5 text-[var(--ink-muted)] hover:bg-black/5 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      disabled={idx === items.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        void moveItem(it.id, 1);
                      }}
                      className="cursor-pointer rounded p-0.5 text-[var(--ink-muted)] hover:bg-black/5 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 text-[11px]">
                      <span className="shrink-0 font-mono font-bold text-[var(--accent)]">
                        #{it.order}
                      </span>
                      <span className="truncate text-[12px] font-bold text-[var(--ink)]">
                        {displayNameFor(it.objectId)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${kindTone}`}
                      >
                        {kindLabel}
                      </span>
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700">
                        {def?.label ?? it.effectId}
                      </span>
                    </div>
                    <select
                      className="mt-1.5 w-full rounded border border-[var(--line)] bg-[var(--stage)] px-1.5 py-1 text-[10px]"
                      value={it.start}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        void updateStart(it.id, e.target.value as AnimStart)
                      }
                    >
                      <option value="on-key">{onKeyLabel}</option>
                      <option value="after-previous" disabled={idx === 0}>
                        {tr('animStartAfter')}
                      </option>
                      <option value="with-previous">{tr('animStartWith')}</option>
                    </select>
                  </div>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      title={tr('animEdit')}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(it);
                      }}
                      className="cursor-pointer rounded p-1 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title={tr('animDeleteList')}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(it.id);
                      }}
                      className="cursor-pointer rounded p-1 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimConfirmModal
        open={confirm?.kind === 'remove'}
        title={tr('animRemoveTitle')}
        body={tr('animRemoveConfirm')}
        confirmLabel={tr('animDeleteList')}
        danger
        onClose={() => setConfirm(null)}
        onConfirm={() => void confirmRemove()}
      />
      <AnimOrderToast message={orderToast} onDismiss={() => setOrderToast(null)} />
    </div>
  );
}

function AnimOrderToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto fixed left-1/2 top-4 z-[200] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2"
        >
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-[var(--shadow)]">
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-amber-950">{message}</p>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="shrink-0 cursor-pointer rounded-md p-1 text-amber-900/70 hover:bg-amber-100 hover:text-amber-950"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AnimConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { tr } = usePrefs();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label={tr('cancel')}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="relative w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--stage)] p-5 shadow-[var(--shadow)]"
          >
            <h2 className="text-[15px] font-semibold text-[var(--ink)]">{title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">{body}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-md border border-[var(--line)] px-3 py-1.5 text-[12px] font-medium text-[var(--ink)] hover:bg-[var(--panel)]"
              >
                {tr('cancel')}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 ${
                  danger ? 'bg-[var(--danger,#b42318)]' : 'bg-[var(--accent)]'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const inputClass =
  'w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
        {label}
      </span>
      {hint ? <span className="block text-[10px] text-[var(--ink-muted)]">{hint}</span> : null}
      {children}
    </label>
  );
}
