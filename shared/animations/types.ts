/** Lesson slide animation document (sidecar JSON next to lesson HTML). */

export type AnimKind = 'entrance' | 'action' | 'exit';
export type AnimStart = 'on-key' | 'after-previous' | 'with-previous';
export type ChildScope = 'block' | 'line' | 'element' | 'group';
export type AnimDirection = 'up' | 'down' | 'left' | 'right';

export interface SlideAnimationParams {
  direction?: AnimDirection;
  childScope?: ChildScope;
}

export interface SlideAnimation {
  id: string;
  /** Matches `data-hc-obj` on the lesson DOM node. */
  objectId: string;
  kind: AnimKind;
  effectId: string;
  /** Playback order; 0 = autoplay when the slide opens. */
  order: number;
  start: AnimStart;
  durationSec: number;
  params: SlideAnimationParams;
}

export interface LessonAnimationsDoc {
  version: 1;
  items: SlideAnimation[];
}

/** Advance-key slots for presenter animation / slide advance. */
export type AnimationAdvanceKey =
  | 'none'
  | 'next'
  | 'right-click'
  | 'space'
  | 'enter'
  | 'tab'
  | 'up'
  | 'down'
  | 'left-click';

export type AnimationAdvanceKeys = [
  Exclude<AnimationAdvanceKey, 'none'>,
  AnimationAdvanceKey,
  AnimationAdvanceKey,
];

export const DEFAULT_ANIMATION_ADVANCE_KEYS: AnimationAdvanceKeys = [
  'next',
  'right-click',
  'space',
];

export function emptyLessonAnimationsDoc(): LessonAnimationsDoc {
  return { version: 1, items: [] };
}

export function normalizeLessonAnimationsDoc(
  raw: LessonAnimationsDoc | null | undefined,
): LessonAnimationsDoc {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.items)) {
    return emptyLessonAnimationsDoc();
  }
  const items = raw.items
    .filter((it) => it && typeof it === 'object')
    .map((it, i) => normalizeSlideAnimation(it, i))
    .filter((it): it is SlideAnimation => it != null);
  return { version: 1, items: reindexOrders(enforceConstraints(items)) };
}

function normalizeSlideAnimation(
  raw: Partial<SlideAnimation>,
  fallbackIndex: number,
): SlideAnimation | null {
  const objectId = String(raw.objectId ?? '').trim();
  const effectId = String(raw.effectId ?? '').trim();
  if (!objectId || !effectId) return null;
  const kind: AnimKind =
    raw.kind === 'action' || raw.kind === 'exit' ? raw.kind : 'entrance';
  const start: AnimStart =
    raw.start === 'after-previous' || raw.start === 'with-previous'
      ? raw.start
      : 'on-key';
  const durationSec = Math.max(
    0.1,
    Math.min(30, Number(raw.durationSec) || 0.6),
  );
  const params: SlideAnimationParams = {};
  if (
    raw.params?.direction === 'up' ||
    raw.params?.direction === 'down' ||
    raw.params?.direction === 'left' ||
    raw.params?.direction === 'right'
  ) {
    params.direction = raw.params.direction;
  }
  if (
    raw.params?.childScope === 'block' ||
    raw.params?.childScope === 'line' ||
    raw.params?.childScope === 'element' ||
    raw.params?.childScope === 'group'
  ) {
    params.childScope = raw.params.childScope;
  }
  return {
    id: String(raw.id ?? '').trim() || `anim_${fallbackIndex}_${objectId}_${kind}`,
    objectId,
    kind,
    effectId,
    order: Number.isFinite(raw.order) ? Number(raw.order) : fallbackIndex + 1,
    start,
    durationSec,
    params,
  };
}

/** One effect per kind per object; entrance → action → exit order; optional ancestor exits. */
export function enforceConstraints(
  items: SlideAnimation[],
  opts?: { ancestorObjectIds?: (objectId: string) => string[] },
): SlideAnimation[] {
  const byObjKind = new Map<string, SlideAnimation>();
  for (const it of items) {
    byObjKind.set(`${it.objectId}::${it.kind}`, { ...it });
  }
  let list = [...byObjKind.values()];

  list = fixKindOrderPerObject(list);
  if (opts?.ancestorObjectIds) {
    list = fixAncestorExitOrder(list, opts.ancestorObjectIds);
  }

  list.sort((a, b) => a.order - b.order || kindRank(a.kind) - kindRank(b.kind) || a.id.localeCompare(b.id));

  // First item cannot be after-previous
  if (list.length) {
    const first = list[0]!;
    if (first.start === 'after-previous') {
      list[0] = { ...first, start: 'on-key' };
    }
    if (first.start === 'with-previous') {
      list[0] = { ...first, order: 0, start: 'with-previous' };
    }
  }

  return list;
}

