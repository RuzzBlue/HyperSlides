/** Catalog of insertable lesson elements (Elementor-style Elements panel). */

import {
  createMediaIconHtml,
  createMediaImageHtml,
  createMediaVideoHtml,
} from './mediaHtml';

export type ElementCatalogCategoryId = 'single' | 'structure' | 'templates';

export type ElementCatalogItemId =
  | 'titles-texts'
  | 'links-buttons'
  | 'html-widgets'
  | 'media-icon'
  | 'media-image'
  | 'media-video'
  | 'graphs-tables'
  | 'section'
  | 'div'
  | 'columns'
  | 'spacer'
  | 'templates';

export type ElementDropRule = 'section-sibling' | 'inside-section' | 'inside-container' | 'anywhere';

export type ElementCatalogItem = {
  id: ElementCatalogItemId;
  category: ElementCatalogCategoryId;
  /** Opens this inspector when the card is activated / when editing that kind. */
  openTool?:
    | 'text'
    | 'links'
    | 'code'
    | 'shapesMedia'
    | 'media'
    | 'charts'
    | 'elements';
  /** Structure items open the element props view instead of another tool. */
  structureKind?: 'section' | 'div' | 'columns' | 'spacer';
  dropRule: ElementDropRule;
  /** HTML snippet factory (inserted into the lesson). */
  createHtml: () => string;
};

export const ELEMENT_CATALOG: ElementCatalogItem[] = [
  {
    id: 'titles-texts',
    category: 'single',
    openTool: 'text',
    dropRule: 'inside-container',
    createHtml: () =>
      `<div class="hc-block" data-hc-label="Text block"><h2>Heading</h2><p>Start writing…</p></div>`,
  },
  {
    id: 'links-buttons',
    category: 'single',
    openTool: 'links',
    dropRule: 'inside-container',
    createHtml: () =>
      `<p><a class="hc-btn hc-btn--primary" href="#" data-hc-label="Button" data-hc-link-kind="button" data-hc-btn-preset="primary" data-hc-style-lock="1" data-hc-open="external" target="_blank" rel="noopener noreferrer">Button</a></p>`,
  },
  {
    id: 'html-widgets',
    category: 'single',
    openTool: 'code',
    dropRule: 'inside-container',
    createHtml: () =>
      `<div class="hc-widget-slot" data-component="custom" data-hc-label="Widget"><!-- widget --></div>`,
  },
  {
    id: 'media-icon',
    category: 'single',
    openTool: 'media',
    dropRule: 'inside-container',
    createHtml: createMediaIconHtml,
  },
  {
    id: 'media-image',
    category: 'single',
    openTool: 'media',
    dropRule: 'inside-container',
    createHtml: createMediaImageHtml,
  },
  {
    id: 'media-video',
    category: 'single',
    openTool: 'media',
    dropRule: 'inside-container',
    createHtml: createMediaVideoHtml,
  },
  {
    id: 'graphs-tables',
    category: 'single',
    openTool: 'charts',
    dropRule: 'inside-container',
    createHtml: () =>
      `<div class="hc-table-wrap" data-hc-label="Table"><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>—</td><td>—</td></tr></tbody></table></div>`,
  },
  {
    id: 'section',
    category: 'structure',
    structureKind: 'section',
    dropRule: 'section-sibling',
    createHtml: () =>
      `<section class="hc-slide" data-hc-slide data-hc-label="Section"><div class="hc-slide__body"><p>New section</p></div></section>`,
  },
  {
    id: 'div',
    category: 'structure',
    structureKind: 'div',
    dropRule: 'inside-section',
    createHtml: () => `<div class="hc-block" data-hc-label="Div"><p>Container</p></div>`,
  },
  {
    id: 'columns',
    category: 'structure',
    structureKind: 'columns',
    dropRule: 'inside-container',
    createHtml: () =>
      `<div class="hc-cols-2" data-hc-columns="2" data-hc-label="Columns" style="gap:1rem"><div class="hc-col" data-hc-label="Column"><p>Column 1</p></div><div class="hc-col" data-hc-label="Column"><p>Column 2</p></div></div>`,
  },
  {
    id: 'spacer',
    category: 'structure',
    structureKind: 'spacer',
    dropRule: 'inside-container',
    createHtml: () =>
      `<div class="hc-spacer" data-hc-spacer="24" data-hc-label="Spacer" style="height:24px" aria-hidden="true"></div>`,
  },
  {
    id: 'templates',
    category: 'templates',
    openTool: 'elements',
    dropRule: 'section-sibling',
    createHtml: () =>
      `<section class="hc-slide" data-hc-slide data-hc-label="Template section"><div class="hc-slide__body"><p>Pick a template from the Templates category.</p></div></section>`,
  },
];

export function catalogItemsForCategory(
  category: ElementCatalogCategoryId,
): ElementCatalogItem[] {
  return ELEMENT_CATALOG.filter((i) => i.category === category);
}
