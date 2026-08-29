import { useCallback, useEffect, useState, type DragEvent, type ReactNode } from 'react';
import { Box, GitBranch, Table2, BarChart3, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { usePrefs } from '../../../prefs/PrefsProvider';
import { useLessonObjectModeOptional } from '../../../lesson-objects/LessonObjectMode';
import { ensureObjectId } from '../../../lesson-objects/selection';
import {
  catalogIdForDataKind,
  createDataHtml as createDataHtmlShared,
  detectDataKind,
  resolveDataTarget,
  type DataKind,
} from '../../../lesson-objects/dataHtml';
import { ColorControl, type ColorValue } from '../ElementStylePanel';

export type { DataKind };
export const createDataHtml = createDataHtmlShared;

const fieldClass =
  'w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';
const buttonClass =
  'inline-flex cursor-pointer items-center justify-center gap-1 rounded-md border border-[var(--line)] px-2 py-1.5 text-[11px] font-semibold text-[var(--ink)] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-35';
const SWATCHES = [
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'green', label: 'Green', hex: '#10b981' },
  { id: 'amber', label: 'Amber', hex: '#f59e0b' },
  { id: 'red', label: 'Red', hex: '#ef4444' },
  { id: 'white', label: 'White', hex: '#ffffff' },
  { id: 'ink', label: 'Ink', hex: '#1c1f26' },
];

type EditorProps = { el: HTMLElement; onDirty: () => void };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
        {title}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[var(--ink)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-[var(--accent)]"
      />
      {label}
    </label>
  );
}

