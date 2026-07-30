import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  GripVertical,
  HelpCircle,
  Pencil,
} from 'lucide-react';
import type {
  ProgressState,
  SequenceItem,
  SidebarViewMode,
  StructureDropTarget,
  StructureTarget,
} from '@shared/types';
import { usePrefs } from '../prefs/PrefsProvider';
import {
  StructureContextMenu,
  StructureDeleteModal,
  StructureRenameModal,
  type StructureMenuNode,
} from './structure/StructureModals';
import {
  DRAG_MIME,
  parseDrag,
  serializeDrag,
  useStructureEditor,
  type StructureResultPayload,
} from './structure/useStructureEditor';

type OverviewUnit = {
  id: string;
  title: string;
  items: SequenceItem[];
};

type OverviewModule = {
  id: string;
  title: string;
  units: OverviewUnit[];
  trailing: SequenceItem[];
};

function buildOverviewTree(sequence: SequenceItem[]): OverviewModule[] {
  const modules: OverviewModule[] = [];
  const byModule = new Map<string, OverviewModule>();

  for (const item of sequence) {
    let mod = byModule.get(item.moduleId);
    if (!mod) {
      mod = {
        id: item.moduleId,
        title: item.moduleTitle,
        units: [],
        trailing: [],
      };
      byModule.set(item.moduleId, mod);
      modules.push(mod);
    }

    if (!item.unitId) {
      mod.trailing.push(item);
      continue;
    }

    let unit = mod.units.find((u) => u.id === item.unitId);
    if (!unit) {
      unit = {
        id: item.unitId,
        title: item.unitTitle ?? item.unitId,
        items: [],
      };
      mod.units.push(unit);
    }
    unit.items.push(item);
  }

  return modules;
}

export const NAVIGATOR_SIDEBAR_DEFAULT_WIDTH = 260;
export const NAVIGATOR_SIDEBAR_MIN_WIDTH = 148;
export const NAVIGATOR_SIDEBAR_MAX_WIDTH = NAVIGATOR_SIDEBAR_DEFAULT_WIDTH;
export const NAVIGATOR_SIDEBAR_COMPACT_AT = 200;

const TREE_INDENT_PX = 12;

export function clampNavigatorSidebarWidth(width: number): number {
  return Math.min(
    NAVIGATOR_SIDEBAR_MAX_WIDTH,
    Math.max(NAVIGATOR_SIDEBAR_MIN_WIDTH, Math.round(width)),
  );
}

function dropKey(dest: StructureDropTarget): string {
  if (dest.kind === 'modules') return `modules:${dest.index}`;
  if (dest.kind === 'units') return `units:${dest.moduleId}:${dest.index}`;
  if (dest.kind === 'unit-items') {
    return `unit-items:${dest.moduleId}:${dest.unitId}:${dest.index}`;
  }
  return `trailing:${dest.moduleId}:${dest.index}`;
}

function canDrop(
  source: StructureTarget,
  dest: StructureDropTarget,
  sequence: SequenceItem[],
): boolean {
  if (source.kind === 'module') return dest.kind === 'modules';
  if (source.kind === 'unit') return dest.kind === 'units';
  const item = sequence.find((s) => s.key === source.itemKey);
  if (!item) return false;
  if (dest.kind === 'unit-items') return true;
  if (dest.kind === 'module-trailing') return item.type === 'quiz' || item.type === 'lab';
  return false;
}

function nodeFromItem(item: SequenceItem): StructureMenuNode {
  return {
    target: { kind: 'item', itemKey: item.key },
    title: item.title,
    nodeKind: item.type,
    canDuplicate: true,
  };
}

