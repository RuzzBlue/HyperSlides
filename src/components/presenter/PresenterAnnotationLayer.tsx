import { useCallback, useEffect, useRef, useState } from 'react';
import { usePresenterTools } from './PresenterToolsContext';
import {
  effectiveColor,
  uid,
  type Point,
  type ShapeAnnotation,
  type StrokeAnnotation,
  type TextAnnotation,
} from './presenterToolsTypes';

function dist(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function pathD(points: Point[]) {
  if (!points.length) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

function hitStroke(points: Point[], p: Point, threshold: number) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = dist(a, b) || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len)));
    const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    if (dist(proj, p) <= threshold) return true;
  }
  return false;
}

function hitShape(a: ShapeAnnotation, p: Point, threshold: number) {
  if (a.kind === 'rect') {
    const x = Math.min(a.x1, a.x2);
    const y = Math.min(a.y1, a.y2);
    const w = Math.abs(a.x2 - a.x1);
    const h = Math.abs(a.y2 - a.y1);
    if (a.fill) {
      return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    }
    const insideOuter =
      p.x >= x - threshold &&
      p.x <= x + w + threshold &&
      p.y >= y - threshold &&
      p.y <= y + h + threshold;
    const insideInner =
      p.x >= x + threshold &&
      p.x <= x + w - threshold &&
      p.y >= y + threshold &&
      p.y <= y + h - threshold;
    return insideOuter && !insideInner;
  }
  if (a.kind === 'circle') {
    const cx = (a.x1 + a.x2) / 2;
    const cy = (a.y1 + a.y2) / 2;
    const rx = Math.abs(a.x2 - a.x1) / 2;
    const ry = Math.abs(a.y2 - a.y1) / 2;
    if (rx < 1 || ry < 1) return false;
    const nx = (p.x - cx) / rx;
    const ny = (p.y - cy) / ry;
    const r2 = nx * nx + ny * ny;
    if (a.fill) return r2 <= 1;
    return Math.abs(Math.sqrt(r2) - 1) * Math.min(rx, ry) <= threshold;
  }
  // arrow line
  return hitStroke(
    [
      { x: a.x1, y: a.y1 },
      { x: a.x2, y: a.y2 },
    ],
    p,
    threshold + a.width,
  );
}

function hitText(a: TextAnnotation, p: Point) {
  return p.x >= a.x && p.x <= a.x + a.width && p.y >= a.y && p.y <= a.y + a.height;
}

function arrowPoints(x1: number, y1: number, x2: number, y2: number, tipFirst: boolean) {
  const sx = tipFirst ? x2 : x1;
  const sy = tipFirst ? y2 : y1;
  const ex = tipFirst ? x1 : x2;
  const ey = tipFirst ? y1 : y2;
  return { sx, sy, ex, ey };
}

