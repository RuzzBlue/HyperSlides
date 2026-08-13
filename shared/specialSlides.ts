import type {
  AuthorContactPrefs,
  CourseExtras,
  CourseManifest,
  EndSlidePrefs,
  EndSlideStyle,
  IndexSlidePrefs,
  IndexSlideStyle,
  IntroSlideOrder,
  OutroSlideOrder,
  SequenceItem,
  SpecialSlideKind,
  SummarySlidePrefs,
  SummarySlideStyle,
  TitleSlidePrefs,
  TitleSlideStyle,
  ProgressState,
} from './types.ts';
import { computeProgressKpis } from './progressSummary.ts';

export const SPECIAL_SLIDE_KEYS: Record<SpecialSlideKind, string> = {
  title: 'extras:title',
  index: 'extras:index',
  summary: 'extras:summary',
  end: 'extras:end',
};

export const SPECIAL_SLIDE_FILES: Record<SpecialSlideKind, string> = {
  title: 'extras/title.html',
  index: 'extras/index.html',
  summary: 'extras/summary.html',
  end: 'extras/end.html',
};

export const SPECIAL_SLIDE_TITLES: Record<SpecialSlideKind, string> = {
  title: 'Title',
  index: 'Index',
  summary: 'Summary',
  end: 'End',
};

export function isSpecialSlideType(type: string): type is SpecialSlideKind {
  return type === 'title' || type === 'index' || type === 'summary' || type === 'end';
}

export function isContentSlideType(type: string): boolean {
  return type === 'lesson' || type === 'quiz' || type === 'lab';
}

export function isSpecialSequenceItem(item: SequenceItem | null | undefined): boolean {
  return Boolean(item?.meta) || (item != null && isSpecialSlideType(item.type));
}

export function contentSequence(sequence: SequenceItem[]): SequenceItem[] {
  return sequence.filter((s) => isContentSlideType(s.type));
}

/** 1-based content page number, or 0 when current item is a special/meta slide. */
export function contentPageNumber(sequence: SequenceItem[], index: number): number {
  const cur = sequence[index];
  if (!cur || !isContentSlideType(cur.type)) return 0;
  let n = 0;
  for (let i = 0; i <= index; i++) {
    if (isContentSlideType(sequence[i]!.type)) n += 1;
  }
  return n;
}

export function contentPageTotal(sequence: SequenceItem[]): number {
  return contentSequence(sequence).length;
}

function asTitleStyle(v: unknown): TitleSlideStyle {
  return v === 'split' || v === 'minimal' || v === 'banner' ? v : 'hero';
}
function asIndexStyle(v: unknown): IndexSlideStyle {
  if (v === 'by-module' || v === 'split' || v === 'toc' || v === 'cards') return v;
  if (v === 'default' || v === 'compact') return 'flat';
  return 'flat';
}
function asSummaryStyle(v: unknown): SummarySlideStyle {
  return v === 'accordion' || v === 'stack' ? v : 'columns';
}
function asEndStyle(v: unknown): EndSlideStyle {
  if (v === 'stats' || v === 'contact' || v === 'celebration') return v;
  if (v === 'default' || v === 'minimal') return 'mirror-title';
  if (v === 'summary') return 'stats';
  return 'mirror-title';
}

export function defaultTitleSlidePrefs(): TitleSlidePrefs {
  return { enabled: false, style: 'hero' };
}
export function defaultIndexSlidePrefs(): IndexSlidePrefs {
  return { enabled: false, style: 'toc', showPageNumbers: true, hyperlink: true };
}
export function defaultSummarySlidePrefs(): SummarySlidePrefs {
  return { enabled: false, style: 'columns' };
}
export function defaultEndSlidePrefs(): EndSlidePrefs {
  return {
    enabled: false,
    style: 'celebration',
    showProgress: true,
    showQuizScore: true,
    showLabProgress: true,
  };
}

/** Normalize extras (slide shell + special slides). Keeps slideContainer merge in slideContainer.ts */
export function normalizeSpecialSlideExtras(
  raw: CourseExtras | undefined | null,
): Pick<
  CourseExtras,
  | 'titleSlide'
  | 'indexSlide'
  | 'summarySlide'
  | 'endSlide'
  | 'introOrder'
  | 'outroOrder'
  | 'authorContact'
