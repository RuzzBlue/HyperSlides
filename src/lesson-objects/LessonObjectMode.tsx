import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { usePrefs } from '../prefs/PrefsProvider';
import { StructureDeleteModal } from '../components/structure/StructureModals';
import {
  deepestSelectable,
  ensureObjectId,
  findByObjectId,
  objectBreadcrumb,
  objectLabel,
  selectableParent,
  stampObjectIds,
} from './selection';
import type { ElementCatalogItemId } from './elementCatalog';
import { insertCatalogItemAt } from './elementInsert';
import { serializeLessonRoot } from './lessonHtml';
import {
  canMoveDown,
  canMoveUp,
  deleteElement,
  duplicateElement,
  moveElementSibling,
  relocateElement,
} from './elementMutate';

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
  /** Active catalog card drag (Elements panel → stage). */
  catalogDrag: { itemId: string; label: string } | null;
  beginCatalogDrag: (itemId: string, label: string) => void;
  endCatalogDrag: () => void;
  showNotice: (message: string) => void;
  /** Active stage element reorder drag (grip handle). */
  elementDrag: { objectId: string; label: string } | null;
  beginElementDrag: (objectId: string, label: string) => void;
  endElementDrag: () => void;
  /** When false (edit mode), hide the selected-element outline so styles/effects are visible. */
  showSelectionOutline: boolean;
  setShowSelectionOutline: (show: boolean) => void;
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
  const [catalogDrag, setCatalogDrag] = useState<{ itemId: string; label: string } | null>(
    null,
  );
  const [elementDrag, setElementDrag] = useState<{ objectId: string; label: string } | null>(
    null,
  );
  const { settings } = usePrefs();
  const [showSelectionOutline, setShowSelectionOutline] = useState(
    () => settings.defaultShowSelected !== false,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const setRoot = useCallback((el: HTMLElement | null) => {
    setRootState((prev) => (prev === el ? prev : el));
  }, []);

  const signalPicked = useCallback(() => {
    setPickEpoch((n) => n + 1);
  }, []);

  const beginCatalogDrag = useCallback((itemId: string, label: string) => {
    setCatalogDrag({ itemId, label });
  }, []);

  const endCatalogDrag = useCallback(() => {
    setCatalogDrag(null);
  }, []);

  const beginElementDrag = useCallback((objectId: string, label: string) => {
    setElementDrag({ objectId, label });
  }, []);

  const endElementDrag = useCallback(() => {
    setElementDrag(null);
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
    // Stamp only — do not auto-persist. Persisting here races with slide navigation
    // (root can still hold the previous lesson while current.key already changed).
    return stampObjectIds(root);
  }, [root]);

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
      catalogDrag,
      beginCatalogDrag,
      endCatalogDrag,
      elementDrag,
      beginElementDrag,
      endElementDrag,
      showSelectionOutline,
      setShowSelectionOutline,
      showNotice,
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
      catalogDrag,
      beginCatalogDrag,
      endCatalogDrag,
      elementDrag,
      beginElementDrag,
      endElementDrag,
      showSelectionOutline,
      setShowSelectionOutline,
      showNotice,
    ],
  );

  return (
    <LessonObjectModeContext.Provider value={value}>
      {children}
      {notice &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-[240] flex items-center justify-center px-6">
            <div className="pointer-events-auto max-w-md rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-5 py-4 text-center shadow-2xl">
              <p className="text-[13px] font-medium leading-relaxed text-[var(--ink)]">{notice}</p>
            </div>
          </div>,
          document.body,
        )}
    </LessonObjectModeContext.Provider>
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

