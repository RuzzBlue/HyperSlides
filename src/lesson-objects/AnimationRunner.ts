import anime from 'animejs';
import { getEffectDef } from '@shared/animations/effects';
import type {
  AnimDirection,
  ChildScope,
  SlideAnimation,
} from '@shared/animations/types';
import { findByObjectId, HC_OBJ_ATTR } from './selection';

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
    // Prefer list items, else direct block children, else whole
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

function runPreset(
  targets: HTMLElement | HTMLElement[],
  effectId: string,
  durationSec: number,
  direction?: AnimDirection,
): Promise<void> {
  const def = getEffectDef(effectId);
  const preset = def?.preset ?? 'fadeIn';
  const duration = Math.max(100, Math.round(durationSec * 1000));
  const list = Array.isArray(targets) ? targets : [targets];
  list.forEach((t) => {
    t.style.visibility = 'visible';
    t.style.pointerEvents = '';
  });

  return new Promise((resolve) => {
    const done = () => resolve();
    const common = {
      targets: list,
      duration,
      easing: 'easeOutQuad' as const,
      complete: done,
    };

    switch (preset) {
      case 'fadeIn':
        anime({
          ...common,
          opacity: [0, 1],
        });
        break;
      case 'fadeOut':
        anime({
          ...common,
          opacity: [1, 0],
          complete: () => {
            list.forEach((t) => {
              t.style.visibility = 'hidden';
              t.style.opacity = '0';
            });
            done();
          },
        });
        break;
      case 'slideIn':
        anime({
          ...common,
          opacity: [0, 1],
          translateX: [dirOffset(direction, 'x'), 0],
          translateY: [dirOffset(direction, 'y'), 0],
        });
        break;
      case 'slideOut':
      case 'wipeOut':
        anime({
          ...common,
          opacity: [1, 0],
          translateX: [0, dirOffset(direction, 'x') || (direction === 'right' ? 60 : -60)],
          translateY: [0, dirOffset(direction, 'y')],
          complete: () => {
            list.forEach((t) => {
              t.style.visibility = 'hidden';
            });
            done();
          },
        });
        break;
      case 'zoomIn':
      case 'bounceIn':
        anime({
          ...common,
          opacity: [0, 1],
          scale: [preset === 'bounceIn' ? 0.6 : 0.85, 1],
          easing: preset === 'bounceIn' ? 'easeOutElastic(1, .6)' : 'easeOutQuad',
        });
        break;
      case 'zoomOut':
      case 'shrinkOut':
        anime({
          ...common,
          opacity: [1, 0],
          scale: [1, 0.7],
          complete: () => {
            list.forEach((t) => {
              t.style.visibility = 'hidden';
            });
            done();
          },
        });
        break;
      case 'blurIn':
        anime({
          ...common,
          opacity: [0, 1],
          filter: ['blur(8px)', 'blur(0px)'],
        });
        break;
      case 'blurOut':
        anime({
          ...common,
          opacity: [1, 0],
          filter: ['blur(0px)', 'blur(8px)'],
          complete: () => {
            list.forEach((t) => {
              t.style.visibility = 'hidden';
            });
            done();
          },
        });
        break;
      case 'flipIn':
        anime({
          ...common,
          opacity: [0, 1],
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
        anime({
          ...common,
          rotate: [-4, 4, -3, 3, 0],
        });
        break;
      case 'flash':
        anime({
          ...common,
          opacity: [1, 0.2, 1, 0.2, 1],
        });
        break;
      case 'spin':
        anime({
          ...common,
          rotate: [0, 360],
        });
        break;
      default:
        anime({ ...common, opacity: [0.5, 1] });
    }
  });
}

export async function playSlideAnimation(
  root: HTMLElement,
  anim: SlideAnimation,
): Promise<void> {
  const el = findByObjectId(root, anim.objectId);
  if (!el) return;
  const targets = resolveTargets(el, anim.params.childScope);
  await runPreset(targets, anim.effectId, anim.durationSec, anim.params.direction);
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

  const prepare = () => {
    // Reset transforms on all animated nodes
    const ids = new Set(sorted.map((i) => i.objectId));
    ids.forEach((id) => {
      const el = findByObjectId(root, id);
      if (!el) return;
      el.style.transform = '';
      el.style.filter = '';
      el.style.opacity = '';
      el.style.visibility = '';
    });
    // Hide elements that have an entrance until played
    sorted
      .filter((i) => i.kind === 'entrance')
      .forEach((i) => {
        const el = findByObjectId(root, i.objectId);
        if (el) {
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
        }
      });
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
    await Promise.all(group.map((g) => playSlideAnimation(root, g)));
    let next = i;
    while (next < sorted.length && sorted[next]!.start === 'after-previous') {
      // after-previous chain continues automatically
      const afterStart = next;
      const afterGroup: SlideAnimation[] = [sorted[afterStart]!];
      next = afterStart + 1;
      while (next < sorted.length && sorted[next]!.start === 'with-previous') {
        afterGroup.push(sorted[next]!);
        next += 1;
      }
      await Promise.all(afterGroup.map((g) => playSlideAnimation(root, g)));
    }
    return next;
  };

  const playAutostart = async () => {
    if (destroyed) return;
    // Play leading order-0 items and any with-previous attached, or first with-previous as 0
    if (!sorted.length) return;
    if (sorted[0]!.order === 0 || sorted[0]!.start === 'with-previous') {
      cursor = await playGroupFrom(0);
      // Continue after-previous chain already handled in playGroupFrom
      return;
    }
    cursor = 0;
  };

  const advance = async () => {
    if (destroyed) return false;
    if (cursor >= sorted.length) return false;
    // Skip if still in after-previous? cursor already past those
    const step = sorted[cursor]!;
    if (step.start === 'after-previous' || step.start === 'with-previous') {
      // Shouldn't happen if cursor managed correctly — play anyway
    }
    cursor = await playGroupFrom(cursor);
    return true;
  };

  return {
    prepare,
    playAutostart,
    advance,
    hasPending: () => cursor < sorted.length,
    destroy: () => {
      destroyed = true;
      anime.remove(root.querySelectorAll(`[${HC_OBJ_ATTR}]`));
      // Leave DOM fully visible when leaving present mode / tearing down.
      const ids = new Set(sorted.map((i) => i.objectId));
      ids.forEach((id) => {
        const el = findByObjectId(root, id);
        if (!el) return;
        el.style.transform = '';
        el.style.filter = '';
        el.style.opacity = '';
        el.style.visibility = '';
        el.style.pointerEvents = '';
      });
    },
  };
}
