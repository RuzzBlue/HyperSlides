import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ExternalLink,
  AppWindow,
} from 'lucide-react';
import type { SequenceItem } from '@shared/types';
import { apiFetch } from '../../api/client';
import { usePrefs } from '../../prefs/PrefsProvider';
import { useLessonObjectModeOptional } from '../../lesson-objects/LessonObjectMode';
import type { StringKey } from '../../i18n/strings';
import { setObjectLabel } from '../../lesson-objects/selection';

export type LinkKind = 'button' | 'text';
/** Top-level button family in the Style dropdown. */
export type BtnFamily = 'solid' | 'outline' | 'ghost' | 'custom';
export type BtnTone =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';
export type LinkDest = 'url' | 'course';
export type LinkOpen = 'external' | 'inapp';
export type LinkAlign = 'left' | 'center' | 'right';
export type AnchorMode = 'obj' | 'id' | 'custom-id' | 'custom-class';

export type LinkDraft = {
  kind: LinkKind;
  family: BtnFamily;
  tone: BtnTone;
  label: string;
  dest: LinkDest;
  href: string;
  open: LinkOpen;
  gotoKey: string;
  anchorMode: AnchorMode;
  anchorValue: string;
  align: LinkAlign;
};

const TONE_OPTIONS: BtnTone[] = [
  'default',
  'primary',
  'secondary',
  'info',
  'success',
  'warning',
  'danger',
];

const ALL_BTN_CLASSES = [
  'hc-btn',
  'hc-btn--primary',
  'hc-btn--secondary',
  'hc-btn--info',
  'hc-btn--success',
  'hc-btn--warning',
  'hc-btn--danger',
  'hc-btn--ghost',
  'hc-btn--outline',
  'hc-btn--outline-primary',
  'hc-btn--outline-secondary',
  'hc-btn--outline-info',
  'hc-btn--outline-success',
  'hc-btn--outline-warning',
  'hc-btn--outline-danger',
  'hc-link',
];

function familyClasses(family: BtnFamily, tone: BtnTone): string[] {
  if (family === 'ghost') return ['hc-btn', 'hc-btn--ghost'];
  if (family === 'custom') return ['hc-btn'];
  if (family === 'outline') {
    if (tone === 'default') return ['hc-btn', 'hc-btn--outline'];
    return ['hc-btn', `hc-btn--outline-${tone}`];
  }
  // solid
  if (tone === 'default') return ['hc-btn'];
  return ['hc-btn', `hc-btn--${tone}`];
}

/** Prefer the interactive control when a wrapper paragraph/div is selected. */
export function resolveLinkElement(el: HTMLElement | null): HTMLElement | null {
  if (!el || !el.isConnected) return null;
  if (
    el.matches(
      'a, button, .hc-btn, .hc-link, [data-hc-button], [role="button"], [role="link"]',
    )
  ) {
    return el;
  }
  const inner = el.querySelector(
    'a, button, .hc-btn, .hc-link, [data-hc-button], [role="button"]',
  ) as HTMLElement | null;
  return inner;
}

function alignHost(el: HTMLElement): HTMLElement {
  const p = el.parentElement;
  if (
    p &&
    (p.tagName === 'P' ||
      p.tagName === 'DIV' ||
      p.classList.contains('hc-hero__actions') ||
      p.classList.contains('flex')) &&
    [...p.children].filter((c) => c instanceof HTMLElement).length === 1
  ) {
    return p;
  }
  return el;
}

function readAlign(el: HTMLElement): LinkAlign {
  const stored = el.getAttribute('data-hc-align') as LinkAlign | null;
  if (stored === 'left' || stored === 'center' || stored === 'right') return stored;
  const host = alignHost(el);
  const raw = (host.style.textAlign || '').toLowerCase();
  if (raw === 'center') return 'center';
  if (raw === 'right' || raw === 'end') return 'right';
  if (raw === 'left' || raw === 'start') return 'left';
  const jc = (host.style.justifyContent || '').toLowerCase();
  if (jc === 'center') return 'center';
  if (jc === 'flex-end' || jc === 'end' || jc === 'right') return 'right';
  if (jc === 'flex-start' || jc === 'start' || jc === 'left') return 'left';
  const ml = el.style.marginLeft;
  const mr = el.style.marginRight;
  if (ml === 'auto' && mr === 'auto') return 'center';
  if (ml === 'auto' && (mr === '0px' || mr === '0')) return 'right';
  if ((ml === '0px' || ml === '0') && mr === 'auto') return 'left';
  return 'left';
}