const KIND_RANK: Record<AnimKind, number> = {
  entrance: 0,
  action: 1,
  exit: 2,
};

function kindRank(kind: AnimKind): number {
  return KIND_RANK[kind] ?? 0;
}

/** For each object, assign sorted orders so entrance < action < exit. */
function fixKindOrderPerObject(list: SlideAnimation[]): SlideAnimation[] {
  const byObj = new Map<string, SlideAnimation[]>();
  for (const it of list) {
    const g = byObj.get(it.objectId) ?? [];
    g.push(it);
    byObj.set(it.objectId, g);
  }
  const out = list.map((i) => ({ ...i }));
  for (const group of byObj.values()) {
    if (group.length < 2) continue;
    const byKind = [...group].sort((a, b) => kindRank(a.kind) - kindRank(b.kind));
    const orders = [...group].map((g) => g.order).sort((a, b) => a - b);
    for (let i = 0; i < byKind.length; i++) {
      const item = byKind[i]!;
      const idx = out.findIndex((r) => r.id === item.id);
      if (idx >= 0) out[idx] = { ...out[idx]!, order: orders[i]! };
    }
  }
  return out;
}

/**
 * Ancestor section exits must come after descendant entrance/action (and after descendant exits).
 */
function fixAncestorExitOrder(
  list: SlideAnimation[],
  ancestorObjectIds: (objectId: string) => string[],
): SlideAnimation[] {
  const out = list.map((i) => ({ ...i }));
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 24) {
    changed = false;
    out.sort((a, b) => a.order - b.order || kindRank(a.kind) - kindRank(b.kind));
    for (const child of out) {
      const ancestors = ancestorObjectIds(child.objectId);
      for (const pid of ancestors) {
        const parentExit = out.find((r) => r.objectId === pid && r.kind === 'exit');
        if (!parentExit) continue;
        if (child.kind !== 'exit' && child.order >= parentExit.order) {
          parentExit.order = child.order + 1;
          changed = true;
        }
        if (child.kind === 'exit' && child.order > parentExit.order) {
          parentExit.order = child.order + 1;
          changed = true;
        }
      }
    }
  }
  return out;
}

export function reindexOrders(items: SlideAnimation[]): SlideAnimation[] {
  const sorted = [...items].sort(
    (a, b) => a.order - b.order || kindRank(a.kind) - kindRank(b.kind) || a.id.localeCompare(b.id),
  );
  let next = 1;
  return sorted.map((it) => {
    if (it.order === 0 || (it.start === 'with-previous' && next === 1 && it.order === 0)) {
      return { ...it, order: 0 };
    }
    if (it.order === 0) return { ...it, order: 0 };
    const order = next++;
    return { ...it, order };
  });
}

/**
 * After user edits, normalize start modes and orders:
 * - with-previous on first → order 0
 * - after-previous on first → on-key
 * - reassign sequential orders for non-zero items
 * - enforce entrance → action → exit (and ancestor exit after descendants)
 */
export function normalizeAnimationList(
  items: SlideAnimation[],
  opts?: { ancestorObjectIds?: (objectId: string) => string[] },
): SlideAnimation[] {
  const enforced = enforceConstraints(items, opts);
  const sorted = [...enforced].sort(
    (a, b) => a.order - b.order || kindRank(a.kind) - kindRank(b.kind) || a.id.localeCompare(b.id),
  );
  if (!sorted.length) return [];

  const out: SlideAnimation[] = [];
  let seq = 1;
  for (let i = 0; i < sorted.length; i++) {
    let it = { ...sorted[i]! };
    if (i === 0) {
      if (it.start === 'after-previous') it = { ...it, start: 'on-key' };
      if (it.start === 'with-previous') {
        out.push({ ...it, order: 0 });
        continue;
      }
      if (it.order === 0) {
        out.push({ ...it, order: 0 });
        continue;
      }
    }
    out.push({ ...it, order: seq++ });
  }
  return out;
}

export function animationsSidecarPath(lessonFile: string): string {
  const f = lessonFile.replace(/\\/g, '/');
  if (f.toLowerCase().endsWith('.html')) {
    return `${f.slice(0, -5)}.animations.json`;
  }
  return `${f}.animations.json`;
}