function ShellEditor({ el, onDirty }: EditorProps) {
  const [revision, setRevision] = useState(0);
  const patch = (name: string, value: string) => {
    el.setAttribute(name, value);
    setRevision((value) => value + 1);
    onDirty();
  };
  const checked = (name: string) => el.getAttribute(name) !== '0';
  void revision;
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium text-[var(--ink)]">
        Title
        <input
          className={`${fieldClass} mt-1`}
          value={el.getAttribute('data-shell-title') || ''}
          onChange={(event) => patch('data-shell-title', event.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        {(['expand', 'zoom', 'pan', 'snapshot'] as const).map((feature) => (
          <Toggle
            key={feature}
            label={feature === 'snapshot' ? 'Download image' : feature[0].toUpperCase() + feature.slice(1)}
            checked={checked(`data-shell-${feature}`)}
            onChange={(value) => patch(`data-shell-${feature}`, value ? '1' : '0')}
          />
        ))}
      </div>
    </div>
  );
}

function GraphEditor({ el, onDirty }: EditorProps) {
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((value) => value + 1);
  const items = Array.from(el.querySelectorAll<HTMLElement>('[data-item]'));
  const mutate = (fn: () => void) => {
    fn();
    refresh();
    onDirty();
  };
  void revision;
  return (
    <div className="space-y-4">
      <Section title="Chart">
        <label className="block text-[11px] font-medium text-[var(--ink)]">
          Chart type
          <select
            className={`${fieldClass} mt-1`}
            value={el.getAttribute('data-chart-type') || 'bar'}
            onChange={(event) =>
              mutate(() => el.setAttribute('data-chart-type', event.target.value))
            }
          >
            {['bar', 'line', 'area', 'pie', 'doughnut', 'horizontalBar'].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <ShellEditor el={el} onDirty={onDirty} />
      </Section>
      <Section title="Series">
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${index}-${item.getAttribute('data-label')}`} className="space-y-2 rounded-lg border border-[var(--line)] p-2">
              <div className="grid grid-cols-[1fr_5rem] gap-2">
                <input
                  aria-label="Label"
                  className={fieldClass}
                  value={item.getAttribute('data-label') || ''}
                  onChange={(event) =>
                    mutate(() => item.setAttribute('data-label', event.target.value))
                  }
                />
                <input
                  aria-label="Value"
                  type="number"
                  step="any"
                  className={fieldClass}
                  value={item.getAttribute('data-value') || '0'}
                  onChange={(event) =>
                    mutate(() => item.setAttribute('data-value', event.target.value))
                  }
                />
              </div>
              <ColorControl
                value={{ enabled: true, hex: item.getAttribute('data-color') || SWATCHES[index % 4]!.hex, alpha: 1 }}
                swatches={SWATCHES}
                disableClear
                onChange={(color) =>
                  mutate(() => item.setAttribute('data-color', color.hex))
                }
              />
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  className={buttonClass}
                  disabled={index === 0}
                  onClick={() => mutate(() => item.previousElementSibling?.before(item))}
                  title="Move up"
                ><ArrowUp className="h-3 w-3" /></button>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={index === items.length - 1}
                  onClick={() => mutate(() => item.nextElementSibling?.after(item))}
                  title="Move down"
                ><ArrowDown className="h-3 w-3" /></button>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => mutate(() => item.remove())}
                  title="Remove"
                ><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={buttonClass}
          onClick={() =>
            mutate(() => {
              const item = document.createElement('span');
              item.hidden = true;
              item.setAttribute('data-item', '');
              item.setAttribute('data-label', `Item ${items.length + 1}`);
              item.setAttribute('data-value', '0');
              item.setAttribute('data-color', SWATCHES[items.length % 4]!.hex);
              el.appendChild(item);
            })
          }
        ><Plus className="h-3.5 w-3.5" /> Add row</button>
      </Section>
    </div>
  );
}

const MERMAID_TEMPLATES: Record<string, string> = {
  flowchart: 'flowchart LR\n  A[Start] --> B[Process]\n  B --> C[End]',
  sequence: 'sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi',
  class: 'classDiagram\n  class Course\n  Course : +title\n  Course : +publish()',
  state: 'stateDiagram-v2\n  [*] --> Draft\n  Draft --> Published\n  Published --> [*]',
  er: 'erDiagram\n  COURSE ||--o{ LESSON : contains',
  gantt: 'gantt\n  title Course plan\n  dateFormat YYYY-MM-DD\n  section Build\n  Lessons :2026-01-01, 7d',
  pie: 'pie title Completion\n  "Complete" : 72\n  "Remaining" : 28',
};

function MermaidEditor({ el, onDirty }: EditorProps) {
  const chart = el.querySelector<HTMLElement>('[data-chart]');
  const [code, setCode] = useState(chart?.textContent || '');
  useEffect(() => setCode(el.querySelector<HTMLElement>('[data-chart]')?.textContent || ''), [el]);
  const writeCode = (value: string) => {
    let target = el.querySelector<HTMLElement>('[data-chart]');
    if (!target) {
      target = document.createElement('pre');
      target.setAttribute('data-chart', '');
      target.hidden = true;
      el.appendChild(target);
    }
    target.textContent = value;
    setCode(value);
    onDirty();
  };
  return (
    <div className="space-y-4">
      <Section title="Diagram code">
        <div className="flex flex-wrap gap-1">
          {Object.entries(MERMAID_TEMPLATES).map(([name, value]) => (
            <button key={name} type="button" className={buttonClass} onClick={() => writeCode(value)}>
              {name}
            </button>
          ))}
        </div>
        <textarea
          className={`${fieldClass} min-h-[180px] font-mono text-[11px]`}
          spellCheck={false}
          value={code}
          onChange={(event) => writeCode(event.target.value)}
        />
        <p className="text-[10px] leading-snug text-[var(--ink-muted)]">
          Diagram updates live on the slide as you edit.
        </p>
      </Section>
      <Section title="Shell">
        <ShellEditor el={el} onDirty={onDirty} />
      </Section>
    </div>
  );
}

function tableRows(table: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(table.rows);
}

function resizeTable(table: HTMLTableElement, rows: number, cols: number, header: boolean) {
  const old = tableRows(table).map((row) =>
    Array.from(row.cells).map((cell) => cell.cloneNode(true) as HTMLTableCellElement),
  );
  const nextRows = Math.max(1, rows);
  const nextCols = Math.max(1, cols);
  table.replaceChildren();
  let body: HTMLTableSectionElement | null = null;
  for (let r = 0; r < nextRows; r += 1) {
    if (r === 0 && header) {
      const head = table.createTHead();
      const row = head.insertRow();
      for (let c = 0; c < nextCols; c += 1) {
        const cell = document.createElement('th');
        const prior = old[r]?.[c];
        if (prior) {
          for (const attr of Array.from(prior.attributes)) cell.setAttribute(attr.name, attr.value);
          cell.innerHTML = prior.innerHTML;
        } else cell.textContent = String.fromCharCode(65 + c);
        row.appendChild(cell);
      }
    } else {
      body ??= table.createTBody();
      const row = body.insertRow();
      for (let c = 0; c < nextCols; c += 1) {
        const cell = row.insertCell();
        const prior = old[r]?.[c];
        if (prior) {
          for (const attr of Array.from(prior.attributes)) cell.setAttribute(attr.name, attr.value);
          cell.innerHTML = prior.innerHTML;
        }
      }
    }
  }
}

function colorValue(raw: string, fallback: string): ColorValue {
  const s = (raw || '').trim();
  if (!s) return { enabled: false, hex: fallback, alpha: 1 };
  if (/^#[0-9a-f]{3,8}$/i.test(s)) {
    const hex =
      s.length === 4
        ? `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`
        : s.slice(0, 7);
    return { enabled: true, hex: hex.toLowerCase(), alpha: 1 };
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const h = (n: string) => Number(n).toString(16).padStart(2, '0');
    return { enabled: true, hex: `#${h(m[1]!)}${h(m[2]!)}${h(m[3]!)}`, alpha: 1 };
  }
  return { enabled: true, hex: fallback, alpha: 1 };
}

function TableEditor({ el, onDirty }: EditorProps) {
  const table = el.matches('table') ? (el as HTMLTableElement) : el.querySelector('table');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const [rowspan, setRowspan] = useState(1);
  const [colspan, setColspan] = useState(1);
  if (!table) return <p className="text-[11px] text-[var(--ink-muted)]">No table found.</p>;
  const rows = tableRows(table);
  const cols = Math.max(1, ...rows.map((row) => row.cells.length));
  const hasHeader = Boolean(table.tHead);
  const cell = rows[selected.row]?.cells[selected.col] || null;
  const mutate = (fn: () => void) => {
    fn();
    setRevision((value) => value + 1);
    onDirty();
  };
  const resize = (nextRows: number, nextCols: number) =>
    mutate(() => resizeTable(table, nextRows, nextCols, hasHeader));
  void revision;
  return (
    <div className="space-y-4">
      <Section title="Dimensions">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-[var(--ink)]">Rows
            <input type="number" min={1} className={`${fieldClass} mt-1`} value={rows.length}
              onChange={(event) => resize(Number(event.target.value), cols)} />
          </label>
          <label className="text-[11px] text-[var(--ink)]">Columns
            <input type="number" min={1} className={`${fieldClass} mt-1`} value={cols}
              onChange={(event) => resize(rows.length, Number(event.target.value))} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button type="button" className={buttonClass} onClick={() => resize(rows.length + 1, cols)}>Add row</button>
          <button type="button" className={buttonClass} onClick={() => resize(rows.length, cols + 1)}>Add column</button>
          <button type="button" className={buttonClass} disabled={rows.length <= 1} onClick={() => resize(rows.length - 1, cols)}>Remove row</button>
          <button type="button" className={buttonClass} disabled={cols <= 1} onClick={() => resize(rows.length, cols - 1)}>Remove column</button>
        </div>
        <Toggle label="Header row" checked={hasHeader}
          onChange={(value) => mutate(() => resizeTable(table, rows.length, cols, value))} />
      </Section>
      <Section title="Select cell">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {rows.flatMap((row, r) =>
            Array.from(row.cells).map((item, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                title={item.textContent || `Cell ${r + 1}, ${c + 1}`}
                onClick={() => setSelected({ row: r, col: c })}
                className={`h-8 truncate rounded border px-1 text-[10px] ${
                  selected.row === r && selected.col === c
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--line)] text-[var(--ink)]'
                }`}
              >{item.textContent || '—'}</button>
            )),
          )}
        </div>
      </Section>
      {cell && (
        <Section title={`Cell ${selected.row + 1}, ${selected.col + 1}`}>
          <textarea className={`${fieldClass} min-h-[70px]`} value={cell.textContent || ''}
            onChange={(event) => mutate(() => { cell.textContent = event.target.value; })} />
          <label className="block text-[11px] text-[var(--ink)]">Background
            <ColorControl
              value={colorValue(cell.getAttribute('data-cell-bg') || cell.style.backgroundColor, '#ffffff')}
              swatches={SWATCHES}
              onChange={(value) => mutate(() => {
                cell.style.backgroundColor = value.enabled ? value.hex : '';
                value.enabled ? cell.setAttribute('data-cell-bg', value.hex) : cell.removeAttribute('data-cell-bg');
              })}
            />
          </label>
          <label className="block text-[11px] text-[var(--ink)]">Text
            <ColorControl
              value={colorValue(cell.getAttribute('data-cell-color') || cell.style.color, '#1c1f26')}
              swatches={SWATCHES}
              onChange={(value) => mutate(() => {
                cell.style.color = value.enabled ? value.hex : '';
                value.enabled ? cell.setAttribute('data-cell-color', value.hex) : cell.removeAttribute('data-cell-color');
              })}
            />
          </label>
          <label className="block text-[11px] text-[var(--ink)]">Border
            <ColorControl
              value={colorValue(cell.getAttribute('data-cell-border') || cell.style.borderColor, '#d0d5dd')}
              swatches={SWATCHES}
              onChange={(value) => mutate(() => {
                cell.style.borderColor = value.enabled ? value.hex : '';
                cell.style.borderStyle = value.enabled ? 'solid' : '';
                cell.style.borderWidth = value.enabled ? '1px' : '';
                value.enabled ? cell.setAttribute('data-cell-border', value.hex) : cell.removeAttribute('data-cell-border');
              })}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Toggle label="Bold" checked={cell.style.fontWeight === 'bold'}
              onChange={(value) => mutate(() => {
                cell.style.fontWeight = value ? 'bold' : '';
                value ? cell.setAttribute('data-cell-bold', '1') : cell.removeAttribute('data-cell-bold');
              })} />
            <Toggle label="Italic" checked={cell.style.fontStyle === 'italic'}
              onChange={(value) => mutate(() => {
                cell.style.fontStyle = value ? 'italic' : '';
                value ? cell.setAttribute('data-cell-italic', '1') : cell.removeAttribute('data-cell-italic');
              })} />
          </div>
          <select className={fieldClass} value={cell.style.textAlign || 'left'}
            onChange={(event) => mutate(() => {
              cell.style.textAlign = event.target.value;
              cell.setAttribute('data-cell-align', event.target.value);
            })}>
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <label className="text-[11px] text-[var(--ink)]">Row span
              <input type="number" min={1} max={rows.length - selected.row} className={`${fieldClass} mt-1`}
                value={rowspan} onChange={(event) => setRowspan(Math.max(1, Number(event.target.value)))} />
            </label>
            <label className="text-[11px] text-[var(--ink)]">Column span
              <input type="number" min={1} max={cols - selected.col} className={`${fieldClass} mt-1`}
                value={colspan} onChange={(event) => setColspan(Math.max(1, Number(event.target.value)))} />
            </label>
            <button type="button" className={buttonClass} onClick={() => mutate(() => {
              cell.rowSpan = Math.min(rowspan, rows.length - selected.row);
              cell.colSpan = Math.min(colspan, cols - selected.col);
              cell.setAttribute('data-cell-merged', `${cell.rowSpan}x${cell.colSpan}`);
            })}>Merge</button>
          </div>
        </Section>
      )}
    </div>
  );
}

function ContainerEditor({ el, onDirty }: EditorProps) {
  return (
    <div className="space-y-4">
      <Section title="Container shell"><ShellEditor el={el} onDirty={onDirty} /></Section>
      <p className="rounded-lg border border-dashed border-[var(--line)] p-3 text-[11px] leading-relaxed text-[var(--ink-muted)]">
        Select inside the container on the lesson stage, then insert media or text.
      </p>
    </div>
  );
}

export function DataPanel({
  courseId,
  onDirtyChange,
  onRequestInsert,
}: {
  courseId?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onRequestInsert?: (kind: DataKind) => void;
}) {
  const { tr } = usePrefs();
  const objectMode = useLessonObjectModeOptional();
  const rawEl = objectMode?.selected?.element;
  const resolved = rawEl?.isConnected ? resolveDataTarget(rawEl) : null;
  const detected = resolved ? detectDataKind(resolved) : null;
  const target = detected ? resolved : null;
  const [kind, setKind] = useState<DataKind>(detected || 'graph');
  void courseId;

  useEffect(() => {
    if (detected) setKind(detected);
  }, [detected, objectMode?.selected?.objectId]);

  const markDirty = useCallback(() => {
    onDirtyChange?.(true);
    objectMode?.root?.setAttribute('data-hc-live-dirty', '1');
  }, [onDirtyChange, objectMode]);

  const convertKind = (next: DataKind) => {
    if (onRequestInsert && !target) {
      onRequestInsert(next);
      return;
    }
    if (!target || !rawEl) return;
    const holder = document.createElement('div');
    holder.innerHTML = createDataHtmlShared(next).trim();
    const node = holder.firstElementChild as HTMLElement | null;
    if (!node) return;
    target.replaceWith(node);
    ensureObjectId(node);
    objectMode?.selectElement(node);
    setKind(next);
    markDirty();
  };

  const onDragStart = (event: DragEvent, itemKind: DataKind, label: string) => {
    const itemId = catalogIdForDataKind(itemKind);
    event.dataTransfer.setData('application/x-hc-element', itemId);
    event.dataTransfer.effectAllowed = 'copy';
    objectMode?.beginCatalogDrag?.(itemId, label);
  };

  const cards = (
    <div className="grid grid-cols-2 gap-2">
      {([
        ['graph', 'Graph', <BarChart3 className="h-5 w-5" key="graph" />],
        ['mermaid', 'Mermaid', <GitBranch className="h-5 w-5" key="mermaid" />],
        ['table', 'Table', <Table2 className="h-5 w-5" key="table" />],
        ['container', 'Container', <Box className="h-5 w-5" key="container" />],
      ] as const).map(([id, label, icon]) => (
        <button
          key={id}
          type="button"
          draggable
          onDragStart={(event) => onDragStart(event, id, label)}
          onClick={() => convertKind(id)}
          className={`flex cursor-grab flex-col items-start gap-2 rounded-lg border p-3 text-left ${
            target && kind === id
              ? 'border-[var(--accent)] bg-[var(--accent-soft)]/50'
              : 'border-[var(--line)] bg-[var(--panel)] hover:border-[var(--accent)]'
          }`}
        >
          <span className="text-[var(--accent)]">{icon}</span>
          <span className="text-[12px] font-semibold text-[var(--ink)]">{label}</span>
        </button>
      ))}
    </div>
  );

  if (!target) {
    // Catalog / insert level only — never show kind cards while editing.
    if (!onRequestInsert) {
      return (
        <p className="text-[11px] text-[var(--ink-muted)]">{tr('inspectorSelectElementHint')}</p>
      );
    }
    return (
      <div className="space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          Insert data
        </div>
        <p className="text-[11px] text-[var(--ink-muted)]">Choose a data object to insert.</p>
        {cards}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {kind === 'graph' && <GraphEditor el={target} onDirty={markDirty} />}
      {kind === 'mermaid' && <MermaidEditor el={target} onDirty={markDirty} />}
      {kind === 'table' && <TableEditor el={target} onDirty={markDirty} />}
      {kind === 'container' && <ContainerEditor el={target} onDirty={markDirty} />}
    </div>
  );
}