export function SlideSidebar({
  sequence,
  index,
  progress,
  onSelect,
  showSlideNumbers = true,
  showHeader = true,
  mode = 'navigator',
  width = NAVIGATOR_SIDEBAR_DEFAULT_WIDTH,
  onWidthChange,
  onWidthCommit,
  courseId,
  onStructureChange,
  onStructureError,
}: {
  sequence: SequenceItem[];
  index: number;
  progress: ProgressState | null;
  onSelect: (i: number) => void;
  showSlideNumbers?: boolean;
  showHeader?: boolean;
  mode?: SidebarViewMode;
  width?: number;
  onWidthChange?: (width: number) => void;
  onWidthCommit?: (width: number) => void;
  courseId?: string;
  onStructureChange?: (result: StructureResultPayload) => void;
  onStructureError?: (message: string) => void;
}) {
  const { tr } = usePrefs();
  const tree = useMemo(() => buildOverviewTree(sequence), [sequence]);
  const counts = useMemo(() => {
    let lessons = 0;
    let quizzes = 0;
    let labs = 0;
    for (const item of sequence) {
      if (item.type === 'lesson') lessons += 1;
      else if (item.type === 'quiz') quizzes += 1;
      else labs += 1;
    }
    return { lessons, quizzes, labs };
  }, [sequence]);

  const compact = width < NAVIGATOR_SIDEBAR_COMPACT_AT;
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const widthRef = useRef(width);
  widthRef.current = width;

  const editor = useStructureEditor(
    courseId,
    (result) => onStructureChange?.(result),
    (msg) => onStructureError?.(msg),
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current || !onWidthChange) return;
      const next = clampNavigatorSidebarWidth(
        dragRef.current.startWidth + (e.clientX - dragRef.current.startX),
      );
      widthRef.current = next;
      onWidthChange(next);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      onWidthCommit?.(widthRef.current);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onWidthChange, onWidthCommit]);

  const actions: StructureActions = {
    enabled: Boolean(courseId && onStructureChange),
    sequence,
    dragging: editor.dragging,
    dropHint: editor.dropHint,
    setDragging: editor.setDragging,
    setDropHint: editor.setDropHint,
    onMove: editor.move,
    onRename: editor.openRename,
    onContext: (e, node) => {
      e.preventDefault();
      e.stopPropagation();
      editor.setContextMenu({ x: e.clientX, y: e.clientY, node });
    },
  };

  return (
    <aside
      className="relative flex shrink-0 flex-col border-r border-[var(--line)] bg-[var(--chrome-deep)]"
      style={{ width }}
    >
      {showHeader && (
        <div className="shrink-0 p-2">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--stage)] px-3 py-2 shadow-sm">
            <div className="truncate text-[12px] font-semibold tracking-tight text-[var(--ink)]">
              {mode === 'navigator' ? tr('navigator') : tr('overview')}
            </div>
            {!compact && (
              <div className="truncate text-[11px] tabular-nums text-[var(--ink-muted)]">
                {sequence.length} {tr('slides')}
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'navigator' ? (
        <NavigatorList
          tree={tree}
          sequence={sequence}
          index={index}
          progress={progress}
          onSelect={onSelect}
          showSlideNumbers={showSlideNumbers}
          compact={compact}
          paddedTop={!showHeader}
          actions={actions}
        />
      ) : (
        <OverviewList
          tree={tree}
          sequence={sequence}
          index={index}
          onSelect={onSelect}
          compact={compact}
          paddedTop={!showHeader}
          actions={actions}
        />
      )}

      <footer
        className={`flex shrink-0 items-center border-t border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[10px] font-medium tabular-nums text-[var(--ink-muted)] ${
          compact ? 'justify-around gap-1' : 'flex-wrap gap-x-3 gap-y-1 px-3'
        }`}
      >
        <span className="inline-flex min-w-0 items-center gap-1">
          <BookOpen className="h-3 w-3 shrink-0 text-[var(--accent)]" />
          <span className="truncate">
            {counts.lessons}
            {!compact && <> {tr('lessons')}</>}
          </span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1">
          <HelpCircle className="h-3 w-3 shrink-0 text-[var(--quiz)]" />
          <span className="truncate">
            {counts.quizzes}
            {!compact && <> {tr('quizzes')}</>}
          </span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1">
          <FlaskConical className="h-3 w-3 shrink-0 text-[var(--lab)]" />
          <span className="truncate">
            {counts.labs}
            {!compact && <> {tr('labs')}</>}
          </span>
        </span>
      </footer>

      {onWidthChange && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={tr('resizeSidebar')}
          title={`${width}px`}
          onPointerDown={(e) => {
            e.preventDefault();
            dragRef.current = { startX: e.clientX, startWidth: width };
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none hover:bg-[var(--accent)]/25 active:bg-[var(--accent)]/40"
        />
      )}

      <StructureContextMenu
        menu={editor.contextMenu}
        onClose={() => editor.setContextMenu(null)}
        onEdit={editor.openRename}
        onDuplicate={(node) => void editor.duplicate(node)}
        onDelete={editor.openDelete}
      />
      <StructureRenameModal
        open={Boolean(editor.renameNode)}
        kindLabel={editor.renameNode ? editor.kindLabel(editor.renameNode) : ''}
        initialTitle={editor.renameNode?.title ?? ''}
        busy={editor.busy}
        error={editor.error}
        onClose={() => editor.setRenameNode(null)}
        onSave={(title) => void editor.saveRename(title)}
      />
      <StructureDeleteModal
        open={Boolean(editor.deleteNode)}
        title={editor.deleteNode ? editor.deleteCopy(editor.deleteNode).title : ''}
        body={editor.deleteNode ? editor.deleteCopy(editor.deleteNode).body : ''}
        busy={editor.busy}
        error={editor.error}
        onClose={() => editor.setDeleteNode(null)}
        onConfirm={() => void editor.confirmDelete()}
      />
    </aside>
  );
}

type StructureActions = {
  enabled: boolean;
  sequence: SequenceItem[];
  dragging: StructureTarget | null;
  dropHint: string | null;
  setDragging: (t: StructureTarget | null) => void;
  setDropHint: (k: string | null) => void;
  onMove: (source: StructureTarget, dest: StructureDropTarget) => Promise<void>;
  onRename: (node: StructureMenuNode) => void;
  onContext: (e: React.MouseEvent, node: StructureMenuNode) => void;
};

function useTreeExpansion(tree: OverviewModule[], index: number) {
  const current = useMemo(() => {
    for (const mod of tree) {
      for (const unit of mod.units) {
        if (unit.items.some((i) => i.index === index)) {
          return { moduleId: mod.id, unitId: unit.id as string | null };
        }
      }
      if (mod.trailing.some((i) => i.index === index)) {
        return { moduleId: mod.id, unitId: null as string | null };
      }
    }
    return { moduleId: tree[0]?.id ?? '', unitId: null as string | null };
  }, [tree, index]);

  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [openUnits, setOpenUnits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenModules((prev) => ({ ...prev, [current.moduleId]: true }));
    if (current.unitId) {
      const key = `${current.moduleId}/${current.unitId}`;
      setOpenUnits((prev) => ({ ...prev, [key]: true }));
    }
  }, [current.moduleId, current.unitId]);

  const toggleModule = (id: string) => {
    setOpenModules((prev) => ({ ...prev, [id]: !(prev[id] ?? id === current.moduleId) }));
  };

  const toggleUnit = (moduleId: string, unitId: string) => {
    const key = `${moduleId}/${unitId}`;
    const defaultOpen = key === `${current.moduleId}/${current.unitId}`;
    setOpenUnits((prev) => ({ ...prev, [key]: !(prev[key] ?? defaultOpen) }));
  };

  const isModuleOpen = (id: string) => openModules[id] ?? id === current.moduleId;
  const isUnitOpen = (moduleId: string, unitId: string) => {
    const key = `${moduleId}/${unitId}`;
    return openUnits[key] ?? key === `${current.moduleId}/${current.unitId}`;
  };

  return { current, openModules, openUnits, toggleModule, toggleUnit, isModuleOpen, isUnitOpen };
}