> {
  const legacyPlacement = raw?.indexSlide?.placement;
  const introOrder: IntroSlideOrder =
    raw?.introOrder === 'index-first'
      ? 'index-first'
      : legacyPlacement === 'first' && !raw?.titleSlide?.enabled
        ? 'title-first'
        : raw?.introOrder === 'title-first'
          ? 'title-first'
          : 'title-first';

  const outroOrder: OutroSlideOrder =
    raw?.outroOrder === 'end-first' ? 'end-first' : 'summary-first';

  const contact = raw?.authorContact ?? {};
  const endRaw = raw?.endSlide;
  const summaryRaw = raw?.summarySlide;
  // Migrate old end style "summary" → enable summary slide too
  const summaryEnabled =
    Boolean(summaryRaw?.enabled) ||
    (Boolean(endRaw?.enabled) && (endRaw as { style?: string })?.style === 'summary');

  return {
    titleSlide: {
      enabled: Boolean(raw?.titleSlide?.enabled),
      style: asTitleStyle(raw?.titleSlide?.style),
    },
    indexSlide: {
      enabled: Boolean(raw?.indexSlide?.enabled),
      style: asIndexStyle(raw?.indexSlide?.style),
      showPageNumbers: raw?.indexSlide?.showPageNumbers !== false,
      hyperlink: raw?.indexSlide?.hyperlink !== false,
    },
    summarySlide: {
      enabled: summaryEnabled,
      style: asSummaryStyle(summaryRaw?.style),
    },
    endSlide: {
      enabled: Boolean(endRaw?.enabled),
      style: asEndStyle(endRaw?.style),
      showProgress: endRaw?.showProgress !== false,
      showQuizScore: endRaw?.showQuizScore !== false,
      showLabProgress: endRaw?.showLabProgress !== false,
    },
    introOrder,
    outroOrder,
    authorContact: {
      fullName: typeof contact.fullName === 'string' ? contact.fullName : '',
      email: typeof contact.email === 'string' ? contact.email : '',
      phone: typeof contact.phone === 'string' ? contact.phone : '',
      url: typeof contact.url === 'string' ? contact.url : '',
    },
  };
}

function specialItem(kind: SpecialSlideKind, index: number): SequenceItem {
  return {
    key: SPECIAL_SLIDE_KEYS[kind],
    type: kind,
    title: SPECIAL_SLIDE_TITLES[kind],
    moduleId: kind === 'title' || kind === 'index' ? '__intro__' : '__outro__',
    moduleTitle: kind === 'title' || kind === 'index' ? 'Intro' : 'Outro',
    file: SPECIAL_SLIDE_FILES[kind],
    index,
    meta: true,
  };
}

/** Prepend/append enabled special slides around a content-only sequence. */
export function attachSpecialSlides(
  contentSeq: SequenceItem[],
  extras: CourseExtras | undefined | null,
): SequenceItem[] {
  const e = normalizeSpecialSlideExtras(extras);
  const intro: SpecialSlideKind[] = [];
  if (e.titleSlide?.enabled) intro.push('title');
  if (e.indexSlide?.enabled) intro.push('index');
  if (e.introOrder === 'index-first') intro.reverse();

  const outro: SpecialSlideKind[] = [];
  if (e.summarySlide?.enabled) outro.push('summary');
  if (e.endSlide?.enabled) outro.push('end');
  if (e.outroOrder === 'end-first') outro.reverse();

  const out: SequenceItem[] = [];
  let i = 0;
  for (const kind of intro) out.push(specialItem(kind, i++));
  for (const item of contentSeq) out.push({ ...item, index: i++ });
  for (const kind of outro) out.push(specialItem(kind, i++));
  return out;
}

export function defaultTemplateHtml(kind: SpecialSlideKind, style: string): string {
  switch (kind) {
    case 'title':
      return titleTemplate(asTitleStyle(style));
    case 'index':
      return indexTemplate(asIndexStyle(style));
    case 'summary':
      return summaryTemplate(asSummaryStyle(style));
    case 'end':
      return endTemplate(asEndStyle(style));
  }
}

function titleTemplate(style: TitleSlideStyle): string {
  return `<div class="hc-fullpage hc-fullpage--title hc-title--${style}" data-hc-fullpage="title" data-hc-variant="${style}">
  <div class="hc-fullpage__inner">
    <p class="hc-fullpage__eyebrow">{{course.subtitle}}</p>
    <h1 class="hc-fullpage__title">{{course.title}}</h1>
    <p class="hc-fullpage__author">{{course.author}}</p>
    <div class="hc-fullpage__meta">
      <span>{{counts.slides}} slides</span>
      <span>{{counts.quizzes}} quizzes</span>
      <span>{{counts.labs}} labs</span>
    </div>
  </div>
</div>
`;
}

