import anime from 'animejs';
import { getEffectDef } from '@shared/animations/effects';
import type {
  AnimDirection,
  ChildScope,
  SlideAnimation,
} from '@shared/animations/types';
import { findByObjectId, HC_OBJ_ATTR } from './selection';

/** Temporary entrance hide — must not touch author `style.opacity` / `visibility`. */
export const HC_ANIM_HIDDEN_ATTR = 'data-hc-anim-hidden';

/** Captured design opacity used as “100% visible” during playback. */
const HC_AUTHOR_OPACITY_ATTR = 'data-hc-author-opacity';

export function clearAnimHide(el: HTMLElement) {
  el.removeAttribute(HC_ANIM_HIDDEN_ATTR);
}

export function setAnimHide(el: HTMLElement) {
  el.setAttribute(HC_ANIM_HIDDEN_ATTR, '1');
}

/** Clear anime.js leftovers without wiping authored opacity / visibility. */
export function clearAnimRuntimeStyles(el: HTMLElement) {
  anime.remove(el);
  el.style.removeProperty('transform');
  el.style.removeProperty('filter');
  el.style.removeProperty('pointer-events');
  clearAnimHide(el);
}

function clampOpacity(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

/** Resolve design opacity: inline style, else captured attr, else computed (default 1). */
export function readAuthorOpacity(el: HTMLElement): number {
  const attr = el.getAttribute(HC_AUTHOR_OPACITY_ATTR);
  if (attr != null && attr !== '') {
    const n = Number.parseFloat(attr);
    if (Number.isFinite(n)) return clampOpacity(n);
  }
  const inline = el.style.opacity.trim();
  if (inline !== '') {
    const n = Number.parseFloat(inline);
    if (Number.isFinite(n)) return clampOpacity(n);
  }
  const computed = Number.parseFloat(getComputedStyle(el).opacity);
  return clampOpacity(Number.isFinite(computed) ? computed : 1);
}

function applyAuthorOpacity(el: HTMLElement, base: number) {
  if (base >= 0.999) el.style.removeProperty('opacity');
  else el.style.opacity = String(base);
}

function dirOffset(direction: AnimDirection | undefined, axis: 'x' | 'y'): number {
  const d = direction ?? 'up';
  if (axis === 'x') {
    if (d === 'left') return -48;
    if (d === 'right') return 48;
    return 0;
  }
  if (d === 'up') return 40;
  if (d === 'down') return -40;
  return 0;
}

function resolveTargets(
  el: HTMLElement,
  scope: ChildScope | undefined,
): HTMLElement | HTMLElement[] {
  const s = scope ?? 'block';
  if (s === 'block') return el;
  if (s === 'line') {
    const lis = Array.from(el.querySelectorAll<HTMLElement>(':scope > li'));
    if (lis.length) return lis;
    const kids = Array.from(el.children).filter(
      (c): c is HTMLElement => c instanceof HTMLElement,
    );
    return kids.length ? kids : el;
  }
  if (s === 'element' || s === 'group') {
    const kids = Array.from(el.children).filter(
      (c): c is HTMLElement => c instanceof HTMLElement,
    );
    return kids.length ? kids : el;
  }
  return el;
}

type PresetId = NonNullable<ReturnType<typeof getEffectDef>>['preset'] | 'fadeIn';

function isExitPreset(preset: PresetId): boolean {
  return (
    preset === 'fadeOut' ||
    preset === 'slideOut' ||
    preset === 'wipeOut' ||
    preset === 'zoomOut' ||
    preset === 'shrinkOut' ||
    preset === 'blurOut'
  );
}

/**
 * One cycle of an effect.
 * `base` = authored element opacity treated as full visibility (1.0 in keyframes).
 */
function runPresetCycle(
  list: HTMLElement[],
  effectId: string,
  durationMs: number,
  direction: AnimDirection | undefined,
  hideWhenDone: boolean,
  base: number,
): Promise<void> {
  const def = getEffectDef(effectId);
  const preset: PresetId = def?.preset ?? 'fadeIn';
  const duration = Math.max(40, durationMs);
  const full = clampOpacity(base);
  const dim = full * 0.2;

  return new Promise((resolve) => {
    const finish = () => resolve();
    const hideTargets = () => {
      list.forEach((t) => {
        setAnimHide(t);
        // Don't leave anime's opacity:0 on the node (would overwrite author styles).
        t.style.removeProperty('opacity');
        t.style.removeProperty('visibility');
      });
    };
    const restoreVisible = () => {
      list.forEach((t) => applyAuthorOpacity(t, full));
    };
    const common = {
      targets: list,
      duration,
      easing: 'easeOutQuad' as const,
      complete: () => {
        if (hideWhenDone) hideTargets();
        else restoreVisible();
        finish();
      },
    };

    switch (preset) {
      case 'fadeIn':
        anime({ ...common, opacity: [0, full] });
        break;
      case 'fadeOut':
        anime({ ...common, opacity: [full, 0] });
        break;
      case 'slideIn':
        anime({
          ...common,
          opacity: [0, full],
          translateX: [dirOffset(direction, 'x'), 0],
          translateY: [dirOffset(direction, 'y'), 0],
        });
        break;
      case 'slideOut':
      case 'wipeOut':
        anime({
          ...common,
          opacity: [full, 0],
          translateX: [0, dirOffset(direction, 'x') || (direction === 'right' ? 60 : -60)],
          translateY: [0, dirOffset(direction, 'y')],
        });
        break;
      case 'zoomIn':
      case 'bounceIn':
        anime({
          ...common,
          opacity: [0, full],
          scale: [preset === 'bounceIn' ? 0.6 : 0.85, 1],
          easing: preset === 'bounceIn' ? 'easeOutElastic(1, .6)' : 'easeOutQuad',
        });
        break;
      case 'zoomOut':
      case 'shrinkOut':
        anime({ ...common, opacity: [full, 0], scale: [1, 0.7] });
        break;
      case 'blurIn':
        anime({
          ...common,
          opacity: [0, full],
          filter: ['blur(8px)', 'blur(0px)'],
        });
        break;
      case 'blurOut':
        anime({
          ...common,
          opacity: [full, 0],
          filter: ['blur(0px)', 'blur(8px)'],
        });
        break;
      case 'flipIn':
        anime({
          ...common,
          opacity: [0, full],
          rotateY: direction === 'right' || direction === 'left' ? [-75, 0] : 0,
          rotateX: direction === 'up' || direction === 'down' ? [75, 0] : 0,
        });
        break;
      case 'pulse':
      case 'heartbeat':
        anime({
          ...common,
          scale: [1, 1.08, 1],
          easing: 'easeInOutSine',
        });
        break;
      case 'shake':
        anime({
          ...common,
          translateX: direction === 'up' || direction === 'down' ? 0 : [-10, 10, -8, 8, 0],
          translateY: direction === 'up' || direction === 'down' ? [-8, 8, -6, 6, 0] : 0,
        });
        break;
      case 'bounce':
      case 'float':
        anime({
          ...common,
          translateY: [0, -14, 0],
          easing: 'easeInOutSine',
        });
        break;
      case 'wiggle':
        anime({ ...common, rotate: [-4, 4, -3, 3, 0] });
        break;
      case 'flash':
        anime({ ...common, opacity: [full, dim, full, dim, full] });
        break;
      case 'spin':
        anime({ ...common, rotate: [0, 360] });
        break;
      default:
        anime({ ...common, opacity: [full * 0.5, full] });
    }
  });
}

/**
 * Play an effect across `durationSec`.
 * Action `repeatCount` splits that total time into N sequential cycles
 * (e.g. heartbeat, 1s, repeat 3 → three beats in one second).
 */
async function runPreset(
  targets: HTMLElement | HTMLElement[],
  effectId: string,
  durationSec: number,
  direction: AnimDirection | undefined,
  repeatCount: number,
  base: number,
): Promise<void> {
  const def = getEffectDef(effectId);
  const preset: PresetId = def?.preset ?? 'fadeIn';
  const loops = Math.max(1, Math.min(30, Math.round(repeatCount) || 1));
  const totalMs = Math.max(100, Math.round(durationSec * 1000));
  const cycleMs = Math.max(40, Math.round(totalMs / loops));
  const list = Array.isArray(targets) ? targets : [targets];

  anime.remove(list);
  list.forEach((t) => {
    t.style.visibility = 'visible';
    t.style.pointerEvents = '';
  });

  for (let i = 0; i < loops; i++) {
    const last = i === loops - 1;
    await runPresetCycle(
      list,
      effectId,
      cycleMs,
      direction,
      last && isExitPreset(preset),
      base,
    );
  }
}

export async function playSlideAnimation(
  root: HTMLElement,
  anim: SlideAnimation,
  baseOpacity?: number,
): Promise<void> {
  const el = findByObjectId(root, anim.objectId);
  if (!el) return;
  clearAnimHide(el);
  const targets = resolveTargets(el, anim.params.childScope);
  const list = Array.isArray(targets) ? targets : [targets];
  list.forEach((t) => clearAnimHide(t));
  const base = clampOpacity(baseOpacity ?? readAuthorOpacity(el));
  // Entrance starts from transparent without flashing authored opacity first.
  if (anim.kind === 'entrance') {
    list.forEach((t) => {
      t.style.opacity = '0';
    });
  } else {
    list.forEach((t) => applyAuthorOpacity(t, base));
  }
  const repeat =
    anim.kind === 'action' ? Math.max(1, Math.round(Number(anim.repeat) || 1)) : 1;
  await runPreset(
    targets,
    anim.effectId,
    anim.durationSec,
    anim.params.direction,
    repeat,
    base,
  );
}

export type AnimationRunner = {
  /** Hide entrance targets until played; reset visibility. */
  prepare: () => void;
  /** Play autoplay (order 0 + with-previous chain). */
  playAutostart: () => Promise<void>;
  /** Advance next on-key step (and following after/with previous). Returns false if none left. */
  advance: () => Promise<boolean>;
  hasPending: () => boolean;
  destroy: () => void;
};

/**
 * Keynote-like playback:
 * - order 0 / first with-previous → autoplay on slide enter
 * - on-key steps wait for advance()
 * - after-previous waits for prior completion
 * - with-previous starts with prior group
 */
export function createAnimationRunner(
  root: HTMLElement,
  items: SlideAnimation[],
): AnimationRunner {
  const sorted = [...items].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  );
  let cursor = 0;
  let destroyed = false;
  let advancing = false;
  /** Author opacity/visibility captured once so anime cleanup cannot wipe design styles. */
  const authorPaint = new Map<
    string,
    { opacity: string; visibility: string; base: number }
  >();

  const captureAuthor = (el: HTMLElement, id: string) => {
    if (authorPaint.has(id)) return;
    const opacity = el.style.opacity;
    const visibility = el.style.visibility;
    const base = readAuthorOpacity(el);
    authorPaint.set(id, { opacity, visibility, base });
    el.setAttribute(HC_AUTHOR_OPACITY_ATTR, String(base));
  };

  const restoreAuthor = (el: HTMLElement, id: string) => {
    const snap = authorPaint.get(id);
    if (!snap) return;
    if (snap.opacity) el.style.opacity = snap.opacity;
    else el.style.removeProperty('opacity');
    if (snap.visibility) el.style.visibility = snap.visibility;
    else el.style.removeProperty('visibility');
    el.removeAttribute(HC_AUTHOR_OPACITY_ATTR);
  };

  const baseFor = (objectId: string, el: HTMLElement | null): number => {
    const snap = authorPaint.get(objectId);
    if (snap) return snap.base;
    return el ? readAuthorOpacity(el) : 1;
  };

  const prepare = () => {
    const ids = new Set(sorted.map((i) => i.objectId));
    ids.forEach((id) => {
      const el = findByObjectId(root, id);
      if (!el) return;
      captureAuthor(el, id);
      clearAnimRuntimeStyles(el);
      restoreAuthor(el, id);
      // Re-stamp attr after restore (restore clears it).
      const snap = authorPaint.get(id);
      if (snap) el.setAttribute(HC_AUTHOR_OPACITY_ATTR, String(snap.base));
    });
    sorted
      .filter((i) => i.kind === 'entrance')
      .forEach((i) => {
        const el = findByObjectId(root, i.objectId);
        if (el) setAnimHide(el);
      });
  };

  const playOne = (anim: SlideAnimation) => {
    const el = findByObjectId(root, anim.objectId);
    return playSlideAnimation(root, anim, baseFor(anim.objectId, el));
  };

  const playGroupFrom = async (startIndex: number): Promise<number> => {
    if (destroyed || startIndex >= sorted.length) return startIndex;
    const first = sorted[startIndex]!;
    const group: SlideAnimation[] = [first];
    let i = startIndex + 1;
    while (i < sorted.length && sorted[i]!.start === 'with-previous') {
      group.push(sorted[i]!);
      i += 1;
    }
    await Promise.all(group.map((g) => playOne(g)));
    let next = i;
    while (next < sorted.length && sorted[next]!.start === 'after-previous') {
      const afterStart = next;
      const afterGroup: SlideAnimation[] = [sorted[afterStart]!];
      next = afterStart + 1;
      while (next < sorted.length && sorted[next]!.start === 'with-previous') {
        afterGroup.push(sorted[next]!);
        next += 1;
      }
      await Promise.all(afterGroup.map((g) => playOne(g)));
    }
    return next;
  };

  const playAutostart = async () => {
    if (destroyed) return;
    if (!sorted.length) return;
    if (sorted[0]!.order === 0 || sorted[0]!.start === 'with-previous') {
      cursor = await playGroupFrom(0);
      return;
    }
    cursor = 0;
  };

  const advance = async () => {
    if (destroyed || advancing) return false;
    if (cursor >= sorted.length) return false;
    advancing = true;
    try {
      cursor = await playGroupFrom(cursor);
      return true;
    } finally {
      advancing = false;
    }
  };

  return {
    prepare,
    playAutostart,
    advance,
    hasPending: () => cursor < sorted.length,
    destroy: () => {
      destroyed = true;
      anime.remove(root.querySelectorAll(`[${HC_OBJ_ATTR}]`));
      const ids = new Set(sorted.map((i) => i.objectId));
      ids.forEach((id) => {
        const el = findByObjectId(root, id);
        if (!el) return;
        clearAnimRuntimeStyles(el);
        restoreAuthor(el, id);
      });
      root.querySelectorAll(`[${HC_ANIM_HIDDEN_ATTR}]`).forEach((node) => {
        clearAnimHide(node as HTMLElement);
      });
      root.querySelectorAll(`[${HC_AUTHOR_OPACITY_ATTR}]`).forEach((node) => {
        (node as HTMLElement).removeAttribute(HC_AUTHOR_OPACITY_ATTR);
      });
      authorPaint.clear();
    },
  };
}
