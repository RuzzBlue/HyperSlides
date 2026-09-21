import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Circle,
  Eraser,
  Highlighter,
  Lightbulb,
  MousePointer2,
  Pencil,
  Square,
  Trash2,
  Type,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Flashlight,
} from 'lucide-react';
import { usePrefs } from '../../prefs/PrefsProvider';
import { usePresenterTools } from './PresenterToolsContext';
import {
  PRESET_COLORS,
  TOOL_DEFAULT_COLORS,
  type PresenterToolId,
} from './presenterToolsTypes';

type ToolDef = {
  id: PresenterToolId;
  shortcut?: string;
  icon: ReactNode;
  labelKey: string;
};

const TOOLS: ToolDef[] = [
  { id: 'pointer', shortcut: 'd', icon: <MousePointer2 className="h-4 w-4" />, labelKey: 'presenterToolPointer' },
  { id: 'laser', shortcut: 'l', icon: <Flashlight className="h-4 w-4" />, labelKey: 'presenterToolLaser' },
  { id: 'color', icon: <span className="h-4 w-4 rounded-full border border-[var(--line)]" />, labelKey: 'presenterToolColor' },
  { id: 'pen', shortcut: 'p', icon: <Pencil className="h-4 w-4" />, labelKey: 'presenterToolPen' },
  { id: 'marker', shortcut: 'm', icon: <Highlighter className="h-4 w-4" />, labelKey: 'presenterToolMarker' },
  { id: 'eraser', shortcut: 'e', icon: <Eraser className="h-4 w-4" />, labelKey: 'presenterToolEraser' },
  { id: 'spotlight', icon: <Lightbulb className="h-4 w-4" />, labelKey: 'presenterToolSpotlight' },
  { id: 'arrow', icon: <ArrowRight className="h-4 w-4" />, labelKey: 'presenterToolArrow' },
  { id: 'rect', icon: <Square className="h-4 w-4" />, labelKey: 'presenterToolRect' },
  { id: 'circle', icon: <Circle className="h-4 w-4" />, labelKey: 'presenterToolCircle' },
  { id: 'text', icon: <Type className="h-4 w-4" />, labelKey: 'presenterToolText' },
];