function indexTemplate(style: IndexSlideStyle): string {
  return `<div class="hc-fullpage hc-fullpage--index hc-index--${style}" data-hc-fullpage="index" data-hc-variant="${style}">
  <div class="hc-fullpage__inner">
    <p class="hc-fullpage__eyebrow">Course index</p>
    <h1 class="hc-fullpage__title">{{course.title}}</h1>
    <div data-hc-slot="index"></div>
  </div>
</div>
`;
}

function summaryTemplate(style: SummarySlideStyle): string {
  return `<div class="hc-fullpage hc-fullpage--summary hc-summary--${style}" data-hc-fullpage="summary" data-hc-variant="${style}">
  <div class="hc-fullpage__inner">
    <p class="hc-fullpage__eyebrow">Summary</p>
    <h1 class="hc-fullpage__title">What we covered</h1>
    <div data-hc-slot="summary"></div>
  </div>
</div>
`;
}

function endTemplate(style: EndSlideStyle): string {
  return `<div class="hc-fullpage hc-fullpage--end hc-end--${style}" data-hc-fullpage="end" data-hc-variant="${style}">
  <div class="hc-fullpage__inner">
    <p class="hc-fullpage__eyebrow">The end</p>
    <h1 class="hc-fullpage__title">{{course.title}}</h1>
    <p class="hc-fullpage__author">{{author.fullName}}</p>
    <div class="hc-fullpage__stats" data-hc-slot="end-stats"></div>
    <div class="hc-fullpage__contact">
      <p>{{author.email}}</p>
      <p>{{author.phone}}</p>
      <p>{{author.url}}</p>
    </div>
  </div>
</div>
`;
}

