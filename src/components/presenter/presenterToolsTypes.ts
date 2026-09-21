export type PresenterToolId =
  | 'pointer'
  | 'laser'
  | 'color'
  | 'pen'
  | 'marker'
  | 'eraser'
  | 'spotlight'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'text';

export type EraserMode = 'select' | 'clearAll';

export const PRESET_COLORS = [
  '#facc15', // yellow
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#111827', // black
  '#ffffff', // white
  '#f97316', // orange
  '#a855f7', // purple
] as const;

export const TOOL_DEFAULT_COLORS: Partial<Record<PresenterToolId, string>> = {
  laser: '#ef4444',
  pen: '#3b82f6',
  marker: '#facc15',
};

export type Point = { x: number; y: number };

export type StrokeAnnotation = {
  id: string;
  kind: 'stroke';
  tool: 'pen' | 'marker' | 'laser';
  color: string;
  width: number;
  opacity: number;
  points: Point[];
  /** Laser-only: ms until trail expires from last point. */
  trailMs?: number;
  createdAt: number;
};

export type ShapeAnnotation = {
  id: string;
  kind: 'rect' | 'circle' | 'arrow';
  color: string;
  width: number;
  fill: boolean;
  fillOpacity?: number;
  /** Arrow: true = first click is tip (end), false = first click is start (tail). */
  arrowTipFirst?: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type TextAnnotation = {
  id: string;
  kind: 'text';
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
};

export type Annotation = StrokeAnnotation | ShapeAnnotation | TextAnnotation;

export type PresenterToolSettings = {
  keepDefaults: boolean;
  color: string;
  laserTrailMs: number;
  /** When false, laser stays red regardless of the global color tool. */
  laserAllowColor: boolean;
  penWidth: number;
  markerWidth: number;
  markerOpacity: number;
  eraserMode: EraserMode;
  spotlightDarkness: number;
  spotlightRadius: number;
  arrowWidth: number;
  arrowTipFirst: boolean;
  shapeWidth: number;
  shapeFill: boolean;
  shapeFillOpacity: number;
  circleWidth: number;
  circleFill: boolean;
  circleFillOpacity: number;
};

export const DEFAULT_TOOL_SETTINGS: PresenterToolSettings = {
  keepDefaults: true,
  color: '#ef4444',
  laserTrailMs: 900,
  laserAllowColor: false,
  penWidth: 3,
  markerWidth: 16,
  markerOpacity: 0.45,
  eraserMode: 'select',
  spotlightDarkness: 0.72,
  spotlightRadius: 140,
  arrowWidth: 3,
  arrowTipFirst: false,
  shapeWidth: 3,
  shapeFill: false,
  shapeFillOpacity: 0.35,
  circleWidth: 3,
  circleFill: false,
  circleFillOpacity: 0.35,
};

export function uid(prefix = 'a'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function effectiveColor(
  tool: PresenterToolId,
  settings: PresenterToolSettings,
): string {
  if (tool === 'laser') {
    if (settings.laserAllowColor) return settings.color;
    return TOOL_DEFAULT_COLORS.laser ?? '#ef4444';
  }
  if (settings.keepDefaults && TOOL_DEFAULT_COLORS[tool]) {
    return TOOL_DEFAULT_COLORS[tool]!;
  }
  return settings.color;
}
