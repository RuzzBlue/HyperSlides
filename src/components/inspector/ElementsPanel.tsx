import { useCallback, useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Code2,
  Columns2,
  Film,
  LayoutTemplate,
  Link2,
  Minus,
  Puzzle,
  Square,
  Table2,
  Type,
} from 'lucide-react';
import { usePrefs } from '../../prefs/PrefsProvider';
import type { StringKey } from '../../i18n/strings';
import type { InspectorTool } from './Inspector';
import { useLessonObjectModeOptional } from '../../lesson-objects/LessonObjectMode';
import {
  catalogItemsForCategory,
  ELEMENT_CATALOG,
  type ElementCatalogCategoryId,
  type ElementCatalogItem,
  type ElementCatalogItemId,
} from '../../lesson-objects/elementCatalog';
import { isStructureElement } from '../../lesson-objects/elementRouting';
import { ensureObjectId } from '../../lesson-objects/selection';
import { TemplatePickerButton } from './TemplatePicker';

type Level = 'catalog' | 'props';

const CATEGORY_META: Array<{
  id: ElementCatalogCategoryId;
  labelKey: StringKey;
}> = [
  { id: 'single', labelKey: 'elementsCatSingle' },
  { id: 'structure', labelKey: 'elementsCatStructure' },
  { id: 'templates', labelKey: 'elementsCatTemplates' },
];

const ITEM_ICONS: Record<ElementCatalogItemId, ReactNode> = {
  'titles-texts': <Type className="h-5 w-5" />,
  'links-buttons': <Link2 className="h-5 w-5" />,
  'html-widgets': <Code2 className="h-5 w-5" />,
  'shapes-media': <Film className="h-5 w-5" />,
  'graphs-tables': <Table2 className="h-5 w-5" />,
  section: <LayoutTemplate className="h-5 w-5" />,
  div: <Square className="h-5 w-5" />,
  columns: <Columns2 className="h-5 w-5" />,
  spacer: <Minus className="h-5 w-5" />,
  templates: <Puzzle className="h-5 w-5" />,
};

const ITEM_LABEL: Record<ElementCatalogItemId, StringKey> = {
  'titles-texts': 'elementsItemTitles',
  'links-buttons': 'elementsItemLinks',
  'html-widgets': 'elementsItemHtml',
  'shapes-media': 'elementsItemShapesMedia',
  'graphs-tables': 'elementsItemGraphsTables',
  section: 'elementsItemSection',
  div: 'elementsItemDiv',
  columns: 'elementsItemColumns',
  spacer: 'elementsItemSpacer',
  templates: 'elementsItemTemplates',
};

const COLUMN_PRESETS = [
  { id: 'custom', labelKey: 'elementsColCustom' as StringKey, cols: 0 },
  { id: 'half', labelKey: 'elementsColHalf' as StringKey, cols: 2 },
  { id: 'thirds', labelKey: 'elementsColThirds' as StringKey, cols: 3 },
  { id: 'quarters', labelKey: 'elementsColQuarters' as StringKey, cols: 4 },
  { id: 'fifths', labelKey: 'elementsColFifths' as StringKey, cols: 5 },
  { id: 'two-thirds', labelKey: 'elementsColTwoThirds' as StringKey, cols: 2, frac: '2fr 1fr' },
  { id: 'one-two', labelKey: 'elementsColOneTwo' as StringKey, cols: 2, frac: '1fr 2fr' },
];

function findArticle(root: HTMLElement): HTMLElement {
  return (root.querySelector('article') as HTMLElement | null) ?? root;
}

function topLevelSections(root: HTMLElement): HTMLElement[] {
  const article = findArticle(root);
  return Array.from(article.children).filter(
    (n): n is HTMLElement => n instanceof HTMLElement && n.tagName === 'SECTION',
  );
}