function DropLine({
  dest,
  actions,
}: {
  dest: StructureDropTarget;
  actions: StructureActions;
}) {
  if (!actions.enabled || !actions.dragging) return null;
  if (!canDrop(actions.dragging, dest, actions.sequence)) return null;
  const key = dropKey(dest);
  const active = actions.dropHint === key;
  return (
    <div
      className="relative z-20 h-0"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        actions.setDropHint(key);
      }}
      onDragLeave={() => {
        if (actions.dropHint === key) actions.setDropHint(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const source =
          actions.dragging ??
          parseDrag(e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData('text/plain'));
        actions.setDropHint(null);
        if (!source || !canDrop(source, dest, actions.sequence)) return;
        void actions.onMove(source, dest);
      }}
    >
      <div
        className={`absolute inset-x-1 -top-1 h-2 rounded-full ${
          active ? 'bg-[var(--accent)]' : 'bg-[var(--accent)]/25'
        }`}
      />
    </div>
  );
}

function Grip({
  target,
  actions,
}: {
  target: StructureTarget;
  actions: StructureActions;
}) {
  if (!actions.enabled) return null;
  return (
    <span
      draggable
      title="Drag to reorder"
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData(DRAG_MIME, serializeDrag(target));
        e.dataTransfer.setData('text/plain', serializeDrag(target));
        e.dataTransfer.effectAllowed = 'move';
        actions.setDragging(target);
      }}
      onDragEnd={() => {
        actions.setDragging(null);
        actions.setDropHint(null);
      }}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex w-3.5 shrink-0 cursor-grab items-center justify-center text-[var(--ink-muted)] opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </span>
  );
}

