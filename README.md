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

## Authoring in the app

Open a course, then use the toolbar **Code** inspector to edit the current item without leaving Present mode:

- **Lessons** — HTML source (floating/docked panel, resize, templates from the demo course)
- **Quizzes** — questions JSON + encrypted answer keys
- **Labs** — activity source / sections

Related chrome: course structure edits in the left sidebar (rename, reorder, insert lessons/quizzes/labs), Notes, Animations, Activities, Graphs/Tables/Media inserts, and Progress.

## Quizzes

Supported question types (see the kitchen-sink demo quiz under `courses/demo_course_v001/`):

| Type | Notes |
|------|--------|
| `multiple_choice` | Single correct option |
| `multiple_select` | Several correct options |
| `true_false` | Boolean |
| `this_or_that` / `these_or_those` | Pair / group picks |
| `dropdown` | One or more inline dropdowns |
| `fill_blank` | Text blanks |
| `numeric` | Number answers (tolerance supported) |
| `short_answer` / `long_answer` | Free text (often ungraded) |
| `ordering` | Drag / sequence |
| `matching` | Match pairs |
| `poll` | Opinion (ungraded) |
| `rating` | Numeric, star (incl. half-steps), or slider |

Answer keys live under `quizzes/answer-keys/` (not shipped in learner-facing question files).

## Sidebar & settings

Gear → **App** prefs (saved in `data/user.json`):

- Default sidebar view: **Navigator** (thumbnails) or **Overview** (outline)
- Header: slides count and/or **Display header with sidebar view toggle**
- Scoped display (navigator / overview / both): module/unit numbers, slide numbers, completion checks
- Use course settings, demo course visibility, remember last course, auto-advance after quiz

Appearance can be overridden by the open course when **Use course settings** is on.

Visit progress: leaving a slide marks it complete (`completedKeys`); quizzes/labs also update progress from pass/interact. Checks appear in Navigator and Overview when enabled.

## Course package layout

```
courses/
  demo_course_v001/
    course.json
    modules/...
    quizzes/
      quiz-01/
      answer-keys/
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
