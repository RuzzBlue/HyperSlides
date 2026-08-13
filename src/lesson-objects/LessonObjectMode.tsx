import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Pencil } from 'lucide-react';
import { usePrefs } from '../prefs/PrefsProvider';
import {
  deepestSelectable,
  ensureObjectId,
  findByObjectId,
  objectBreadcrumb,
  objectLabel,
  selectableParent,
  stampObjectIds,
} from './selection';

export type LessonObjectSelection = {
  element: HTMLElement;
  objectId: string;
  label: string;
};

type HighlightBox = { top: number; left: number; width: number; height: number };

type LessonObjectModeContextValue = {
  active: boolean;
  picking: boolean;
  /** 'pick' = animations one-shot pick; 'edit' = always-on Elementor-like hover. */
  interaction: 'pick' | 'edit';
  startPicking: () => void;
  stopPicking: () => void;
  root: HTMLElement | null;
  setRoot: (el: HTMLElement | null) => void;
  hovered: LessonObjectSelection | null;
  setHovered: (sel: LessonObjectSelection | null) => void;
  selected: LessonObjectSelection | null;
  selectElement: (el: HTMLElement | null) => void;
  selectParent: () => void;
  selectByObjectId: (objectId: string) => void;
  breadcrumb: LessonObjectSelection[];
  stampIds: () => boolean;
  /** Bumps when the user finishes a stage pick (not cancel). */
  pickEpoch: number;
  signalPicked: () => void;
  onEditRequest?: (sel: LessonObjectSelection) => void;
  onDomMutated?: (html: string) => void;
};

const LessonObjectModeContext = createContext<LessonObjectModeContextValue | null>(null);

function toSelection(el: HTMLElement): LessonObjectSelection {
  const objectId = ensureObjectId(el);
  return { element: el, objectId, label: objectLabel(el) };
}

export function LessonObjectModeProvider({
  active,
  interaction = 'pick',
  autoStartPicking = true,
  onEditRequest,
  onDomMutated,
  children,
}: {
  active: boolean;
  interaction?: 'pick' | 'edit';
  /** When true, entering active mode starts pick mode (animations). */
  autoStartPicking?: boolean;
  onEditRequest?: (sel: LessonObjectSelection) => void;
  onDomMutated?: (html: string) => void;
  children: ReactNode;
}) {
  const [root, setRootState] = useState<HTMLElement | null>(null);
  const [picking, setPicking] = useState(false);
  const [hovered, setHovered] = useState<LessonObjectSelection | null>(null);
  const [selected, setSelected] = useState<LessonObjectSelection | null>(null);
  const [pickEpoch, setPickEpoch] = useState(0);

  const setRoot = useCallback((el: HTMLElement | null) => {
    setRootState((prev) => (prev === el ? prev : el));
  }, []);

  const signalPicked = useCallback(() => {
    setPickEpoch((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!active) {
      setPicking(false);
      setHovered(null);
      setSelected(null);
      return;
    }
    // Edit mode: always hoverable (treat as continuous picking without banner).
    if (interaction === 'edit') {
      setPicking(true);
      return;
    }
    setPicking(Boolean(autoStartPicking));
  }, [active, autoStartPicking, interaction]);

  const selectElement = useCallback((el: HTMLElement | null) => {
    if (!el) {
      setSelected(null);
      return;
    }
    setSelected(toSelection(el));
  }, []);

  const selectParent = useCallback(() => {
    if (!selected || !root) return;
    const parent = selectableParent(selected.element, root);
    if (parent) selectElement(parent);
  }, [selected, root, selectElement]);

  const selectByObjectId = useCallback(
    (objectId: string) => {
      if (!root) return;
      const el = findByObjectId(root, objectId);
      if (el) selectElement(el);
    },
    [root, selectElement],
  );

  const stampIds = useCallback(() => {
    if (!root) return false;
    const changed = stampObjectIds(root);
    if (changed && onDomMutated) onDomMutated(root.innerHTML);
    return changed;
  }, [root, onDomMutated]);

  const startPicking = useCallback(() => {
    if (!active) return;
    setPicking(true);
  }, [active]);

  const stopPicking = useCallback(() => {
    setPicking(false);
    setHovered(null);
  }, []);

  const breadcrumb = useMemo(() => {
    if (!selected || !root) return [];
    return objectBreadcrumb(selected.element, root).map(toSelection);
  }, [selected, root]);

  const value = useMemo<LessonObjectModeContextValue>(
    () => ({
      active,
      picking,
      interaction,
      startPicking,
      stopPicking,
      root,
      setRoot,
      hovered,
      setHovered,
      selected,
      selectElement,
      selectParent,
      selectByObjectId,
      breadcrumb,
      stampIds,
      pickEpoch,
      signalPicked,
      onEditRequest,
      onDomMutated,
    }),
    [
      active,
      picking,
      interaction,
      startPicking,
      stopPicking,
      root,
      setRoot,
      hovered,
      selected,
      selectElement,
      selectParent,
      selectByObjectId,
      breadcrumb,
      stampIds,
      pickEpoch,
      signalPicked,
      onEditRequest,
      onDomMutated,
    ],
  );

  return (
    <LessonObjectModeContext.Provider value={value}>{children}</LessonObjectModeContext.Provider>
  );
}

export function useLessonObjectMode(): LessonObjectModeContextValue {
  const ctx = useContext(LessonObjectModeContext);
  if (!ctx) {
    throw new Error('useLessonObjectMode must be used within LessonObjectModeProvider');
  }
  return ctx;
}

export function useLessonObjectModeOptional(): LessonObjectModeContextValue | null {
  return useContext(LessonObjectModeContext);
}

function relativeBox(el: HTMLElement, container: HTMLElement): HighlightBox {
  const er = el.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  return {
    top: er.top - cr.top,
    left: er.left - cr.left,
    width: er.width,
    height: er.height,
  };
}

function hitFromPoint(
  clientX: number,
  clientY: number,
  root: HTMLElement,
): HTMLElement | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    if (!(el instanceof Element)) continue;
    if (el.closest?.('.hc-obj-picker-ui, [data-hc-obj-overlay], [data-inspector-panel]')) {
      continue;
    }
    if (!root.contains(el)) continue;
    const deep = deepestSelectable(el, root);
    if (deep) return deep;
    if (el instanceof HTMLElement) return el;
  }
  return null;
}