function EditBtn({
  node,
  actions,
}: {
  node: StructureMenuNode;
  actions: StructureActions;
}) {
  if (!actions.enabled) return null;
  return (
    <button
      type="button"
      title="Edit name"
      onClick={(e) => {
        e.stopPropagation();
        actions.onRename(node);
      }}
      className="inline-flex cursor-pointer items-center rounded p-0.5 text-[var(--ink-muted)] opacity-0 transition hover:bg-black/5 hover:text-[var(--accent)] group-hover:opacity-100 dark:hover:bg-white/10"
    >
      <Pencil className="h-3 w-3" />
    </button>
  );
}

function TreeHeader({
  level,
  open,
  label,
  onToggle,
  dense,
  node,
  actions,
}: {
  level: 0 | 1;
  open: boolean;
  label: string;
  onToggle: () => void;
  dense?: boolean;
  node: StructureMenuNode;
  actions: StructureActions;
}) {
  const Chevron = open ? ChevronDown : ChevronRight;
  const moduleTitle =
    dense && level === 0
      ? 'text-[11px] font-semibold text-[var(--ink)]'
      : level === 0
        ? 'text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]'
        : 'text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]';

  return (
    <div
      className="group flex w-full items-center gap-0.5 rounded-md text-left hover:bg-black/5 dark:hover:bg-white/5"
      onContextMenu={(e) => actions.onContext(e, node)}
    >
      <Grip target={node.target} actions={actions} />
      <button
        type="button"
        onClick={onToggle}
        title={label}
        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-1 py-0.5 text-left ${
          dense ? 'px-1 py-1' : ''
        }`}
        style={dense ? undefined : { paddingLeft: level * TREE_INDENT_PX, paddingRight: 2 }}
      >
        <Chevron
          className={`shrink-0 text-[var(--ink-muted)] ${level === 0 ? 'h-3.5 w-3.5' : 'h-3 w-3'}`}
        />
        <span className={`min-w-0 flex-1 truncate text-left ${moduleTitle}`}>{label}</span>
        <EditBtn node={node} actions={actions} />
      </button>
    </div>
  );
}

function NavigatorList({
  tree,
  sequence,
  index,
  progress,
  onSelect,
  showSlideNumbers,
  compact,
  paddedTop,
  actions,
}: {
  tree: OverviewModule[];
  sequence: SequenceItem[];
  index: number;
  progress: ProgressState | null;
  onSelect: (i: number) => void;
  showSlideNumbers: boolean;
  compact: boolean;
  paddedTop?: boolean;
  actions: StructureActions;
}) {
  const { current, openModules, openUnits, toggleModule, toggleUnit, isModuleOpen, isUnitOpen } =
    useTreeExpansion(tree, index);
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-slide-index="${index}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [index, current.moduleId, current.unitId, openModules, openUnits]);

  return (
    <div
      ref={listRef}
      className={`min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 ${paddedTop ? 'pt-2' : ''}`}
    >
      <DropLine dest={{ kind: 'modules', index: 0 }} actions={actions} />
      {tree.map((mod, mi) => {
        const moduleOpen = isModuleOpen(mod.id);
        const moduleNode: StructureMenuNode = {
          target: { kind: 'module', moduleId: mod.id },
          title: mod.title,
          nodeKind: 'module',
          canDuplicate: false,
        };
        return (
          <div key={mod.id} className="space-y-1">
            <TreeHeader
              level={0}
              open={moduleOpen}
              label={mod.title}
              onToggle={() => toggleModule(mod.id)}
              node={moduleNode}
              actions={actions}
            />

            {moduleOpen && (
              <div className="space-y-1">
                <DropLine dest={{ kind: 'units', moduleId: mod.id, index: 0 }} actions={actions} />
                {mod.units.map((unit, ui) => {
                  const unitOpen = isUnitOpen(mod.id, unit.id);
                  const unitNode: StructureMenuNode = {
                    target: { kind: 'unit', moduleId: mod.id, unitId: unit.id },
                    title: unit.title,
                    nodeKind: 'unit',
                    canDuplicate: false,
                  };
                  return (
                    <div key={unit.id} className="space-y-1">
                      <TreeHeader
                        level={1}
                        open={unitOpen}
                        label={unit.title}
                        onToggle={() => toggleUnit(mod.id, unit.id)}
                        node={unitNode}
                        actions={actions}
                      />
                      {unitOpen && (
                        <div className="space-y-1" style={{ paddingLeft: TREE_INDENT_PX * 2 }}>
                          <DropLine
                            dest={{
                              kind: 'unit-items',
                              moduleId: mod.id,
                              unitId: unit.id,
                              index: 0,
                            }}
                            actions={actions}
                          />
                          {unit.items.map((item, ii) => (
                            <div key={item.key}>
                              <NavigatorThumb
                                item={item}
                                active={item.index === index}
                                progress={progress}
                                onSelect={onSelect}
                                showSlideNumbers={showSlideNumbers}
                                compact={compact}
                                actions={actions}
                              />
                              <DropLine
                                dest={{
                                  kind: 'unit-items',
                                  moduleId: mod.id,
                                  unitId: unit.id,
                                  index: ii + 1,
                                }}
                                actions={actions}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <DropLine
                        dest={{ kind: 'units', moduleId: mod.id, index: ui + 1 }}
                        actions={actions}
                      />
                    </div>
                  );
                })}

                <div className="space-y-1" style={{ paddingLeft: TREE_INDENT_PX }}>
                  <DropLine
                    dest={{ kind: 'module-trailing', moduleId: mod.id, index: 0 }}
                    actions={actions}
                  />
                  {mod.trailing.map((item, ti) => (
                    <div key={item.key}>
                      <NavigatorThumb
                        item={item}
                        active={item.index === index}
                        progress={progress}
                        onSelect={onSelect}
                        showSlideNumbers={showSlideNumbers}
                        compact={compact}
                        actions={actions}
                      />
                      <DropLine
                        dest={{
                          kind: 'module-trailing',
                          moduleId: mod.id,
                          index: ti + 1,
                        }}
                        actions={actions}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DropLine dest={{ kind: 'modules', index: mi + 1 }} actions={actions} />
          </div>
        );
      })}
      {/* silence unused sequence warning in strict mode */}
      <span className="hidden">{sequence.length}</span>
    </div>
  );
}

function NavigatorThumb({
  item,
  active,
  progress,
  onSelect,
  showSlideNumbers,
  compact,
  actions,
}: {
  item: SequenceItem;
  active: boolean;
  progress: ProgressState | null;
  onSelect: (i: number) => void;
  showSlideNumbers: boolean;
  compact: boolean;
  actions: StructureActions;
}) {
  const done = progress?.completedKeys?.includes(item.key);
  const quizDone = item.type === 'quiz' && progress?.quizScores?.[item.activityId!];
  const node = nodeFromItem(item);

  return (
    <div
      className="group flex items-start gap-0.5"
      onContextMenu={(e) => actions.onContext(e, node)}
    >
      <Grip target={node.target} actions={actions} />
      <div
        className={`relative min-w-0 flex-1 rounded-lg ${
          active
            ? 'bg-white shadow-md ring-2 ring-[var(--accent)] dark:bg-slate-800'
            : 'hover:bg-white/70 dark:hover:bg-white/10'
        }`}
      >
        <button
          type="button"
          data-slide-index={item.index}
          onClick={() => onSelect(item.index)}
          className="w-full cursor-pointer rounded-lg p-1.5 text-left"
        >
          <div
            className={`relative mb-1.5 flex aspect-[16/10] items-center justify-center overflow-hidden rounded-md border ${
              item.type === 'quiz'
                ? 'border-[#c9d7ef] bg-[linear-gradient(145deg,#eef3fb,#d9e4f6)] dark:border-sky-800 dark:bg-[linear-gradient(145deg,#0f1a2e,#152238)]'
                : item.type === 'lab'
                  ? 'border-[#ddd0ef] bg-[linear-gradient(145deg,#f6f1fb,#e8ddf4)] dark:border-violet-800 dark:bg-[linear-gradient(145deg,#1a1428,#221833)]'
                  : 'border-[var(--line)] bg-[linear-gradient(160deg,#ffffff,#f3f5f8)] dark:bg-[linear-gradient(160deg,#1e2430,#161b24)]'
            }`}
          >
            <ThumbIcon type={item.type} />
            {showSlideNumbers && (
              <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {item.index + 1}
              </span>
            )}
            {(done || quizDone) && (
              <CheckCircle2 className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 text-[var(--success)]" />
            )}
          </div>
          <div className="flex min-w-0 items-center gap-1 px-0.5">
            <div className="min-w-0 flex-1 truncate text-left text-[11px] font-medium text-[var(--ink)]">
              {item.title}
            </div>
            <EditBtn node={node} actions={actions} />
          </div>
          {!compact && (
            <div className="truncate whitespace-nowrap px-0.5 text-left text-[10px] capitalize text-[var(--ink-muted)]">
              {item.type}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

function OverviewList({
  tree,
  sequence,
  index,
  onSelect,
  compact,
  paddedTop,
  actions,
}: {
  tree: OverviewModule[];
  sequence: SequenceItem[];
  index: number;
  onSelect: (i: number) => void;
  compact: boolean;
  paddedTop?: boolean;
  actions: StructureActions;
}) {
  const { current, openModules, openUnits, toggleModule, toggleUnit, isModuleOpen, isUnitOpen } =
    useTreeExpansion(tree, index);
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-slide-index="${index}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [index, current.moduleId, current.unitId, openModules, openUnits]);

  return (
    <div
      ref={listRef}
      className={`min-h-0 flex-1 overflow-y-auto px-2 pb-2 ${paddedTop ? 'pt-2' : ''}`}
    >
      <div className="space-y-1">
        <DropLine dest={{ kind: 'modules', index: 0 }} actions={actions} />
        {tree.map((mod, mi) => {
          const moduleOpen = isModuleOpen(mod.id);
          const moduleNode: StructureMenuNode = {
            target: { kind: 'module', moduleId: mod.id },
            title: mod.title,
            nodeKind: 'module',
            canDuplicate: false,
          };
          return (
            <div key={mod.id}>
              <div className="rounded-lg border border-[var(--line)]/80 bg-[var(--panel)]/60">
                <TreeHeader
                  level={0}
                  open={moduleOpen}
                  label={mod.title}
                  onToggle={() => toggleModule(mod.id)}
                  dense
                  node={moduleNode}
                  actions={actions}
                />

                {moduleOpen && (
                  <div className="space-y-0.5 px-1.5 pb-1.5">
                    <DropLine
                      dest={{ kind: 'units', moduleId: mod.id, index: 0 }}
                      actions={actions}
                    />
                    {mod.units.map((unit, ui) => {
                      const unitOpen = isUnitOpen(mod.id, unit.id);
                      const unitNode: StructureMenuNode = {
                        target: { kind: 'unit', moduleId: mod.id, unitId: unit.id },
                        title: unit.title,
                        nodeKind: 'unit',
                        canDuplicate: false,
                      };
                      return (
                        <div key={unit.id}>
                          <TreeHeader
                            level={1}
                            open={unitOpen}
                            label={unit.title}
                            onToggle={() => toggleUnit(mod.id, unit.id)}
                            dense
                            node={unitNode}
                            actions={actions}
                          />
                          {unitOpen && (
                            <div
                              className="space-y-0.5 border-l border-[var(--line)] pl-1.5"
                              style={{ marginLeft: TREE_INDENT_PX }}
                            >
                              <DropLine
                                dest={{
                                  kind: 'unit-items',
                                  moduleId: mod.id,
                                  unitId: unit.id,
                                  index: 0,
                                }}
                                actions={actions}
                              />
                              {unit.items.map((item, ii) => (
                                <div key={item.key}>
                                  <OverviewItem
                                    item={item}
                                    active={item.index === index}
                                    onSelect={onSelect}
                                    compact={compact}
                                    actions={actions}
                                  />
                                  <DropLine
                                    dest={{
                                      kind: 'unit-items',
                                      moduleId: mod.id,
                                      unitId: unit.id,
                                      index: ii + 1,
                                    }}
                                    actions={actions}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <DropLine
                            dest={{ kind: 'units', moduleId: mod.id, index: ui + 1 }}
                            actions={actions}
                          />
                        </div>
                      );
                    })}

                    <DropLine
                      dest={{ kind: 'module-trailing', moduleId: mod.id, index: 0 }}
                      actions={actions}
                    />
                    {mod.trailing.map((item, ti) => (
                      <div key={item.key}>
                        <OverviewItem
                          item={item}
                          active={item.index === index}
                          onSelect={onSelect}
                          compact={compact}
                          actions={actions}
                        />
                        <DropLine
                          dest={{
                            kind: 'module-trailing',
                            moduleId: mod.id,
                            index: ti + 1,
                          }}
                          actions={actions}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DropLine dest={{ kind: 'modules', index: mi + 1 }} actions={actions} />
            </div>
          );
        })}
      </div>
      <span className="hidden">{sequence.length}</span>
    </div>
  );
}

function OverviewItem({
  item,
  active,
  onSelect,
  compact,
  actions,
}: {
  item: SequenceItem;
  active: boolean;
  onSelect: (i: number) => void;
  compact: boolean;
  actions: StructureActions;
}) {
  const node = nodeFromItem(item);
  const tint =
    item.type === 'quiz'
      ? 'border-l-[3px] border-l-[var(--quiz)] bg-[var(--quiz-soft)] text-[var(--quiz)]'
      : item.type === 'lab'
        ? 'border-l-[3px] border-l-[var(--lab)] bg-[var(--lab-soft)] text-[var(--lab)]'
        : 'border-l-[3px] border-l-transparent bg-transparent text-[var(--ink)] hover:bg-black/5 dark:hover:bg-white/5';

  return (
    <div
      className={`group flex items-center gap-0.5 rounded-r-md ${active ? 'ring-1 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--chrome-deep)]' : ''}`}
      onContextMenu={(e) => actions.onContext(e, node)}
    >
      <Grip target={node.target} actions={actions} />
      <button
        type="button"
        data-slide-index={item.index}
        onClick={() => onSelect(item.index)}
        title={item.title}
        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-1.5 py-1.5 text-left transition ${tint}`}
      >
        {!compact && <TypeIcon type={item.type} />}
        <span
          className={`min-w-0 flex-1 truncate whitespace-nowrap text-left text-[11px] ${
            item.type === 'lesson' ? 'font-medium text-[var(--ink)]' : 'font-semibold'
          }`}
        >
          {item.title}
        </span>
        <EditBtn node={node} actions={actions} />
      </button>
    </div>
  );
}

function TypeIcon({ type }: { type: SequenceItem['type'] }) {
  if (type === 'quiz') return <HelpCircle className="h-3.5 w-3.5 shrink-0 opacity-90" />;
  if (type === 'lab') return <FlaskConical className="h-3.5 w-3.5 shrink-0 opacity-90" />;
  return <BookOpen className="h-3.5 w-3.5 shrink-0 text-[var(--accent)] opacity-80" />;
}

function ThumbIcon({ type }: { type: SequenceItem['type'] }) {
  if (type === 'quiz') return <HelpCircle className="h-7 w-7 text-[var(--quiz)] opacity-80" />;
  if (type === 'lab') return <FlaskConical className="h-7 w-7 text-[var(--lab)] opacity-70" />;
  return <BookOpen className="h-7 w-7 text-[var(--accent)] opacity-70" />;
}
