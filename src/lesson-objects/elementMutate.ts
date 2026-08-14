import { ensureObjectId, stampObjectIds } from './selection';

/** Swap with previous/next sibling. Returns true if moved. */
export function moveElementSibling(el: HTMLElement, dir: 'up' | 'down'): boolean {
  const parent = el.parentElement;
  if (!parent) return false;
  if (dir === 'up') {
    const prev = el.previousElementSibling;
    if (!(prev instanceof HTMLElement)) return false;
    parent.insertBefore(el, prev);
    return true;
  }
  const next = el.nextElementSibling;
  if (!(next instanceof HTMLElement)) return false;
  parent.insertBefore(next, el);
  return true;
}

/** Clone after the source; regenerates data-hc-obj ids on the clone tree. */
export function duplicateElement(el: HTMLElement): HTMLElement {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.removeAttribute('data-hc-obj');
  clone.querySelectorAll('[data-hc-obj]').forEach((n) => n.removeAttribute('data-hc-obj'));
  el.insertAdjacentElement('afterend', clone);
  ensureObjectId(clone);
  stampObjectIds(clone);
  return clone;
}

export function deleteElement(el: HTMLElement): void {
  el.remove();
}

/** Relocate an existing node before/after a drop target (not onto self/descendants). */
export function relocateElement(
  el: HTMLElement,
  dropTarget: HTMLElement,
  position: 'before' | 'after',
): boolean {
  if (el === dropTarget) return false;
  if (el.contains(dropTarget)) return false;

  dropTarget.insertAdjacentElement(position === 'before' ? 'beforebegin' : 'afterend', el);
  return true;
}

export function canMoveUp(el: HTMLElement): boolean {
  return el.previousElementSibling instanceof HTMLElement;
}

export function canMoveDown(el: HTMLElement): boolean {
  return el.nextElementSibling instanceof HTMLElement;
}