/**
 * Stage-local DevTools-style picker. Visual overlay only (does not block scroll).
 * Hit-testing listens on the lesson scroller so wheel/trackpad scroll stays free.
 */
export function LessonPickOverlay() {
  const mode = useLessonObjectModeOptional();
  const { tr } = usePrefs();
  const [hoverBox, setHoverBox] = useState<HighlightBox | null>(null);
  const [selectedBox, setSelectedBox] = useState<HighlightBox | null>(null);

  useEffect(() => {
    if (!mode?.active || !mode.selected?.element?.isConnected || !mode.root) {
      setSelectedBox(null);
      return;
    }
    const host = mode.root.closest('.lesson-theme-root') as HTMLElement | null;
    if (!host) return;
    const sync = () => {
      if (mode.selected?.element?.isConnected) {
        setSelectedBox(relativeBox(mode.selected.element, host));
      }
    };
    sync();
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [mode?.active, mode?.selected, mode?.root]);

  // Pick listeners on the scroll container — scroll stays native
  useEffect(() => {
    if (!mode?.active || !mode.picking || !mode.root) return;
    const host = mode.root.closest('.lesson-theme-root') as HTMLElement | null;
    const scroller =
      (host?.querySelector('.overflow-y-auto') as HTMLElement | null) ?? host ?? mode.root;

    const onMove = (e: PointerEvent) => {
      const deep = hitFromPoint(e.clientX, e.clientY, mode.root!);
      if (!deep) {
        mode.setHovered(null);
        setHoverBox(null);
        return;
      }
      const next = toSelection(deep);
      if (mode.hovered?.objectId !== next.objectId) {
        mode.setHovered(next);
      }
      if (host) setHoverBox(relativeBox(deep, host));
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Element | null;
      if (target?.closest?.('.hc-obj-picker-ui [data-hc-pick-chrome]')) return;
      const deep = hitFromPoint(e.clientX, e.clientY, mode.root!);
      if (!deep) return;
      e.preventDefault();
      e.stopPropagation();
      mode.selectElement(deep);
      mode.signalPicked();
      if (mode.interaction === 'edit') {
        // Stay in continuous hover; open inspector for this element.
        mode.onEditRequest?.(toSelection(deep));
        setHoverBox(null);
        return;
      }
      mode.stopPicking();
      setHoverBox(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (mode.interaction === 'edit') {
          mode.selectElement(null);
          mode.setHovered(null);
          setHoverBox(null);
          return;
        }
        mode.stopPicking();
        setHoverBox(null);
      }
    };

    scroller.addEventListener('pointermove', onMove, true);
    scroller.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    document.body.classList.add('hc-obj-picking');
    return () => {
      scroller.removeEventListener('pointermove', onMove, true);
      scroller.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
      document.body.classList.remove('hc-obj-picking');
    };
  }, [mode]);

  if (!mode?.active) return null;

  const isEdit = mode.interaction === 'edit';
  const showPickBanner = mode.picking && !isEdit;
  const box = mode.picking || isEdit ? (mode.picking ? hoverBox : selectedBox) : selectedBox;
  const liveBox =
    isEdit && mode.hovered
      ? hoverBox
      : isEdit && mode.selected
        ? selectedBox
        : box;
  const handleSel = isEdit ? mode.hovered ?? mode.selected : mode.selected;
  const label = mode.picking && !isEdit ? mode.hovered?.label : handleSel?.label;

  return (
    <div
      className="hc-obj-picker-ui pointer-events-none absolute inset-0 z-[50]"
      data-hc-obj-overlay
    >
      {showPickBanner && (
        <div className="absolute inset-x-3 top-3 z-[1] flex justify-center">
          <div className="max-w-[min(520px,100%)] rounded-lg border border-[var(--accent)] bg-[var(--panel)]/95 px-3 py-2 text-center text-[12px] shadow-lg backdrop-blur">
            <div className="font-semibold text-[var(--accent)]">{tr('animPickActive')}</div>
            <div className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
              {mode.root ? tr('animPickHint') : tr('animPickWaitingRoot')}
            </div>
            {label ? (
              <div className="mt-1 truncate text-[11px] font-medium text-[var(--ink)]">{label}</div>
            ) : null}
          </div>
        </div>
      )}

      {!isEdit && !showPickBanner && mode.selected && (
        <div
          data-hc-pick-chrome
          className="pointer-events-auto absolute left-3 top-3 z-[1] flex max-w-[min(420px,90%)] flex-wrap items-center gap-1.5"
        >
          <div className="flex items-center gap-1 rounded-lg border border-[var(--accent)] bg-[var(--panel)]/95 px-2 py-1 text-[11px] shadow-md backdrop-blur">
            <button
              type="button"
              className="cursor-pointer rounded px-1.5 py-0.5 font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-40"
              disabled={mode.breadcrumb.length <= 1}
              onClick={() => mode.selectParent()}
            >
              ↑ Parent
            </button>
            <span className="text-[var(--ink-muted)]">|</span>
            <span className="truncate font-medium text-[var(--ink)]" title={mode.selected.objectId}>
              {mode.selected.label}
            </span>
          </div>
        </div>
      )}

      {liveBox && liveBox.width > 0 && liveBox.height > 0 && (
        <>
          <div
            className={`absolute z-0 rounded-sm ${
              isEdit || mode.picking
                ? 'border-2 border-dashed border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]'
                : 'border-2 border-solid border-[var(--accent)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_18%,transparent)]'
            }`}
            style={{
              top: liveBox.top,
              left: liveBox.left,
              width: liveBox.width,
              height: liveBox.height,
            }}
          />
          {isEdit && handleSel && (
            <div
              data-hc-pick-chrome
              className="pointer-events-auto absolute z-[2]"
              style={{
                top: Math.max(0, liveBox.top - 28),
                left: liveBox.left,
              }}
            >
              <button
                type="button"
                title={tr('elementsEditHandle')}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  mode.selectElement(handleSel.element);
                  mode.signalPicked();
                  mode.onEditRequest?.(handleSel);
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded-t-md border border-b-0 border-[var(--accent)] bg-[var(--accent)] px-2 py-1 text-[10px] font-semibold text-white shadow-sm hover:brightness-110"
              >
                <Pencil className="h-3 w-3" />
                <span className="max-w-[10rem] truncate">{handleSel.label}</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { HC_OBJ_ATTR } from './selection';