function applyAlign(el: HTMLElement, align: LinkAlign) {
  el.setAttribute('data-hc-align', align);
  const host = alignHost(el);
  const hostCs = getComputedStyle(host);
  const hostIsFlex = hostCs.display.includes('flex');
  const hostIsColumn = hostIsFlex && hostCs.flexDirection.includes('column');

  // Strip Tailwind centering utilities that fight inline alignment.
  for (const node of [el, host]) {
    node.classList.remove(
      'text-center',
      'text-left',
      'text-right',
      'mx-auto',
      'justify-center',
      'justify-start',
      'justify-end',
      'items-center',
      'self-center',
    );
  }

  if (hostIsFlex) {
    if (hostIsColumn) {
      host.style.alignItems =
        align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
      host.style.justifyContent = '';
    } else {
      host.style.justifyContent =
        align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
      host.style.alignItems = '';
    }
    host.style.textAlign = align;
  } else {
    host.style.textAlign = align;
    host.style.justifyContent = '';
    host.style.alignItems = '';
  }

  // Margin auto must be explicit for flex/grid children — clearing lets
  // parent justify-content:center (e.g. .hc-hero__actions) win again.
  el.style.width = 'fit-content';
  el.style.maxWidth = '100%';
  if (el.classList.contains('hc-btn') || el.classList.contains('hc-link')) {
    el.style.display = el.classList.contains('hc-btn') ? 'inline-flex' : 'inline';
  }
  if (align === 'center') {
    el.style.marginLeft = 'auto';
    el.style.marginRight = 'auto';
    el.style.alignSelf = 'center';
  } else if (align === 'right') {
    el.style.marginLeft = 'auto';
    el.style.marginRight = '0';
    el.style.alignSelf = 'flex-end';
  } else {
    el.style.marginLeft = '0';
    el.style.marginRight = 'auto';
    el.style.alignSelf = 'flex-start';
  }
}

function detectFamilyTone(el: HTMLElement): { family: BtnFamily; tone: BtnTone } {
  const storedFamily = el.getAttribute('data-hc-btn-family') as BtnFamily | null;
  const storedTone = el.getAttribute('data-hc-btn-tone') as BtnTone | null;
  if (storedFamily === 'custom') return { family: 'custom', tone: storedTone || 'primary' };
  if (el.classList.contains('hc-btn--ghost') || storedFamily === 'ghost') {
    return { family: 'ghost', tone: 'default' };
  }
  for (const tone of TONE_OPTIONS) {
    if (tone === 'default') continue;
    if (el.classList.contains(`hc-btn--outline-${tone}`)) {
      return { family: 'outline', tone };
    }
  }
  if (el.classList.contains('hc-btn--outline') || storedFamily === 'outline') {
    return { family: 'outline', tone: storedTone || 'default' };
  }
  for (const tone of TONE_OPTIONS) {
    if (tone === 'default') continue;
    if (el.classList.contains(`hc-btn--${tone}`)) {
      return { family: 'solid', tone };
    }
  }
  // Legacy data-hc-btn-preset
  const legacy = el.getAttribute('data-hc-btn-preset');
  if (legacy === 'custom') return { family: 'custom', tone: 'primary' };
  if (legacy === 'ghost') return { family: 'ghost', tone: 'default' };
  if (legacy === 'outline') return { family: 'outline', tone: 'default' };
  if (legacy === 'primary') return { family: 'solid', tone: 'primary' };
  if (el.classList.contains('hc-btn')) return { family: 'solid', tone: 'default' };
  return { family: 'custom', tone: 'primary' };
}