export type SpecialSlideTagContext = {
  manifest: CourseManifest;
  contentSequence: SequenceItem[];
  extras: CourseExtras;
  progress?: ProgressState | null;
  /** Display name fallback when authorContact.fullName empty */
  authorDisplay?: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tagMap(ctx: SpecialSlideTagContext): Record<string, string> {
  const content = ctx.contentSequence;
  const lessons = content.filter((s) => s.type === 'lesson').length;
  const quizzes = content.filter((s) => s.type === 'quiz').length;
  const labs = content.filter((s) => s.type === 'lab').length;
  const slides = content.length;
  const contact: AuthorContactPrefs = ctx.extras.authorContact ?? {};
  const kpis = computeProgressKpis(content, ctx.progress ?? null);
  const authorDisplay =
    (contact.fullName || '').trim() ||
    (ctx.authorDisplay || '').trim() ||
    (ctx.manifest.author || '').trim();

  return {
    'course.title': ctx.manifest.title || '',
    'course.subtitle': ctx.manifest.subtitle || '',
    'course.author': ctx.manifest.author || '',
    'course.description': ctx.manifest.description || '',
    'course.version': ctx.manifest.version || '',
    'counts.slides': String(slides),
    'counts.lessons': String(lessons),
    'counts.quizzes': String(quizzes),
    'counts.labs': String(labs),
    'counts.modules': String(ctx.manifest.modules.length),
    'author.fullName': authorDisplay,
    'author.email': (contact.email || '').trim(),
    'author.phone': (contact.phone || '').trim(),
    'author.url': (contact.url || '').trim(),
    'progress.percent': String(kpis.overallPercent),
    'progress.lessonsDone': String(kpis.lessonsDone),
    'progress.lessonsTotal': String(kpis.lessonsTotal),
    'quiz.avgScore': kpis.quizAvgPercent == null ? '—' : `${kpis.quizAvgPercent}%`,
    'quiz.passed': String(kpis.quizzesPassed),
    'quiz.total': String(kpis.quizzesTotal),
    'lab.submitted': String(kpis.labsDone),
    'lab.total': String(kpis.labsTotal),
  };
}

/** Replace {{tag}} placeholders (HTML-escaped). */
export function applySpecialSlideTags(html: string, ctx: SpecialSlideTagContext): string {
  const map = tagMap(ctx);
  return html.replace(/\{\{\s*([a-z0-9_.]+)\s*\}\}/gi, (_, key: string) => {
    const k = key.toLowerCase();
    if (k in map) return esc(map[k]!);
    return '';
  });
}

function pageNumForKey(content: SequenceItem[], key: string): number {
  const idx = content.findIndex((s) => s.key === key);
  if (idx < 0) return 0;
  return idx + 1;
}

export function renderIndexSlotHtml(
  content: SequenceItem[],
  prefs: IndexSlidePrefs,
): string {
  const style = asIndexStyle(prefs.style);
  const link = prefs.hyperlink !== false;
  const pages = prefs.showPageNumbers !== false;
  const wrap = (key: string, inner: string, cls: string) => {
    if (link) {
      return `<a class="${cls}" href="#${esc(key)}" data-hc-goto="${esc(key)}">${inner}</a>`;
    }
    return `<div class="${cls}">${inner}</div>`;
  };
  const page = (key: string) =>
    pages ? `<span class="hc-index__page">${pageNumForKey(content, key)}</span>` : '';

  if (style === 'cards') {
    const byMod = new Map<string, SequenceItem[]>();
    for (const item of content) {
      const list = byMod.get(item.moduleId) ?? [];
      list.push(item);
      byMod.set(item.moduleId, list);
    }
    const cards = [...byMod.entries()]
      .map(([, items]) => {
        const title = items[0]?.moduleTitle ?? 'Module';
        const links = items
          .map((it) =>
            wrap(
              it.key,
              `<span class="hc-index__label">${esc(it.title)}</span>${page(it.key)}`,
              'hc-index__row',
            ),
          )
          .join('');
        return `<section class="hc-index__card"><h3>${esc(title)}</h3><div class="hc-index__card-list">${links}</div></section>`;
      })
      .join('');
    return `<div class="hc-index hc-index--cards">${cards}</div>`;
  }

  if (style === 'split') {
    const lessons = content.filter((s) => s.type === 'lesson');
    const activities = content.filter((s) => s.type === 'quiz' || s.type === 'lab');
    const col = (heading: string, items: SequenceItem[]) => {
      const rows = items
        .map((it) =>
          wrap(
            it.key,
            `<span class="hc-index__label">${esc(it.title)}</span><span class="hc-index__type">${esc(it.type)}</span>${page(it.key)}`,
            'hc-index__row',
          ),
        )
        .join('');
      return `<div class="hc-index__col"><h3>${esc(heading)}</h3>${rows}</div>`;
    };
    return `<div class="hc-index hc-index--split">${col('Lessons', lessons)}${col('Activities', activities)}</div>`;
  }

  if (style === 'by-module') {
    let html = '<div class="hc-index hc-index--by-module">';
    let lastMod = '';
    let lastUnit = '';
    for (const it of content) {
      if (it.moduleId !== lastMod) {
        lastMod = it.moduleId;
        lastUnit = '';
        html += `<h2 class="hc-index__mod">${esc(it.moduleTitle)}</h2>`;
      }
      if (it.unitId && it.unitId !== lastUnit) {
        lastUnit = it.unitId;
        html += `<h3 class="hc-index__unit">${esc(it.unitTitle || it.unitId)}</h3>`;
      }
      html += wrap(
        it.key,
        `<span class="hc-index__label">${esc(it.title)}</span>${page(it.key)}`,
        'hc-index__row hc-index__row--item',
      );
    }
    html += '</div>';
    return html;
  }

  // flat + toc (toc adds leader dots via CSS)
  const cls = style === 'toc' ? 'hc-index hc-index--toc' : 'hc-index hc-index--flat';
  const rows = content
    .map((it) => {
      const leader =
        style === 'toc' ? '<span class="hc-index__leader" aria-hidden="true"></span>' : '';
      return wrap(
        it.key,
        `<span class="hc-index__label">${esc(it.title)}</span>${leader}${page(it.key)}`,
        'hc-index__row',
      );
    })
    .join('');
  return `<div class="${cls}">${rows}</div>`;
}

export function renderSummarySlotHtml(manifest: CourseManifest, style: SummarySlideStyle): string {
  const s = asSummaryStyle(style);
  const blocks = manifest.modules
    .map((mod) => {
      const units = mod.units
        .map((u) => {
          const body = (u.description || '').trim();
          return `<div class="hc-summary__unit">
  <h4>${esc(u.title)}</h4>
  ${body ? `<p>${esc(body)}</p>` : '<p class="hc-summary__empty">Add a unit description in course.json to show a blurb here.</p>'}
</div>`;
        })
        .join('');
      const modBody = (mod.description || '').trim();
      return `<section class="hc-summary__module">
  <h3>${esc(mod.title)}</h3>
  ${modBody ? `<p class="hc-summary__mod-desc">${esc(modBody)}</p>` : ''}
  <div class="hc-summary__units">${units}</div>
</section>`;
    })
    .join('');
  return `<div class="hc-summary hc-summary--${s}">${blocks}</div>`;
}

export function renderEndStatsHtml(prefs: EndSlidePrefs, ctx: SpecialSlideTagContext): string {
  const kpis = computeProgressKpis(ctx.contentSequence, ctx.progress ?? null);
  const parts: string[] = [];
  if (prefs.showProgress !== false) {
    parts.push(
      `<div class="hc-end-stat"><span class="hc-end-stat__value">${kpis.overallPercent}%</span><span class="hc-end-stat__label">Progress</span></div>`,
    );
  }
  parts.push(
    `<div class="hc-end-stat"><span class="hc-end-stat__value">${ctx.contentSequence.length}</span><span class="hc-end-stat__label">Slides</span></div>`,
  );
  if (prefs.showQuizScore !== false) {
    parts.push(
      `<div class="hc-end-stat"><span class="hc-end-stat__value">${kpis.quizAvgPercent == null ? '—' : `${kpis.quizAvgPercent}%`}</span><span class="hc-end-stat__label">Quiz avg</span></div>`,
    );
  }
  if (prefs.showLabProgress !== false) {
    parts.push(
      `<div class="hc-end-stat"><span class="hc-end-stat__value">${kpis.labsDone}/${kpis.labsTotal}</span><span class="hc-end-stat__label">Labs submitted</span></div>`,
    );
  }
  return `<div class="hc-end-stats">${parts.join('')}</div>`;
}

/**
 * Hydrate raw extras HTML: tags + dynamic slots (index / summary / end-stats).
 * Does not wrap in article — caller mounts into full-page stage.
 */
export function hydrateSpecialSlideHtml(
  kind: SpecialSlideKind,
  rawHtml: string,
  ctx: SpecialSlideTagContext,
): string {
  const extras = normalizeSpecialSlideExtras(ctx.extras);
  let html = applySpecialSlideTags(rawHtml, { ...ctx, extras: { ...ctx.extras, ...extras } });

  const indexHtml = renderIndexSlotHtml(ctx.contentSequence, extras.indexSlide!);
  const summaryHtml = renderSummarySlotHtml(ctx.manifest, extras.summarySlide!.style);
  const endStats = renderEndStatsHtml(extras.endSlide!, ctx);

  html = html.replace(/<div\s+data-hc-slot="index"\s*>\s*<\/div>/i, indexHtml);
  html = html.replace(/\{\{\s*index\s*\}\}/gi, indexHtml);
  html = html.replace(/<div\s+data-hc-slot="summary"\s*>\s*<\/div>/i, summaryHtml);
  html = html.replace(/\{\{\s*summary\s*\}\}/gi, summaryHtml);
  html = html.replace(/<div\s+[^>]*data-hc-slot="end-stats"[^>]*>\s*<\/div>/i, endStats);
  html = html.replace(/\{\{\s*end\.stats\s*\}\}/gi, endStats);

  // Apply variant from prefs onto root
  const variant =
    kind === 'title'
      ? extras.titleSlide!.style
      : kind === 'index'
        ? extras.indexSlide!.style
        : kind === 'summary'
          ? extras.summarySlide!.style
          : extras.endSlide!.style;
  if (/data-hc-variant="/i.test(html)) {
    html = html.replace(/data-hc-variant="[^"]*"/i, `data-hc-variant="${variant}"`);
  }
  const prefix =
    kind === 'title'
      ? 'hc-title--'
      : kind === 'index'
        ? 'hc-index--'
        : kind === 'summary'
          ? 'hc-summary--'
          : 'hc-end--';
  html = html.replace(new RegExp(`${prefix}[a-z0-9-]+`, 'gi'), `${prefix}${variant}`);

  return html;
}

export function kindFromSlideKey(slideKey: string): SpecialSlideKind | null {
  for (const kind of Object.keys(SPECIAL_SLIDE_KEYS) as SpecialSlideKind[]) {
    if (SPECIAL_SLIDE_KEYS[kind] === slideKey) return kind;
  }
  return null;
}
