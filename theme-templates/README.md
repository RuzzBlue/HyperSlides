# Theme templates

Copy any folder into a course as `courses/<course_id>/theme/` (replace the existing `theme` folder contents).

```text
courses/my_course/
  theme/
    theme.json   ← from a template below
    theme.css
    (optional images for backgrounds / watermarks)
```

HyperClass loads `theme/theme.json` when the course opens. Changing the theme is like swapping a PowerPoint design: colors, fonts, type sizes, default background, named slide backgrounds, watermark, and page numbers.

## How slide backgrounds work

Unlike Keynote master slides, each HyperClass “slide” is an HTML lesson fragment. The **theme** defines named background paints; each **slide** picks one:

1. In `course.json` on a lesson/quiz/lab item:

```json
{ "type": "lesson", "id": "lesson-01", "title": "Welcome", "file": "lesson-01.html", "bg": "title" }
```

2. Or in the lesson HTML:

```html
<div data-slide-bg="section">…</div>
```

Resolution order: `course.json` `bg` → `data-slide-bg` → `backgrounds.default` → legacy `background`.

Typical variant keys (templates include these):

| Key | Use |
|-----|-----|
| `default` | Normal content slides |
| `title` | Opening / title slide |
| `section` | Module / section divider |
| `accent` | Callout / emphasis |
| `dark` | Inverted panel look |

## Watermark

```json
"watermark": {
  "enabled": true,
  "kind": "text",
  "value": "CONFIDENTIAL",
  "opacity": 0.07,
  "size": "14vmin",
  "rotateDeg": -28,
  "position": "center",
  "repeat": "single"
}
```

- `kind`: `text` | `image` (image path relative to `theme/`)
- `repeat`: `single` | `tiled`
- `position`: `center` | `top-left` | `top-right` | `bottom-left` | `bottom-right`

## Page numbers

```json
"pageNumber": {
  "enabled": true,
  "position": "bottom-right",
  "format": "{n} / {total}",
  "opacity": 0.55
}
```

Tokens: `{n}` (1-based index), `{total}` (sequence length).

## Packs in this folder

| Folder | Look |
|--------|------|
| `crypto-teal` | Current HyperClass crypto / demo look |
| `white-minimalist` | Clean white, tight sans, soft gray rules |
| `elegant-dark` | Charcoal stage, gold accent, display serif |
| `old-magazine` | Newsprint cream, strong serif, ink headlines |
| `pastel-cream` | Soft sand/peach palette, rounded calm type |

App chrome (navigator, toolbar) still follows **Settings → Appearance**. Course themes style the **slide stage**.