function readDraft(el: HTMLElement): LinkDraft {
  const isButton =
    el.classList.contains('hc-btn') ||
    el.tagName === 'BUTTON' ||
    el.getAttribute('data-hc-link-kind') === 'button';
  const goto = el.getAttribute('data-hc-goto')?.trim() || '';
  const dest: LinkDest = goto ? 'course' : 'url';
  const openAttr = el.getAttribute('data-hc-open');
  const open: LinkOpen = openAttr === 'inapp' ? 'inapp' : 'external';
  const { family, tone } = detectFamilyTone(el);

  return {
    kind: isButton ? 'button' : 'text',
    family: isButton ? family : 'solid',
    tone: isButton ? tone : 'default',
    label: (el.textContent || '').replace(/\s+/g, ' ').trim(),
    dest,
    href: dest === 'url' ? el.getAttribute('href') || '' : '',
    open,
    gotoKey: goto,
    anchorMode: (el.getAttribute('data-hc-anchor-mode') as AnchorMode) || 'obj',
    anchorValue: el.getAttribute('data-hc-anchor')?.trim() || '',
    align: readAlign(el),
  };
}

function stripLinkClasses(el: HTMLElement) {
  for (const c of ALL_BTN_CLASSES) el.classList.remove(c);
}

function applyDraft(el: HTMLElement, d: LinkDraft) {
  el.setAttribute('data-hc-link-kind', d.kind);
  stripLinkClasses(el);

  if (d.kind === 'text') {
    el.classList.add('hc-link');
    el.removeAttribute('data-hc-btn-family');
    el.removeAttribute('data-hc-btn-tone');
    el.removeAttribute('data-hc-btn-preset');
    el.setAttribute('data-hc-style-lock', '0');
  } else {
    el.setAttribute('data-hc-btn-family', d.family);
    el.setAttribute('data-hc-btn-tone', d.tone);
    for (const c of familyClasses(d.family, d.tone)) el.classList.add(c);
    el.setAttribute('data-hc-style-lock', d.family === 'custom' ? '0' : '1');
    // Keep legacy attr in sync for older readers
    if (d.family === 'custom') el.setAttribute('data-hc-btn-preset', 'custom');
    else if (d.family === 'ghost') el.setAttribute('data-hc-btn-preset', 'ghost');
    else if (d.family === 'outline') el.setAttribute('data-hc-btn-preset', 'outline');
    else el.setAttribute('data-hc-btn-preset', d.tone === 'default' ? 'default' : d.tone);
  }

  const text = d.label;
  if ((el.textContent || '').replace(/\s+/g, ' ').trim() !== text) {
    el.textContent = text;
  }
  setObjectLabel(el, text || (d.kind === 'button' ? 'Button' : 'Link'));

  if (d.dest === 'course' && d.gotoKey) {
    el.setAttribute('data-hc-goto', d.gotoKey);
    el.setAttribute('href', `#${d.gotoKey}`);
    el.removeAttribute('target');
    el.removeAttribute('rel');
    el.setAttribute('data-hc-open', 'course');
    if (d.anchorValue) {
      el.setAttribute('data-hc-anchor', d.anchorValue);
      el.setAttribute('data-hc-anchor-mode', d.anchorMode);
    } else {
      el.removeAttribute('data-hc-anchor');
      el.removeAttribute('data-hc-anchor-mode');
    }
  } else {
    el.removeAttribute('data-hc-goto');
    el.removeAttribute('data-hc-anchor');
    el.removeAttribute('data-hc-anchor-mode');
    const href = d.href.trim() || '#';
    el.setAttribute('href', href);
    if (d.open === 'inapp') {
      el.setAttribute('data-hc-open', 'inapp');
      el.removeAttribute('target');
      el.removeAttribute('rel');
    } else {
      el.setAttribute('data-hc-open', 'external');
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }

  applyAlign(el, d.align);
}

function parseAnchorOptions(html: string): {
  objects: Array<{ id: string; label: string }>;
  ids: Array<{ id: string; label: string }>;
} {
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');
  if (!root) return { objects: [], ids: [] };
  const objects: Array<{ id: string; label: string }> = [];
  const ids: Array<{ id: string; label: string }> = [];
  const seenObj = new Set<string>();
  const seenId = new Set<string>();
  root.querySelectorAll<HTMLElement>('[data-hc-obj]').forEach((node) => {
    const id = node.getAttribute('data-hc-obj')?.trim();
    if (!id || seenObj.has(id)) return;
    seenObj.add(id);
    const label =
      node.getAttribute('data-hc-label')?.trim() ||
      (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48) ||
      id;
    objects.push({ id, label: `${label} (${id})` });
  });
  root.querySelectorAll<HTMLElement>('[id]').forEach((node) => {
    const id = node.getAttribute('id')?.trim();
    if (!id || seenId.has(id)) return;
    seenId.add(id);
    const label =
      node.getAttribute('data-hc-label')?.trim() ||
      (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48) ||
      id;
    ids.push({ id, label: `${label} (${id})` });
  });
  return { objects, ids };
}

const fieldClass =
  'w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';

function toneLabel(tone: BtnTone, tr: (k: StringKey) => string): string {
  switch (tone) {
    case 'default':
      return tr('linksToneDefault');
    case 'primary':
      return tr('linksTonePrimary');
    case 'secondary':
      return tr('linksToneSecondary');
    case 'info':
      return tr('linksToneInfo');
    case 'success':
      return tr('linksToneSuccess');
    case 'warning':
      return tr('linksToneWarning');
    case 'danger':
      return tr('linksToneDanger');
  }
}

export function LinksPanel({
  onDirtyChange,
  courseId,
  sequence,
  currentSlideKey,
}: {
  onDirtyChange?: (dirty: boolean) => void;
  courseId?: string;
  sequence?: SequenceItem[];
  currentSlideKey?: string;
}) {
  const { tr } = usePrefs();
  const objectMode = useLessonObjectModeOptional();
  const selected = objectMode?.selected ?? null;
  const linkEl = resolveLinkElement(selected?.element ?? null);
  const [draft, setDraft] = useState<LinkDraft | null>(null);
  const [anchors, setAnchors] = useState<{
    objects: Array<{ id: string; label: string }>;
    ids: Array<{ id: string; label: string }>;
  }>({ objects: [], ids: [] });
  const [anchorsLoading, setAnchorsLoading] = useState(false);

  useEffect(() => {
    if (!linkEl) {
      setDraft(null);
      return;
    }
    setDraft(readDraft(linkEl));
    // Do not clear inspector dirty here — Style/Effects edits must stay dirty until Save.
  }, [linkEl, selected?.objectId]);

  const courseItems = useMemo(
    () =>
      (sequence ?? []).filter(
        (s) => s.type === 'lesson' || s.type === 'quiz' || s.type === 'lab',
      ),
    [sequence],
  );

  const loadAnchors = useCallback(
    async (slideKey: string) => {
      if (!slideKey) {
        setAnchors({ objects: [], ids: [] });
        return;
      }
      const item = courseItems.find((s) => s.key === slideKey);
      if (!item || item.type !== 'lesson') {
        setAnchors({ objects: [], ids: [] });
        return;
      }
      if (slideKey === currentSlideKey && objectMode?.root) {
        setAnchors(parseAnchorOptions(objectMode.root.innerHTML));
        return;
      }
      if (!courseId) {
        setAnchors({ objects: [], ids: [] });
        return;
      }
      setAnchorsLoading(true);
      try {
        const res = await apiFetch<{ slideKey: string; file: string; html: string }>({
          method: 'GET',
          path: `/api/courses/${courseId}/lesson-source`,
          params: { slideKey },
        });
        if (res.ok && res.data?.html) setAnchors(parseAnchorOptions(res.data.html));
        else setAnchors({ objects: [], ids: [] });
      } finally {
        setAnchorsLoading(false);
      }
    },
    [courseId, courseItems, currentSlideKey, objectMode?.root],
  );

  useEffect(() => {
    if (!draft || draft.dest !== 'course' || !draft.gotoKey) {
      setAnchors({ objects: [], ids: [] });
      return;
    }
    void loadAnchors(draft.gotoKey);
  }, [draft?.dest, draft?.gotoKey, loadAnchors]);

  const apply = (next: LinkDraft) => {
    if (!linkEl || !linkEl.isConnected) return;
    applyDraft(linkEl, next);
    setDraft(next);
    onDirtyChange?.(true);
    objectMode?.root?.setAttribute('data-hc-live-dirty', '1');
  };

  const patch = (partial: Partial<LinkDraft>) => {
    if (!draft) return;
    let next = { ...draft, ...partial };
    if (partial.kind === 'text') {
      next = { ...next, family: 'solid', tone: 'default' };
    }
    if (partial.kind === 'button' && draft.kind === 'text') {
      next = { ...next, family: 'solid', tone: 'primary' };
    }
    if (partial.family === 'ghost') {
      next = { ...next, tone: 'default' };
    }
    if (partial.dest === 'course' && !next.gotoKey) {
      next = {
        ...next,
        gotoKey: currentSlideKey || courseItems[0]?.key || '',
        anchorValue: '',
      };
    }
    apply(next);
  };

  if (!linkEl || !draft) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--line)] px-3 py-4 text-center text-[12px] text-[var(--ink-muted)]">
        {tr('linksSelectHint')}
      </p>
    );
  }

  const selectedCourse = courseItems.find((s) => s.key === draft.gotoKey);
  const showAnchors = selectedCourse?.type === 'lesson';
  const showTone = draft.kind === 'button' && (draft.family === 'solid' || draft.family === 'outline');

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('linksStyleType')}
        </div>
        <select
          className={fieldClass}
          value={draft.kind}
          onChange={(e) => patch({ kind: e.target.value as LinkKind })}
        >
          <option value="button">{tr('linksKindButton')}</option>
          <option value="text">{tr('linksKindText')}</option>
        </select>
        {draft.kind === 'button' && (
          <>
            <select
              className={fieldClass}
              value={draft.family}
              onChange={(e) => patch({ family: e.target.value as BtnFamily })}
            >
              <option value="solid">{tr('linksFamilySolid')}</option>
              <option value="outline">{tr('linksFamilyOutline')}</option>
              <option value="ghost">{tr('linksFamilyGhost')}</option>
              <option value="custom">{tr('linksFamilyCustom')}</option>
            </select>
            {showTone && (
              <select
                className={fieldClass}
                value={draft.tone}
                onChange={(e) => patch({ tone: e.target.value as BtnTone })}
              >
                {TONE_OPTIONS.map((tone) => (
                  <option key={tone} value={tone}>
                    {toneLabel(tone, tr)}
                  </option>
                ))}
              </select>
            )}
            {draft.family === 'custom' && (
              <p className="text-[10px] leading-snug text-[var(--ink-muted)]">
                {tr('linksFamilyCustomHint')}
              </p>
            )}
          </>
        )}
      </section>

      <section className="space-y-3 pt-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('linksContent')}
        </div>
        <label className="block">
          <span className="mb-2 block text-[12px] font-semibold text-[var(--ink)]">
            {tr('linksLabel')}
          </span>
          <input
            className={`${fieldClass} border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] bg-[color-mix(in_srgb,var(--accent-soft)_55%,var(--stage))] py-2.5 text-[13px]`}
            value={draft.label}
            onChange={(e) => patch({ label: e.target.value })}
          />
        </label>
      </section>

      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('linksDestination')}
        </div>
        <div className="flex items-end justify-between gap-2">
          <label className="min-w-0 flex-1 block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
              {tr('linksDestType')}
            </span>
            <select
              className={fieldClass}
              value={draft.dest}
              onChange={(e) => patch({ dest: e.target.value as LinkDest })}
            >
              <option value="url">{tr('linksDestUrl')}</option>
              <option value="course">{tr('linksDestCourse')}</option>
            </select>
          </label>
          {draft.dest === 'url' && (
            <label className="w-[9.5rem] shrink-0 block">
              <span className="mb-1 block text-right text-[11px] font-medium text-[var(--ink)]">
                {tr('linksOpenMode')}
              </span>
              <select
                className={fieldClass}
                value={draft.open}
                onChange={(e) => patch({ open: e.target.value as LinkOpen })}
              >
                <option value="external">{tr('linksOpenExternal')}</option>
                <option value="inapp">{tr('linksOpenInApp')}</option>
              </select>
            </label>
          )}
        </div>

        {draft.dest === 'url' ? (
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-[var(--ink)]">
              {tr('linksUrl')}
              {draft.open === 'external' ? (
                <ExternalLink className="h-3 w-3 text-[var(--ink-muted)]" />
              ) : (
                <AppWindow className="h-3 w-3 text-[var(--ink-muted)]" />
              )}
            </span>
            <input
              className={fieldClass}
              value={draft.href}
              placeholder="https://"
              onChange={(e) => patch({ href: e.target.value })}
            />
          </label>
        ) : (
          <div className="space-y-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                {tr('linksCourseItem')}
              </span>
              <select
                className={fieldClass}
                value={draft.gotoKey}
                onChange={(e) => patch({ gotoKey: e.target.value, anchorValue: '' })}
              >
                <option value="">{tr('linksCourseItemPick')}</option>
                {courseItems.map((s, i) => (
                  <option key={s.key} value={s.key}>
                    {i + 1}.{' '}
                    {s.type === 'quiz' ? 'Quiz · ' : s.type === 'lab' ? 'Lab · ' : ''}
                    {s.title}
                    {s.key === currentSlideKey ? ` (${tr('linksThisSlide')})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                {tr('linksAnchorBy')}
              </span>
              <select
                className={fieldClass}
                value={draft.anchorMode}
                disabled={!showAnchors}
                onChange={(e) =>
                  patch({
                    anchorMode: e.target.value as AnchorMode,
                    anchorValue: '',
                  })
                }
              >
                <option value="obj">{tr('linksAnchorModeObj')}</option>
                <option value="id">{tr('linksAnchorModeId')}</option>
                <option value="custom-id">{tr('linksAnchorModeCustomId')}</option>
                <option value="custom-class">{tr('linksAnchorModeCustomClass')}</option>
              </select>
            </label>
            {draft.anchorMode === 'obj' || draft.anchorMode === 'id' ? (
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                  {tr('linksAnchor')}
                </span>
                <select
                  className={fieldClass}
                  value={draft.anchorValue}
                  disabled={!showAnchors || anchorsLoading}
                  onChange={(e) => patch({ anchorValue: e.target.value })}
                >
                  <option value="">1. {tr('linksAnchorPage')}</option>
                  {showAnchors &&
                    (draft.anchorMode === 'obj' ? anchors.objects : anchors.ids).map((a, i) => (
                      <option key={a.id} value={a.id}>
                        {i + 2}. {a.label}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-[var(--ink)]">
                  {draft.anchorMode === 'custom-class'
                    ? tr('linksAnchorCustomClass')
                    : tr('linksAnchorCustomId')}
                </span>
                <input
                  className={fieldClass}
                  value={draft.anchorValue}
                  placeholder={draft.anchorMode === 'custom-class' ? 'hero-banner' : 'intro'}
                  disabled={!showAnchors}
                  onChange={(e) => patch({ anchorValue: e.target.value.replace(/^\./, '') })}
                />
                <span className="mt-1.5 block text-[10px] leading-snug text-[var(--ink-muted)]">
                  {tr('linksAnchorCustomHint')}
                </span>
              </label>
            )}
            {!showAnchors && draft.gotoKey && (
              <span className="mt-1 block text-[10px] text-[var(--ink-muted)]">
                {tr('linksAnchorQuizLabHint')}
              </span>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {tr('linksAlign')}
        </div>
        <div className="flex gap-1">
          {(
            [
              ['left', AlignLeft],
              ['center', AlignCenter],
              ['right', AlignRight],
            ] as const
          ).map(([align, Icon]) => (
            <button
              key={align}
              type="button"
              title={align}
              onClick={() => patch({ align })}
              className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border ${
                draft.align === align
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--line)] text-[var(--ink-muted)] hover:bg-black/5'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