function nearestSection(el: HTMLElement, root: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = el;
  while (cur && root.contains(cur)) {
    if (cur.tagName === 'SECTION') return cur;
    cur = cur.parentElement;
  }
  return null;
}

function applyColumnPreset(el: HTMLElement, presetId: string, gapPx: number) {
  const preset = COLUMN_PRESETS.find((p) => p.id === presetId) ?? COLUMN_PRESETS[1]!;
  el.classList.remove('hc-cols-2', 'hc-cols-3', 'hc-cols-4', 'hc-cols-5');
  const count = Math.max(2, preset.cols || 2);
  el.classList.add(`hc-cols-${Math.min(4, count)}`);
  el.setAttribute('data-hc-columns', String(count));
  el.setAttribute('data-hc-col-preset', preset.id);
  el.style.display = 'grid';
  el.style.gap = `${gapPx}px`;
  el.style.gridTemplateColumns = preset.frac ?? `repeat(${count}, minmax(0, 1fr))`;

  const kids = Array.from(el.children).filter((c): c is HTMLElement => c instanceof HTMLElement);
  while (kids.length < count) {
    const col = document.createElement('div');
    col.className = 'hc-col';
    col.setAttribute('data-hc-label', `Column ${kids.length + 1}`);
    col.innerHTML = '<p>Column</p>';
    ensureObjectId(col);
    el.appendChild(col);
    kids.push(col);
  }
}

