/**
 * Canonical HyperClass slide fragment (lesson HTML).
 *
 * Slides are HTML fragments injected into `.lesson-stage` — not full documents.
 * Keep this shell for every new lesson so authoring/edit tools have a stable target:
 *
 *   section.hc-slide[data-hc-slide]
 *     h1.hc-slide__title          ← slide heading
 *     div.hc-slide__body          ← main content; add <p>, lists, .hc-* widgets here
 *
 * Anything inside `.hc-slide__body` is fair game for later editing.
 */

export const EMPTY_SLIDE_HTML = `<section class="hc-slide" data-hc-slide>
  <h1 class="hc-slide__title"></h1>
  <div class="hc-slide__body">
    <p></p>
  </div>
</section>
`;

/** First lesson when scaffolding a brand-new course (same shell, starter copy). */
export const WELCOME_SLIDE_HTML = `<section class="hc-slide" data-hc-slide>
  <h1 class="hc-slide__title">Welcome</h1>
  <div class="hc-slide__body">
    <p>This is your first slide. Add paragraphs, lists, and course components inside this body — they render in the lesson stage.</p>
  </div>
</section>
`;