/** Clears stage selection when the inspector closes while staying in edit mode. */
export function ClearLessonSelectionWhenInspectorClosed({
  inspectorOpen,
}: {
  inspectorOpen: boolean;
}) {
  const mode = useLessonObjectModeOptional();
  const { settings } = usePrefs();
  const prevOpen = useRef(inspectorOpen);
  const defaultShow = settings.defaultShowSelected !== false;

  useEffect(() => {
    if (!mode || mode.interaction !== 'edit') {
      prevOpen.current = inspectorOpen;
      return;
    }
    if (prevOpen.current && !inspectorOpen) {
      mode.selectElement(null);
      mode.setShowSelectionOutline(defaultShow);
    }
    prevOpen.current = inspectorOpen;
  }, [inspectorOpen, mode, defaultShow]);

  return null;
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
  const { tr, trf, settings } = usePrefs();
  const [hoverBox, setHoverBox] = useState<HighlightBox | null>(null);
  const [selectedBox, setSelectedBox] = useState<HighlightBox | null>(null);
  const [dropMark, setDropMark] = useState<{
    top: number;
    left: number;
    width: number;
    position: 'before' | 'after';
  } | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LessonObjectSelection | null>(null);

  // Keep highlight boxes locked to elements while the lesson scrolls.
  useEffect(() => {
    if (!mode?.active || !mode.root) {
      setSelectedBox(null);
      setHoverBox(null);
      return;
    }
    const host = mode.root.closest('.lesson-theme-root') as HTMLElement | null;
    if (!host) return;
    const scroller =
      (host.querySelector('.overflow-y-auto') as HTMLElement | null) ?? host;

    const sync = () => {
      if (mode.selected?.element?.isConnected) {
        setSelectedBox(relativeBox(mode.selected.element, host));
      } else {
        setSelectedBox(null);
      }
      if (mode.hovered?.element?.isConnected) {
        setHoverBox(relativeBox(mode.hovered.element, host));
      } else if (!mode.picking) {
        setHoverBox(null);
      }
    };

    sync();
    scroller.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      scroller.removeEventListener('scroll', sync);
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [mode?.active, mode?.selected, mode?.hovered, mode?.picking, mode?.root]);

  // Catalog / element drag ghost + cleanup
  useEffect(() => {
    if (!mode?.catalogDrag && !mode?.elementDrag) {
      setGhostPos(null);
      setDropMark(null);
      return;
    }
    const onDragOver = (e: DragEvent) => {
      if (e.clientX === 0 && e.clientY === 0) return;
      setGhostPos({ x: e.clientX, y: e.clientY });
    };
    const onEnd = () => {
      mode.endCatalogDrag();
      mode.endElementDrag();
      setDropMark(null);
      setGhostPos(null);
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragend', onEnd);
    window.addEventListener('drop', onEnd);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragend', onEnd);
      window.removeEventListener('drop', onEnd);
    };
  }, [mode, mode?.catalogDrag, mode?.elementDrag]);

  // Pick listeners on the scroll container — scroll stays native
  useEffect(() => {
    if (!mode?.active || !mode.picking || !mode.root) return;
    const host = mode.root.closest('.lesson-theme-root') as HTMLElement | null;
    const scroller =
      (host?.querySelector('.overflow-y-auto') as HTMLElement | null) ?? host ?? mode.root;

    const clearHover = () => {
      mode.setHovered(null);
      setHoverBox(null);
    };

    const onMove = (e: PointerEvent) => {
      if (mode.catalogDrag || mode.elementDrag) return;
      const target = e.target as Element | null;
      // Keep hover stable while the pointer is on the edit chrome (tabs sit outside the scroller)
      if (target?.closest?.('.hc-obj-picker-ui [data-hc-pick-chrome]')) return;
      const deep = hitFromPoint(e.clientX, e.clientY, mode.root!);
      if (!deep) {
        clearHover();
        return;
      }
      const next = toSelection(deep);
      if (mode.hovered?.objectId !== next.objectId) {
        mode.setHovered(next);
      }
      if (host) setHoverBox(relativeBox(deep, host));
    };

    const onLeave = (e: PointerEvent) => {
      const related = e.relatedTarget as Element | null;
      if (scroller.contains(related as Node)) return;
      // Overlay chrome is a sibling of the scroller — don't drop hover when moving onto it
      if (related?.closest?.('.hc-obj-picker-ui, [data-hc-obj-overlay]')) return;
      clearHover();
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Element | null;
      if (target?.closest?.('.hc-obj-picker-ui [data-hc-pick-chrome]')) return;
      if (mode.catalogDrag || mode.elementDrag) return;
      const deep = hitFromPoint(e.clientX, e.clientY, mode.root!);
      if (!deep) return;
      e.preventDefault();
      e.stopPropagation();
      mode.selectElement(deep);
      mode.signalPicked();
      if (mode.interaction === 'edit') {
        mode.onEditRequest?.(toSelection(deep));
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

    const updateDropMark = (clientX: number, clientY: number) => {
      if (!host || !mode.root) {
        setDropMark(null);
        return;
      }
      const deep = hitFromPoint(clientX, clientY, mode.root);
      if (!deep) {
        setDropMark(null);
        return;
      }
      // Don't show a drop line on the dragged element itself
      if (mode.elementDrag && deep.getAttribute('data-hc-obj') === mode.elementDrag.objectId) {
        setDropMark(null);
        return;
      }
      if (mode.elementDrag) {
        const dragging = findByObjectId(mode.root, mode.elementDrag.objectId);
        if (dragging && (dragging === deep || dragging.contains(deep))) {
          setDropMark(null);
          return;
        }
      }
      const box = relativeBox(deep, host);
      const er = deep.getBoundingClientRect();
      const mid = er.top + er.height / 2;
      const position: 'before' | 'after' = clientY < mid ? 'before' : 'after';
      setDropMark({
        top: position === 'before' ? box.top : box.top + box.height,
        left: box.left,
        width: box.width,
        position,
      });
      mode.setHovered(toSelection(deep));
      setHoverBox(box);
    };

    const onDragOver = (e: DragEvent) => {
      if (!mode.catalogDrag && !mode.elementDrag) return;
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = mode.elementDrag ? 'move' : 'copy';
      }
      updateDropMark(e.clientX, e.clientY);
    };

    const onDrop = (e: DragEvent) => {
      if (!mode.root || !host) return;
      if (!mode.catalogDrag && !mode.elementDrag) return;
      e.preventDefault();
      e.stopPropagation();

      const deep = hitFromPoint(e.clientX, e.clientY, mode.root);
      const position: 'before' | 'after' =
        deep && e.clientY < deep.getBoundingClientRect().top + deep.getBoundingClientRect().height / 2
          ? 'before'
          : 'after';

      if (mode.elementDrag) {
        const moving = findByObjectId(mode.root, mode.elementDrag.objectId);
        mode.endElementDrag();
        setDropMark(null);
        setGhostPos(null);
        if (moving && deep && relocateElement(moving, deep, position)) {
          mode.onDomMutated?.(serializeLessonRoot(mode.root));
          mode.selectElement(moving);
          mode.signalPicked();
          mode.onEditRequest?.(toSelection(moving));
        }
        return;
      }

      const itemId = ((e.dataTransfer?.getData('application/x-hc-element') ||
        mode.catalogDrag!.itemId) ?? '') as ElementCatalogItemId;
      const result = insertCatalogItemAt(mode.root, itemId, deep, position);
      mode.endCatalogDrag();
      setDropMark(null);
      setGhostPos(null);
      if (result && result.ok === false) {
        mode.showNotice(tr('elementsTemplateLocked'));
        return;
      }
      const node = result?.ok ? result.node : null;
      if (node) {
        mode.stampIds();
        mode.onDomMutated?.(serializeLessonRoot(mode.root));
        mode.selectElement(node);
        mode.signalPicked();
      }
    };

    const onDragLeave = (e: DragEvent) => {
      if (!scroller.contains(e.relatedTarget as Node)) setDropMark(null);
    };

    const stage = mode.root.closest('.lesson-stage') as HTMLElement | null;
    stage?.classList.add('hc-obj-picking');
    mode.root.classList.add('hc-obj-picking');
    scroller.addEventListener('pointermove', onMove, true);
    scroller.addEventListener('pointerdown', onDown, true);
    scroller.addEventListener('pointerleave', onLeave, true);
    scroller.addEventListener('dragover', onDragOver, true);
    scroller.addEventListener('drop', onDrop, true);
    scroller.addEventListener('dragleave', onDragLeave, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      scroller.removeEventListener('pointermove', onMove, true);
      scroller.removeEventListener('pointerdown', onDown, true);
      scroller.removeEventListener('pointerleave', onLeave, true);
      scroller.removeEventListener('dragover', onDragOver, true);
      scroller.removeEventListener('drop', onDrop, true);
      scroller.removeEventListener('dragleave', onDragLeave, true);
      window.removeEventListener('keydown', onKey, true);
      stage?.classList.remove('hc-obj-picking');
      mode.root?.classList.remove('hc-obj-picking');
    };
  }, [mode, tr]);

  if (!mode?.active) return null;

  const isEdit = mode.interaction === 'edit';
  const showPickBanner = mode.picking && !isEdit;
  const liveBox = isEdit
    ? mode.hovered
      ? hoverBox
      : mode.showSelectionOutline
        ? selectedBox
        : null
    : mode.picking
      ? hoverBox
      : selectedBox;
  /** Action tab only while hovering — not when merely selected. */
  const tabSel = isEdit ? mode.hovered : null;
  /** Top-left popover: hover wins while pointer is over the stage; else selected. */
  const chromeSel = isEdit ? mode.hovered ?? mode.selected : mode.selected;
  const chromeCanParent =
    Boolean(chromeSel && mode.root && selectableParent(chromeSel.element, mode.root));
  const pickingLabel = mode.hovered?.label;
  // Edit: solid box on the clicked selection when not hovering; dashed while hovering others
  const showSolid = isEdit
    ? Boolean(mode.selected && !mode.hovered && mode.showSelectionOutline)
    : !mode.picking && Boolean(mode.selected);

  const persistMutation = (el?: HTMLElement | null) => {
    if (!mode.root) return;
    mode.onDomMutated?.(serializeLessonRoot(mode.root));
    if (el?.isConnected) {
      mode.selectElement(el);
      mode.setHovered(toSelection(el));
      mode.signalPicked();
      mode.onEditRequest?.(toSelection(el));
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget || !mode.root) {
      setDeleteTarget(null);
      return;
    }
    const wasSelected = mode.selected?.objectId === deleteTarget.objectId;
    if (deleteTarget.element.isConnected) deleteElement(deleteTarget.element);
    mode.setHovered(null);
    if (wasSelected) mode.selectElement(null);
    mode.onDomMutated?.(serializeLessonRoot(mode.root));
    setDeleteTarget(null);
  };

  const selectionChrome = (sel: NonNullable<typeof mode.selected>) => (
    <div
      data-hc-pick-chrome
      className="pointer-events-auto absolute left-3 top-3 z-[1] flex max-w-[min(480px,94%)] flex-wrap items-center gap-1.5"
    >
      <div className="flex items-center gap-1 rounded-lg border border-[var(--accent)] bg-[var(--panel)]/95 px-2 py-1 text-[11px] shadow-md backdrop-blur">
        <button
          type="button"
          className="cursor-pointer rounded px-1.5 py-0.5 font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-40"
          disabled={!chromeCanParent}
          onClick={() => {
            if (!mode.root) return;
            const parent = selectableParent(sel.element, mode.root);
            if (!parent) return;
            mode.selectElement(parent);
            mode.signalPicked();
            if (isEdit) mode.onEditRequest?.(toSelection(parent));
          }}
        >
          ↑ Parent
        </button>
        <span className="text-[var(--ink-muted)]">|</span>
        <span className="truncate font-medium text-[var(--ink)]" title={sel.objectId}>
          {sel.label}
        </span>
        {isEdit && settings.showSelectedShortcut !== false && (
          <>
            <span className="text-[var(--ink-muted)]">|</span>
            <label
              className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
              title={tr('inspectorShowSelected')}
            >
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={mode.showSelectionOutline}
                onChange={(e) => mode.setShowSelectionOutline(e.target.checked)}
              />
              <span>{tr('inspectorShowSelected')}</span>
            </label>
          </>
        )}
      </div>
    </div>
  );

  const tabBtn =
    'inline-flex h-6 w-6 items-center justify-center rounded text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <>
    <div
      className="hc-obj-picker-ui pointer-events-none absolute inset-0 z-[50]"
      data-hc-obj-overlay
    >
      {showPickBanner && (
        <div className="absolute left-3 top-3 z-[1] max-w-[min(420px,calc(100%-1.5rem))]">
          <div className="rounded-lg border border-[var(--accent)] bg-[var(--panel)]/95 px-2.5 py-1.5 text-[11px] shadow-md backdrop-blur">
            <div className="truncate font-medium text-[var(--ink)]">
              {mode.root
                ? trf('animSelectingLabel', { name: pickingLabel || '…' })
                : tr('animPickWaitingRoot')}
            </div>
          </div>
        </div>
      )}

      {!isEdit && !showPickBanner && mode.selected ? selectionChrome(mode.selected) : null}
      {isEdit && chromeSel ? selectionChrome(chromeSel) : null}

      {liveBox && liveBox.width > 0 && liveBox.height > 0 && (
        <div
          className={`absolute z-0 overflow-visible rounded-sm ${
            showSolid
              ? 'border-2 border-solid border-[var(--accent)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_18%,transparent)]'
              : 'border-2 border-dashed border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]'
          }`}
          style={{
            top: liveBox.top,
            left: liveBox.left,
            width: liveBox.width,
            height: liveBox.height,
          }}
        >
          {isEdit && tabSel && (
            <div
              data-hc-pick-chrome
              className="pointer-events-auto absolute -top-px left-0 z-[2] flex -translate-y-full items-center gap-0.5 rounded-t-md border border-b-0 border-[var(--accent)] bg-[var(--accent)] p-0.5 shadow-sm"
              onPointerEnter={() => {
                // Keep this element as hovered while interacting with its tab
                if (mode.hovered?.objectId !== tabSel.objectId) {
                  mode.setHovered(tabSel);
                }
              }}
            >
              <button
                type="button"
                title={tr('elementsDragHandle')}
                draggable
                onPointerDown={(e) => e.stopPropagation()}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData('application/x-hc-move-obj', tabSel.objectId);
                  e.dataTransfer.effectAllowed = 'move';
                  try {
                    const img = new Image();
                    img.src =
                      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                    e.dataTransfer.setDragImage(img, 0, 0);
                  } catch {
                    /* ignore */
                  }
                  mode.beginElementDrag(tabSel.objectId, tabSel.label);
                }}
                onDragEnd={() => {
                  mode.endElementDrag();
                  setDropMark(null);
                  setGhostPos(null);
                }}
                className={`${tabBtn} cursor-grab active:cursor-grabbing`}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title={tr('elementsMoveDown')}
                disabled={!canMoveDown(tabSel.element)}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!moveElementSibling(tabSel.element, 'down')) return;
                  persistMutation(tabSel.element);
                }}
                className={tabBtn}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title={tr('elementsMoveUp')}
                disabled={!canMoveUp(tabSel.element)}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!moveElementSibling(tabSel.element, 'up')) return;
                  persistMutation(tabSel.element);
                }}
                className={tabBtn}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title={tr('elementsDuplicate')}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const clone = duplicateElement(tabSel.element);
                  persistMutation(clone);
                }}
                className={tabBtn}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title={tr('elementsDelete')}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteTarget(tabSel);
                }}
                className={tabBtn}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title={tr('elementsEditHandle')}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  mode.selectElement(tabSel.element);
                  mode.signalPicked();
                  mode.onEditRequest?.(tabSel);
                }}
                className={tabBtn}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {dropMark && (
        <div
          className="absolute z-[3] h-0.5 rounded-full bg-[var(--accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_35%,transparent)]"
          style={{
            top: dropMark.top - 1,
            left: dropMark.left,
            width: dropMark.width,
          }}
        />
      )}

      {(mode.catalogDrag || mode.elementDrag) &&
        ghostPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] opacity-90"
            style={{ left: ghostPos.x + 12, top: ghostPos.y + 8 }}
          >
            <div className="max-w-[11rem] rounded-md border border-[var(--accent)] bg-[var(--stage)] px-2.5 py-1.5 shadow-lg">
              <div className="truncate text-[11px] font-semibold text-[var(--ink)]">
                {mode.catalogDrag?.label ?? mode.elementDrag?.label}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>

    <StructureDeleteModal
      open={Boolean(deleteTarget)}
      title={tr('elementsDeleteTitle')}
      body={
        deleteTarget
          ? `${tr('elementsDeleteConfirm')} (${deleteTarget.label})`
          : tr('elementsDeleteConfirm')
      }
      onClose={() => setDeleteTarget(null)}
      onConfirm={confirmDelete}
    />
    </>
  );
}

export { HC_OBJ_ATTR } from './selection';