export function PresenterAnnotationLayer() {
  const {
    open,
    tool,
    settings,
    annotations,
    setAnnotations,
    removeAnnotation,
    editingTextId,
    setEditingTextId,
    clearToken,
  } = usePresenterTools();

  const rootRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [draftStroke, setDraftStroke] = useState<StrokeAnnotation | null>(null);
  const [draftShape, setDraftShape] = useState<ShapeAnnotation | null>(null);
  const [draftText, setDraftText] = useState<TextAnnotation | null>(null);
  const [laserLive, setLaserLive] = useState<StrokeAnnotation[]>([]);
  const drawing = useRef(false);
  const hasLaserRef = useRef(false);

  const interactive = open && tool !== 'pointer' && tool !== 'color';
  const showSpotlight = open && tool === 'spotlight';

  // Age laser trails only while strokes exist — perpetual RAF + SVG filters can ghost across GPUs/monitors.
  useEffect(() => {
    let raf = 0;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const now = performance.now();
      setLaserLive((prev) => {
        if (!prev.length) {
          hasLaserRef.current = false;
          return prev;
        }
        const next = prev
          .map((s) => {
            const life = s.trailMs ?? settings.laserTrailMs;
            const age = now - s.createdAt;
            if (age > life) return null;
            const keep = Math.max(2, Math.ceil(s.points.length * (1 - age / life)));
            return { ...s, points: s.points.slice(-Math.min(keep, 64)) };
          })
          .filter(Boolean) as StrokeAnnotation[];
        hasLaserRef.current = next.length > 0;
        return next;
      });
      if (hasLaserRef.current || drawing.current) {
        raf = requestAnimationFrame(tick);
      }
    };
    if (laserLive.length || draftStroke?.tool === 'laser') {
      hasLaserRef.current = true;
      raf = requestAnimationFrame(tick);
    }
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [settings.laserTrailMs, laserLive.length, draftStroke?.tool]);

  // Drop laser state when leaving the tool / closing the palette / clearing all.
  useEffect(() => {
    if (tool !== 'laser' || !open) {
      setLaserLive([]);
      setCursor(null);
    }
  }, [tool, open]);

  useEffect(() => {
    setLaserLive([]);
  }, [clearToken]);

  const relPoint = useCallback((e: React.PointerEvent | PointerEvent): Point | null => {
    const el = rootRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    if (e.button !== 0) return;
    const p = relPoint(e);
    if (!p) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    if (tool === 'eraser') {
      const hit = [...annotations].reverse().find((a) => {
        if (a.kind === 'stroke') return hitStroke(a.points, p, Math.max(10, a.width + 4));
        if (a.kind === 'text') return hitText(a, p);
        return hitShape(a, p, Math.max(10, a.width + 4));
      });
      if (hit) removeAnnotation(hit.id);
      return;
    }

    if (tool === 'text') {
      // Edit existing?
      const existing = [...annotations].reverse().find((a) => a.kind === 'text' && hitText(a, p));
      if (existing && existing.kind === 'text') {
        setEditingTextId(existing.id);
        return;
      }
      const next: TextAnnotation = {
        id: uid('txt'),
        kind: 'text',
        color: effectiveColor('text', settings),
        x: p.x,
        y: p.y,
        width: 220,
        height: 40,
        text: '',
        fontSize: 22,
      };
      setDraftText(next);
      drawing.current = true;
      return;
    }

    if (tool === 'laser' || tool === 'pen' || tool === 'marker') {
      drawing.current = true;
      const color = effectiveColor(tool, settings);
      const width =
        tool === 'pen'
          ? settings.penWidth
          : tool === 'marker'
            ? settings.markerWidth
            : Math.max(6, settings.penWidth + 4);
      const opacity = tool === 'marker' ? settings.markerOpacity : 1;
      const stroke: StrokeAnnotation = {
        id: uid(tool),
        kind: 'stroke',
        tool,
        color,
        width,
        opacity,
        points: [p],
        trailMs: tool === 'laser' ? settings.laserTrailMs : undefined,
        createdAt: performance.now(),
      };
      setDraftStroke(stroke);
      return;
    }

    if (tool === 'arrow' || tool === 'rect' || tool === 'circle') {
      drawing.current = true;
      const color = effectiveColor(tool, settings);
      const width =
        tool === 'arrow'
          ? settings.arrowWidth
          : tool === 'rect'
            ? settings.shapeWidth
            : settings.circleWidth;
      const fill =
        tool === 'rect' ? settings.shapeFill : tool === 'circle' ? settings.circleFill : false;
      const fillOpacity =
        tool === 'rect'
          ? settings.shapeFillOpacity
          : tool === 'circle'
            ? settings.circleFillOpacity
            : 0;
      setDraftShape({
        id: uid(tool),
        kind: tool === 'arrow' ? 'arrow' : tool === 'rect' ? 'rect' : 'circle',
        color,
        width,
        fill,
        fillOpacity,
        arrowTipFirst: tool === 'arrow' ? settings.arrowTipFirst : undefined,
        x1: p.x,
        y1: p.y,
        x2: p.x,
        y2: p.y,
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = relPoint(e);
    if (!p) return;
    setCursor(p);

    if (!drawing.current) return;

    if (draftStroke) {
      setDraftStroke((prev) => {
        if (!prev) return prev;
        const last = prev.points[prev.points.length - 1];
        if (last && dist(last, p) < 1.5) return prev;
        const points = [...prev.points, p];
        // Cap laser sample count so trails stay local to this surface.
        const capped =
          prev.tool === 'laser' && points.length > 80 ? points.slice(-80) : points;
        return {
          ...prev,
          points: capped,
          createdAt: prev.tool === 'laser' ? performance.now() : prev.createdAt,
        };
      });
      return;
    }

    if (draftShape) {
      setDraftShape((prev) => (prev ? { ...prev, x2: p.x, y2: p.y } : prev));
      return;
    }

    if (draftText) {
      setDraftText((prev) =>
        prev
          ? {
              ...prev,
              width: Math.max(80, p.x - prev.x),
              height: Math.max(28, p.y - prev.y),
            }
          : prev,
      );
    }
  };

  const finishStroke = () => {
    if (!draftStroke) return;
    if (draftStroke.tool === 'laser') {
      setLaserLive((prev) => [...prev, { ...draftStroke, createdAt: performance.now() }]);
    } else if (draftStroke.points.length > 1) {
      setAnnotations((prev) => [...prev, draftStroke]);
    }
    setDraftStroke(null);
  };

  const finishShape = () => {
    if (!draftShape) return;
    if (Math.hypot(draftShape.x2 - draftShape.x1, draftShape.y2 - draftShape.y1) > 4) {
      setAnnotations((prev) => [...prev, draftShape]);
    }
    setDraftShape(null);
  };

  const finishText = () => {
    if (!draftText) return;
    const next = {
      ...draftText,
      width: Math.max(120, draftText.width),
      height: Math.max(32, draftText.height),
    };
    setAnnotations((prev) => [...prev, next]);
    setEditingTextId(next.id);
    setDraftText(null);
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    finishStroke();
    finishShape();
    finishText();
  };

  // Keep laser trail growing while dragging
  useEffect(() => {
    if (!draftStroke || draftStroke.tool !== 'laser') return;
    // Mirror live into laserLive for glow while drawing
  }, [draftStroke]);

  const allStrokes = [
    ...annotations.filter((a): a is StrokeAnnotation => a.kind === 'stroke'),
    ...(draftStroke && draftStroke.tool !== 'laser' ? [draftStroke] : []),
  ];
  const lasers = [
    ...laserLive,
    ...(draftStroke?.tool === 'laser' ? [draftStroke] : []),
  ];
  const shapes = [
    ...annotations.filter(
      (a): a is ShapeAnnotation => a.kind === 'rect' || a.kind === 'circle' || a.kind === 'arrow',
    ),
    ...(draftShape ? [draftShape] : []),
  ];
  const texts = [
    ...annotations.filter((a): a is TextAnnotation => a.kind === 'text'),
    ...(draftText ? [draftText] : []),
  ];

  const cursorStyle =
    !interactive
      ? undefined
      : tool === 'eraser'
        ? 'crosshair'
        : tool === 'laser'
          ? // Transparent 1×1 + none: more reliable than `none` alone on Windows/multi-monitor.
            'url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7") 0 0, none'
          : tool === 'text'
            ? 'text'
            : tool === 'spotlight'
              ? 'none'
              : 'crosshair';

  // Keep OS cursor suppressed for the whole laser session while the pointer is on stage.
  useEffect(() => {
    if (!(open && tool === 'laser')) return;
    const root = rootRef.current;
    if (!root) return;
    const hide = () => {
      document.documentElement.classList.add('presenter-laser-hide-cursor');
    };
    const show = () => {
      document.documentElement.classList.remove('presenter-laser-hide-cursor');
    };
    root.addEventListener('pointerenter', hide);
    root.addEventListener('pointermove', hide);
    root.addEventListener('pointerleave', show);
    hide();
    return () => {
      root.removeEventListener('pointerenter', hide);
      root.removeEventListener('pointermove', hide);
      root.removeEventListener('pointerleave', show);
      show();
    };
  }, [open, tool]);

  return (
    <div
      ref={rootRef}
      className={`absolute inset-0 z-[25] overflow-hidden${
        open && tool === 'laser' ? ' presenter-laser-surface' : ''
      }`}
      style={{
        pointerEvents: interactive ? 'auto' : 'none',
        cursor: cursorStyle,
        touchAction: interactive ? 'none' : undefined,
        contain: 'layout paint size',
        isolation: 'isolate',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => {
        if (!drawing.current) setCursor(null);
        if (tool === 'laser' && !drawing.current) setLaserLive([]);
      }}
    >
      <svg className="absolute inset-0 h-full w-full overflow-hidden" style={{ contain: 'strict' }}>
        {/* no SVG filters — blur filters can ghost onto other monitors on multi-GPU setups */}

        {shapes.map((s) => {
          if (s.kind === 'rect') {
            const x = Math.min(s.x1, s.x2);
            const y = Math.min(s.y1, s.y2);
            const w = Math.abs(s.x2 - s.x1);
            const h = Math.abs(s.y2 - s.y1);
            return (
              <rect
                key={s.id}
                x={x}
                y={y}
                width={w}
                height={h}
                fill={s.fill ? s.color : 'none'}
                fillOpacity={s.fill ? (s.fillOpacity ?? 0.35) : 0}
                stroke={s.color}
                strokeWidth={s.width}
              />
            );
          }
          if (s.kind === 'circle') {
            const cx = (s.x1 + s.x2) / 2;
            const cy = (s.y1 + s.y2) / 2;
            const rx = Math.abs(s.x2 - s.x1) / 2;
            const ry = Math.abs(s.y2 - s.y1) / 2;
            return (
              <ellipse
                key={s.id}
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill={s.fill ? s.color : 'none'}
                fillOpacity={s.fill ? (s.fillOpacity ?? 0.35) : 0}
                stroke={s.color}
                strokeWidth={s.width}
              />
            );
          }
          const { sx, sy, ex, ey } = arrowPoints(s.x1, s.y1, s.x2, s.y2, Boolean(s.arrowTipFirst));
          const angle = Math.atan2(ey - sy, ex - sx);
          const head = 12 + s.width * 2;
          const a1 = angle - Math.PI / 7;
          const a2 = angle + Math.PI / 7;
          // Pull the stroke back so it meets the base of the arrowhead (no stub past the tip).
          const inset = head * 0.72;
          const lx = ex - Math.cos(angle) * inset;
          const ly = ey - Math.sin(angle) * inset;
          return (
            <g key={s.id}>
              <line
                x1={sx}
                y1={sy}
                x2={lx}
                y2={ly}
                stroke={s.color}
                strokeWidth={s.width}
                strokeLinecap="butt"
              />
              <polygon
                points={`${ex},${ey} ${ex - head * Math.cos(a1)},${ey - head * Math.sin(a1)} ${ex - head * Math.cos(a2)},${ey - head * Math.sin(a2)}`}
                fill={s.color}
              />
            </g>
          );
        })}

        {allStrokes.map((s) => (
          <path
            key={s.id}
            d={pathD(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={s.opacity}
          />
        ))}

        {lasers.map((s) => (
          <g key={s.id}>
            <path
              d={pathD(s.points)}
              fill="none"
              stroke="#ffffff"
              strokeWidth={s.width + 3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.45}
            />
            <path
              d={pathD(s.points)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.95}
            />
          </g>
        ))}
      </svg>

      {texts.map((t) => {
        const editing = editingTextId === t.id;
        const isDraft = draftText?.id === t.id;
        return (
          <div
            key={t.id}
            className="absolute"
            style={{
              left: t.x,
              top: t.y,
              width: t.width,
              minHeight: t.height,
              pointerEvents: tool === 'text' || editing ? 'auto' : 'none',
            }}
          >
            {isDraft || (editing && !t.text) ? (
              <div
                className="box-border h-full min-h-[32px] w-full rounded border-2 border-dashed"
                style={{ borderColor: t.color }}
              />
            ) : null}
            {editing ? (
              <textarea
                autoFocus
                value={t.text}
                onChange={(e) => {
                  const value = e.target.value;
                  setAnnotations((prev) =>
                    prev.map((a) => (a.id === t.id && a.kind === 'text' ? { ...a, text: value } : a)),
                  );
                }}
                onBlur={() => {
                  setEditingTextId(null);
                  setAnnotations((prev) =>
                    prev.filter((a) => !(a.kind === 'text' && a.id === t.id && !a.text.trim())),
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    (e.target as HTMLTextAreaElement).blur();
                  }
                }}
                className="absolute inset-0 resize-none bg-transparent p-1 outline-none"
                style={{ color: t.color, fontSize: t.fontSize, lineHeight: 1.25 }}
              />
            ) : (
              <div
                className="whitespace-pre-wrap break-words p-1"
                style={{ color: t.color, fontSize: t.fontSize, lineHeight: 1.25 }}
                onDoubleClick={() => {
                  if (tool === 'text') setEditingTextId(t.id);
                }}
              >
                {t.text || (isDraft ? '' : '')}
              </div>
            )}
          </div>
        );
      })}

      {showSpotlight && cursor && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle ${settings.spotlightRadius}px at ${cursor.x}px ${cursor.y}px, transparent 0%, transparent 55%, rgba(0,0,0,${settings.spotlightDarkness}) 70%)`,
          }}
        />
      )}
      {showSpotlight && !cursor && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `rgba(0,0,0,${settings.spotlightDarkness})` }}
        />
      )}

      {open && tool === 'laser' && cursor && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            left: cursor.x - 4,
            top: cursor.y - 4,
            width: 8,
            height: 8,
            background: effectiveColor('laser', settings),
            boxShadow: `0 0 6px 2px ${effectiveColor('laser', settings)}`,
            willChange: 'transform',
          }}
        />
      )}
    </div>
  );
}