function HoverPanel({
  side,
  open,
  onEnter,
  onLeave,
  children,
}: {
  side: 'right' | 'left';
  open: boolean;
  onEnter: () => void;
  onLeave: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className={`absolute top-0 z-50 ${side === 'right' ? 'left-full' : 'right-full'}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Hit-area bridge so the cursor can reach the panel without a dead gap */}
      <div className={`flex ${side === 'right' ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className="w-1.5 shrink-0 self-stretch" aria-hidden />
        <div className="min-w-[11rem] rounded-lg border border-[var(--line)] bg-[var(--stage)] p-2.5 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  const display =
    max <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}${suffix ?? ''}`;
  return (
    <label className="mb-2 block last:mb-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-medium text-[var(--ink-muted)]">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--ink)]">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? (max <= 1 ? 0.01 : 1)}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="mb-1.5 flex cursor-pointer items-center gap-2 text-[11px] text-[var(--ink)] last:mb-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--accent)]"
      />
      <span>{label}</span>
    </label>
  );
}

export function PresenterToolsPalette() {
  const { tr } = usePrefs();
  const {
    open,
    expanded,
    setExpanded,
    tool,
    setTool,
    settings,
    patchSettings,
    clearAnnotations,
  } = usePresenterTools();

  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 24, y: 120 });
  const [panelSide, setPanelSide] = useState<'right' | 'left'>('right');
  const drag = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const [hoverTool, setHoverTool] = useState<PresenterToolId | null>(null);
  const hoverTimer = useRef<number | null>(null);

  const openHover = (id: PresenterToolId) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    setHoverTool(id);
  };
  const closeHover = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHoverTool(null), 120);
  };

  const clampPos = (x: number, y: number) => {
    const el = rootRef.current;
    const w = el?.offsetWidth ?? 48;
    const h = el?.offsetHeight ?? 48;
    const maxX = Math.max(8, window.innerWidth - w - 8);
    const maxY = Math.max(8, window.innerHeight - h - 8);
    let nx = Math.min(maxX, Math.max(8, x));
    let ny = Math.min(maxY, Math.max(8, y));
    if (nx < 28) nx = 8;
    if (nx > maxX - 20) nx = maxX;
    if (ny < 28) ny = 8;
    if (ny > maxY - 20) ny = maxY;
    setPanelSide(nx > window.innerWidth / 2 ? 'left' : 'right');
    return { x: nx, y: ny };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      const nx = drag.current.sx + (e.clientX - drag.current.ox);
      const ny = drag.current.sy + (e.clientY - drag.current.oy);
      setPos(clampPos(nx, ny));
    };
    const onUp = () => {
      drag.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const key = e.key.toLowerCase();
      const match = TOOLS.find((toolDef) => toolDef.shortcut === key);
      if (match) {
        e.preventDefault();
        e.stopPropagation();
        setTool(match.id);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, setTool]);

  useEffect(() => {
    if (!open) setHoverTool(null);
  }, [open]);

  if (!open) return null;

  const toolColorDot = (id: PresenterToolId) => {
    if (id === 'color') return settings.color;
    if (id === 'laser') {
      return settings.laserAllowColor
        ? settings.color
        : (TOOL_DEFAULT_COLORS.laser ?? '#ef4444');
    }
    if (settings.keepDefaults && TOOL_DEFAULT_COLORS[id]) return TOOL_DEFAULT_COLORS[id];
    if (
      id === 'arrow' ||
      id === 'rect' ||
      id === 'circle' ||
      id === 'text' ||
      id === 'pen' ||
      id === 'marker'
    ) {
      return settings.keepDefaults && TOOL_DEFAULT_COLORS[id]
        ? TOOL_DEFAULT_COLORS[id]!
        : settings.color;
    }
    return null;
  };

  const hoverProps = (id: PresenterToolId) => ({
    side: panelSide,
    open: hoverTool === id,
    onEnter: () => openHover(id),
    onLeave: closeHover,
  });

  const renderHover = (id: PresenterToolId) => {
    if (id === 'laser') {
      return (
        <HoverPanel {...hoverProps(id)}>
          <SliderRow
            label={tr('presenterLaserTrail')}
            value={settings.laserTrailMs}
            min={200}
            max={3000}
            step={50}
            suffix="ms"
            onChange={(n) => patchSettings({ laserTrailMs: n })}
          />
          <CheckRow
            label={tr('presenterLaserAllowColor')}
            checked={settings.laserAllowColor}
            onChange={(v) => patchSettings({ laserAllowColor: v })}
          />
        </HoverPanel>
      );
    }
    if (id === 'color') {
      return (
        <HoverPanel {...hoverProps(id)}>
          <CheckRow
            label={tr('presenterKeepDefaults')}
            checked={settings.keepDefaults}
            onChange={(v) => patchSettings({ keepDefaults: v })}
          />
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => patchSettings({ color: c })}
                className={`h-6 w-6 cursor-pointer rounded-md border ${
                  settings.color.toLowerCase() === c.toLowerCase()
                    ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                    : 'border-[var(--line)]'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-[10px] text-[var(--ink-muted)]">
            <span>{tr('presenterCustomColor')}</span>
            <input
              type="color"
              value={settings.color}
              onChange={(e) => patchSettings({ color: e.target.value })}
              className="h-6 w-8 cursor-pointer rounded border border-[var(--line)] bg-transparent"
            />
          </label>
        </HoverPanel>
      );
    }
    if (id === 'pen') {
      return (
        <HoverPanel {...hoverProps(id)}>
          <SliderRow
            label={tr('presenterThickness')}
            value={settings.penWidth}
            min={1}
            max={16}
            onChange={(n) => patchSettings({ penWidth: n })}
          />
        </HoverPanel>
      );
    }
    if (id === 'marker') {
      return (
        <HoverPanel {...hoverProps(id)}>
          <SliderRow
            label={tr('presenterOpacity')}
            value={settings.markerOpacity}
            min={0.15}
            max={0.85}
            onChange={(n) => patchSettings({ markerOpacity: n })}
          />
          <SliderRow
            label={tr('presenterThickness')}
            value={settings.markerWidth}
            min={8}
            max={40}
            onChange={(n) => patchSettings({ markerWidth: n })}
          />
        </HoverPanel>
      );
    }
    if (id === 'eraser') {
      return (
        <HoverPanel {...hoverProps(id)}>
          <div className="mb-2 flex gap-1">
            <button
              type="button"
              onClick={() => patchSettings({ eraserMode: 'select' })}
              className={`flex-1 rounded-md px-2 py-1 text-[10px] font-semibold ${
                settings.eraserMode === 'select'
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--ink-muted)] hover:bg-black/5'
              }`}
            >
              {tr('presenterEraserSelect')}
            </button>
            <button
              type="button"
              title={tr('presenterEraserClearAll')}
              onClick={() => clearAnnotations()}
              className="inline-flex cursor-pointer items-center justify-center rounded-md px-2 py-1 text-[var(--ink-muted)] hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] leading-snug text-[var(--ink-muted)]">
            {tr('presenterEraserSelectHint')}
          </p>
        </HoverPanel>
      );
    }
    if (id === 'spotlight') {
      return (
        <HoverPanel {...hoverProps(id)}>
          <SliderRow
            label={tr('presenterSpotlightDark')}
            value={settings.spotlightDarkness}
            min={0.25}
            max={1}
            onChange={(n) => patchSettings({ spotlightDarkness: n })}
          />
          <SliderRow
            label={tr('presenterSpotlightSize')}
            value={settings.spotlightRadius}
            min={60}
            max={320}
            suffix="px"
            onChange={(n) => patchSettings({ spotlightRadius: n })}
          />
        </HoverPanel>
      );
    }
    if (id === 'arrow') {
      return (
        <HoverPanel {...hoverProps(id)}>
          <SliderRow
            label={tr('presenterThickness')}
            value={settings.arrowWidth}
            min={1}
            max={12}
            onChange={(n) => patchSettings({ arrowWidth: n })}
          />
          <CheckRow
            label={tr('presenterArrowEndToStart')}
            checked={!settings.arrowTipFirst}
            onChange={(v) => patchSettings({ arrowTipFirst: !v })}
          />
        </HoverPanel>
      );
    }
    if (id === 'rect') {
      return (
        <HoverPanel {...hoverProps(id)}>
          <SliderRow
            label={tr('presenterThickness')}
            value={settings.shapeWidth}
            min={1}
            max={12}
            onChange={(n) => patchSettings({ shapeWidth: n })}
          />
          <CheckRow
            label={tr('presenterShapeFill')}
            checked={settings.shapeFill}
            onChange={(v) => patchSettings({ shapeFill: v })}
          />
          {settings.shapeFill && (
            <SliderRow
              label={tr('presenterFillOpacity')}
              value={settings.shapeFillOpacity}
              min={0}
              max={1}
              onChange={(n) => patchSettings({ shapeFillOpacity: n })}
            />
          )}
        </HoverPanel>
      );
    }
    if (id === 'circle') {
      return (
        <HoverPanel {...hoverProps(id)}>
          <SliderRow
            label={tr('presenterThickness')}
            value={settings.circleWidth}
            min={1}
            max={12}
            onChange={(n) => patchSettings({ circleWidth: n })}
          />
          <CheckRow
            label={tr('presenterShapeFill')}
            checked={settings.circleFill}
            onChange={(v) => patchSettings({ circleFill: v })}
          />
          {settings.circleFill && (
            <SliderRow
              label={tr('presenterFillOpacity')}
              value={settings.circleFillOpacity}
              min={0}
              max={1}
              onChange={(n) => patchSettings({ circleFillOpacity: n })}
            />
          )}
        </HoverPanel>
      );
    }
    return null;
  };

  if (!expanded) {
    return (
      <div
        ref={rootRef}
        data-presenter-tools
        className="fixed z-[80] flex w-fit items-center gap-0.5 rounded-full border border-[var(--line)] bg-[var(--stage)] p-1 shadow-2xl"
        style={{ left: pos.x, top: pos.y }}
      >
        <button
          type="button"
          title={tr('presenterToolsDrag')}
          className="cursor-grab rounded-full p-1.5 text-[var(--ink-muted)] active:cursor-grabbing"
          onPointerDown={(e) => {
            e.preventDefault();
            drag.current = { ox: e.clientX, oy: e.clientY, sx: pos.x, sy: pos.y };
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'grabbing';
          }}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title={tr('presenterToolsExpand')}
          onClick={() => setExpanded(true)}
          className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"
        >
          <Pencil className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--panel)] text-[var(--ink-muted)] shadow">
            <ChevronRight className="h-3 w-3" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      data-presenter-tools
      className="fixed z-[80] flex w-fit flex-col overflow-visible rounded-xl border border-[var(--line)] bg-[var(--stage)] shadow-2xl"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="relative flex h-6 cursor-grab items-center justify-center border-b border-[var(--line)] bg-[var(--panel)] active:cursor-grabbing"
        onPointerDown={(e) => {
          e.preventDefault();
          drag.current = { ox: e.clientX, oy: e.clientY, sx: pos.x, sy: pos.y };
          document.body.style.userSelect = 'none';
          document.body.style.cursor = 'grabbing';
        }}
      >
        <div className="h-1 w-5 rounded-full bg-[var(--line)]" title={tr('presenterToolsDrag')} />
        <button
          type="button"
          title={tr('presenterToolsCollapse')}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-0.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
      </div>

      <div className="flex w-[2.75rem] flex-col gap-0.5 p-1">
        {TOOLS.map((t) => {
          const active = tool === t.id;
          const dot = toolColorDot(t.id);
          return (
            <div
              key={t.id}
              className="relative"
              onMouseEnter={() => openHover(t.id)}
              onMouseLeave={closeHover}
            >
              <button
                type="button"
                title={`${tr(t.labelKey as never)}${t.shortcut ? ` (${t.shortcut.toUpperCase()})` : ''}`}
                onClick={() => setTool(t.id)}
                className={`relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)] dark:hover:bg-white/10'
                }`}
              >
                {t.id === 'color' ? (
                  <span
                    className="h-4 w-4 rounded-full border border-[var(--line)] shadow-inner"
                    style={{ background: settings.color }}
                  />
                ) : (
                  t.icon
                )}
                {dot &&
                  t.id !== 'color' &&
                  t.id !== 'pointer' &&
                  t.id !== 'eraser' &&
                  t.id !== 'spotlight' && (
                    <span
                      className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full border border-white/70"
                      style={{ background: dot }}
                    />
                  )}
              </button>
              {renderHover(t.id)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
