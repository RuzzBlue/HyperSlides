# HyperClass

**WebDeck Presenter** — interactive HTML course runtime (Keynote polish, PowerPoint workflow).

Courses live as folders under `courses/`. The app reads `course.json`, presents lessons on a stage, and interleaves auto-graded quizzes and self-checked labs.

## Dual runtime

| Mode | Command | How API works |
|------|---------|----------------|
| Desktop (Electron) | `npm run dev` | Preload `window.hyperclass.fetch` → IPC → `handleApiRequest` |
| Browser | `npm run serve:full` / `npm run dev:web` | Express serves UI + `/api/*` → **same** `handleApiRequest` |

Privileged work (courses, quizzes, progress, user profile) lives only in `shared/api/handleApiRequest.ts`.

## Quick start

```bash
npm install
npm run dev:web     # browser — Vite :5173 + API :8765
npm run dev         # Electron desktop shell
npm run serve:full  # built UI + API on :8765
```

## Settings

Gear icon opens Appearance; profile button opens Profile. Prefs save to `data/user.json`.

## Course package layout

```
courses/
  crypto_course_v001/
    course.json
    modules/...
    quizzes/...
    labs/...
    notes/...
    widgets/...
    assets/
    theme/
      theme.json
      theme.css
```

## Themes (PowerPoint-style)

Copy a pack from [`theme-templates/`](theme-templates/README.md) into `courses/<id>/theme/`.

Themes control slide stage design: fonts, type sizes, accent colors, named backgrounds (`default` / `title` / `section` / …), watermark, and page numbers.

Per-slide background: set `"bg": "title"` on a `course.json` item, or `data-slide-bg="title"` in the lesson HTML.

Created by RuzzBlue - 2026