export function ElementsPanel({
  onHtmlPersist,
  onOpenTool,
}: {
  courseId: string;
  slideKey: string;
  onHtmlPersist?: (html: string) => Promise<void>;
  onOpenTool?: (tool: InspectorTool) => void;
}) {
  const { tr } = usePrefs();
  const objectMode = useLessonObjectModeOptional();
  const [level, setLevel] = useState<Level>('catalog');
  const [openCats, setOpenCats] = useState<Record<ElementCatalogCategoryId, boolean>>({
    single: true,
    structure: true,
    templates: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [gapPx, setGapPx] = useState(16);
  const [colPreset, setColPreset] = useState('half');
  const templateInsertRef = useState(() => ({
    current: (_html: string) => {},
  }))[0];

  const selected = objectMode?.selected ?? null;
  const structureSelected = Boolean(selected && isStructureElement(selected.element));

  useEffect(() => {
    if (structureSelected && selected) {
      setLevel('props');
      const el = selected.element;
      setColPreset(el.getAttribute('data-hc-col-preset') ?? 'half');
      const gap = Number.parseInt(String(el.style.gap || el.getAttribute('data-hc-spacer') || '16'), 10);
      setGapPx(Number.isFinite(gap) ? gap : 16);
    } else if (!selected) {
      setLevel('catalog');
    }
  }, [selected?.objectId, structureSelected, selected]);

  const persistRoot = useCallback(async () => {
    const root = objectMode?.root;
    if (!root || !onHtmlPersist) return false;
    objectMode.stampIds();
    await onHtmlPersist(root.innerHTML);
    return true;
  }, [objectMode, onHtmlPersist]);

  useEffect(() => {
    templateInsertRef.current = (html: string) => {
      const root = objectMode?.root;
      if (!root) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = html.trim();
      const nodes = Array.from(wrap.children).filter(
        (n): n is HTMLElement => n instanceof HTMLElement,
      );
      const article = findArticle(root);
      const currentSection = selected ? nearestSection(selected.element, root) : null;
      let anchor: Element | null = currentSection;
      for (const node of nodes) {
        ensureObjectId(node);
        if (anchor) {
          anchor.insertAdjacentElement('afterend', node);
          anchor = node;
        } else {
          article.appendChild(node);
          anchor = node;
        }
      }
      void persistRoot().then(() => {
        if (nodes[0]) objectMode?.selectElement(nodes[0]);
      });
    };
  }, [objectMode, selected, persistRoot, templateInsertRef]);

  const insertItem = useCallback(
    async (item: ElementCatalogItem) => {
      setError(null);
      const root = objectMode?.root;
      if (!root) {
        setError(tr('elementsNeedLesson'));
        return;
      }

      if (item.id === 'templates') {
        setOpenCats((s) => ({ ...s, templates: true }));
        setTemplatesOpen(true);
        return;
      }

      const wrap = document.createElement('div');
      wrap.innerHTML = item.createHtml().trim();
      const node = wrap.firstElementChild as HTMLElement | null;
      if (!node) return;
      ensureObjectId(node);

      if (item.dropRule === 'section-sibling') {
        const sections = topLevelSections(root);
        const currentSection = selected ? nearestSection(selected.element, root) : null;
        const article = findArticle(root);
        if (currentSection) currentSection.insertAdjacentElement('afterend', node);
        else if (sections.length) sections[sections.length - 1]!.insertAdjacentElement('afterend', node);
        else article.appendChild(node);
      } else {
        const target = selected?.element;
        let host: HTMLElement | null = null;
        if (target) {
          if (item.dropRule === 'inside-section') host = nearestSection(target, root);
          else {
            host =
              target.tagName === 'SECTION' || target.tagName === 'DIV'
                ? target
                : (target.closest('section, div') as HTMLElement | null);
          }
        }
        host = host ?? topLevelSections(root).at(-1) ?? findArticle(root);
        host.appendChild(node);
      }

      await persistRoot();
      objectMode.selectElement(node);

      if (item.openTool && item.category === 'single') {
        onOpenTool?.(item.openTool);
        return;
      }
      setLevel('props');
    },
    [objectMode, selected, persistRoot, onOpenTool, tr],
  );

  const onDragStart = (e: DragEvent, item: ElementCatalogItem) => {
    e.dataTransfer.setData('application/x-hc-element', item.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const saveStructureProps = async () => {
    if (!selected || !structureSelected) return;
    const el = selected.element;
    if (
      el.hasAttribute('data-hc-columns') ||
      el.matches('[class*="hc-cols-"]') ||
      el.tagName === 'DIV' ||
      el.tagName === 'SECTION'
    ) {
      applyColumnPreset(el, colPreset, gapPx);
    }
    if (el.hasAttribute('data-hc-spacer')) {
      el.style.height = `${gapPx}px`;
      el.setAttribute('data-hc-spacer', String(gapPx));
    }
    await persistRoot();
  };

  const crumbs = useMemo(() => {
    const list: Array<{ id: string; label: string; action: () => void }> = [
      {
        id: 'elements',
        label: tr('toolElements'),
        action: () => {
          setLevel('catalog');
          objectMode?.selectElement(null);
        },
      },
    ];
    if (selected) {
      list.push({
        id: selected.objectId,
        label: selected.label,
        action: () => setLevel(structureSelected ? 'props' : 'catalog'),
      });
    }
    return list;
  }, [selected, structureSelected, objectMode, tr]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-[var(--line)] px-3 py-2 text-[11px]">
        {crumbs.map((c, i) => (
          <span key={c.id} className="inline-flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3 w-3 text-[var(--ink-muted)]" /> : null}
            <button
              type="button"
              onClick={c.action}
              className={`cursor-pointer rounded px-1 py-0.5 font-medium hover:bg-black/5 ${
                i === crumbs.length - 1 ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'
              }`}
            >
              {c.label}
            </button>
          </span>
        ))}
      </div>

      {error && (
        <div className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">
          {error}
        </div>
      )}

      {level === 'props' && selected && structureSelected ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
          <div className="text-[12px] font-semibold text-[var(--ink)]">
            {tr('elementsEditStructure')}: {selected.label}
          </div>
          <p className="font-mono text-[10px] text-[var(--ink-muted)]">
            {selected.element.tagName.toLowerCase()} · {selected.objectId}
          </p>

          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
              {tr('elementsColumnLayout')}
            </span>
            <select
              className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5 text-[12px]"
              value={colPreset}
              onChange={(e) => setColPreset(e.target.value)}
            >
              {COLUMN_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {tr(p.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
              {selected.element.hasAttribute('data-hc-spacer')
                ? tr('elementsSpacerHeight')
                : tr('elementsColumnGap')}
            </span>
            <input
              type="number"
              min={0}
              max={240}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--stage)] px-2 py-1.5 text-[12px]"
              value={gapPx}
              onChange={(e) => setGapPx(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>

          <button
            type="button"
            onClick={() => void saveStructureProps()}
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110"
          >
            {tr('elementsApplyProps')}
          </button>
          <button
            type="button"
            onClick={() => setLevel('catalog')}
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-md border border-[var(--line)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink)] hover:bg-black/5"
          >
            {tr('elementsBackToCatalog')}
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-2">
          {!selected && (
            <p className="px-1 pb-1 text-[11px] text-[var(--ink-muted)]">{tr('elementsCatalogHint')}</p>
          )}
          {CATEGORY_META.map((cat) => {
            const open = openCats[cat.id];
            const items = catalogItemsForCategory(cat.id);
            return (
              <div key={cat.id} className="rounded-lg border border-[var(--line)] bg-[var(--panel)]">
                <button
                  type="button"
                  onClick={() => setOpenCats((s) => ({ ...s, [cat.id]: !s[cat.id] }))}
                  className="flex w-full cursor-pointer items-center gap-1.5 px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)] hover:bg-black/5"
                >
                  {open ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  {tr(cat.labelKey)}
                </button>
                {open && (
                  <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        draggable
                        onDragStart={(e) => onDragStart(e, item)}
                        onClick={() => void insertItem(item)}
                        className="flex cursor-grab flex-col items-start gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--stage)] px-2.5 py-2.5 text-left hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40 active:cursor-grabbing"
                      >
                        <span className="text-[var(--accent)]">{ITEM_ICONS[item.id]}</span>
                        <span className="text-[11px] font-semibold text-[var(--ink)]">
                          {tr(ITEM_LABEL[item.id])}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="border-t border-[var(--line)] px-1 pt-2">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              {tr('elementsCatTemplates')}
            </div>
            <TemplatePickerButton
              open={templatesOpen}
              onOpenChange={setTemplatesOpen}
              onInsert={(html) => {
                templateInsertRef.current(html);
              }}
            />
            <p className="mt-1 text-[10px] text-[var(--ink-muted)]">{tr('elementsTemplatesHint')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function insertCatalogItemAt(
  root: HTMLElement,
  itemId: ElementCatalogItemId,
  dropTarget: HTMLElement | null,
  position: 'before' | 'after' | 'inside',
): HTMLElement | null {
  const item = ELEMENT_CATALOG.find((i) => i.id === itemId);
  if (!item || item.id === 'templates') return null;

  const wrap = document.createElement('div');
  wrap.innerHTML = item.createHtml().trim();
  const node = wrap.firstElementChild as HTMLElement | null;
  if (!node) return null;
  ensureObjectId(node);

  if (item.dropRule === 'section-sibling') {
    const section = dropTarget ? nearestSection(dropTarget, root) : null;
    if (section) {
      section.insertAdjacentElement(position === 'before' ? 'beforebegin' : 'afterend', node);
    } else {
      findArticle(root).appendChild(node);
    }
    return node;
  }

  const host =
    position === 'inside' && dropTarget
      ? dropTarget
      : dropTarget
        ? nearestSection(dropTarget, root) ?? dropTarget
        : topLevelSections(root).at(-1) ?? findArticle(root);

  if (position === 'before' && dropTarget) dropTarget.insertAdjacentElement('beforebegin', node);
  else if (position === 'after' && dropTarget) dropTarget.insertAdjacentElement('afterend', node);
  else host.appendChild(node);

  return node;
}
