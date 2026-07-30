import fs from 'node:fs';
import path from 'node:path';
import type {
  CourseLessonEntry,
  CourseManifest,
  CourseModule,
  CourseSequenceEntry,
  CourseUnit,
  LoadedCourse,
  StructureDropTarget,
  StructureTarget,
} from '../types.ts';
import { loadCourse } from './courses.ts';
import { EMPTY_SLIDE_HTML } from './slideTemplate.ts';

export type { StructureDropTarget, StructureTarget };

export type StructureResult = {
  course: Omit<LoadedCourse, 'rootPath'>;
  focusKey: string | null;
};

type ItemLocation = {
  moduleIndex: number;
  unitIndex: number | null;
  itemIndex: number;
  entry: CourseSequenceEntry;
  /** Unit list vs module trailing list. */
  list: 'unit' | 'trailing';
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function toSafeCourse(course: LoadedCourse): Omit<LoadedCourse, 'rootPath'> {
  const { rootPath: _, ...safe } = course;
  return safe;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function nextId(existing: string[], prefix: string): string {
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  for (const id of existing) {
    const m = re.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${pad2(max + 1)}`;
}

function entryKey(
  entry: CourseSequenceEntry,
  mod: CourseModule,
  unit: CourseUnit | null,
): string {
  if (entry.type === 'quiz') return `quiz:${entry.id}`;
  if (entry.type === 'lab') return `lab:${entry.id}`;
  if (unit) return `${mod.id}/${unit.id}/${entry.id}`;
  return `${mod.id}/${entry.id}`;
}

function walkItems(
  manifest: CourseManifest,
  visit: (loc: ItemLocation, mod: CourseModule, unit: CourseUnit | null) => void,
) {
  for (let mi = 0; mi < manifest.modules.length; mi++) {
    const mod = manifest.modules[mi];
    for (let ui = 0; ui < mod.units.length; ui++) {
      const unit = mod.units[ui];
      const items = unit.items ?? [];
      for (let ii = 0; ii < items.length; ii++) {
        visit(
          { moduleIndex: mi, unitIndex: ui, itemIndex: ii, entry: items[ii], list: 'unit' },
          mod,
          unit,
        );
      }
    }
    const trailing = mod.items ?? [];
    for (let ii = 0; ii < trailing.length; ii++) {
      visit(
        {
          moduleIndex: mi,
          unitIndex: null,
          itemIndex: ii,
          entry: trailing[ii],
          list: 'trailing',
        },
        mod,
        null,
      );
    }
  }
}

function locateItem(manifest: CourseManifest, itemKey: string): ItemLocation | null {
  let found: ItemLocation | null = null;
  walkItems(manifest, (loc, mod, unit) => {
    if (found) return;
    if (entryKey(loc.entry, mod, unit) === itemKey) found = loc;
  });
  return found;
}

function allQuizIds(manifest: CourseManifest): string[] {
  const ids: string[] = [];
  walkItems(manifest, (loc) => {
    if (loc.entry.type === 'quiz') ids.push(loc.entry.id);
  });
  return ids;
}

function allLabIds(manifest: CourseManifest): string[] {
  const ids: string[] = [];
  walkItems(manifest, (loc) => {
    if (loc.entry.type === 'lab') ids.push(loc.entry.id);
  });
  return ids;
}

function findModuleIndex(manifest: CourseManifest, moduleId: string): number {
  return manifest.modules.findIndex((m) => m.id === moduleId);
}

function findUnitIndex(mod: CourseModule, unitId: string): number {
  return mod.units.findIndex((u) => u.id === unitId);
}

function rmDirSafe(dir: string) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function rmFileSafe(file: string) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function copyDirRecursive(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDirRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
}

function deleteEntryArtifacts(rootPath: string, entry: CourseSequenceEntry, lessonDir?: string) {
  if (entry.type === 'quiz') {
    rmDirSafe(path.join(rootPath, 'quizzes', entry.id));
  } else if (entry.type === 'lab') {
    rmDirSafe(path.join(rootPath, 'labs', entry.id));
    rmFileSafe(path.join(rootPath, 'labs', 'rubrics', `${entry.id}.json`));
  } else if (entry.type === 'lesson' && lessonDir) {
    rmFileSafe(path.join(lessonDir, entry.file));
    if (entry.notes) rmFileSafe(path.join(rootPath, 'notes', entry.notes));
  }
}

function deleteUnitArtifacts(rootPath: string, mod: CourseModule, unit: CourseUnit) {
  for (const entry of unit.items ?? []) {
    deleteEntryArtifacts(rootPath, entry, path.join(rootPath, mod.path, unit.id));
  }
  rmDirSafe(path.join(rootPath, mod.path, unit.id));
}

function deleteModuleArtifacts(rootPath: string, mod: CourseModule) {
  for (const unit of mod.units) deleteUnitArtifacts(rootPath, mod, unit);
  for (const entry of mod.items ?? []) {
    deleteEntryArtifacts(rootPath, entry, path.join(rootPath, mod.path));
  }
  rmDirSafe(path.join(rootPath, mod.path));
}

function reloadResult(
  appRoot: string,
  courseId: string,
  focusKey: string | null,
): StructureResult {
  const refreshed = loadCourse(appRoot, courseId);
  if (!refreshed) throw new Error('Course reload failed');
  let key = focusKey;
  if (key && !refreshed.sequence.some((s) => s.key === key)) {
    key = refreshed.sequence[0]?.key ?? null;
  }
  return { course: toSafeCourse(refreshed), focusKey: key };
}

function loadManifest(appRoot: string, courseId: string): {
  loaded: LoadedCourse;
  rootPath: string;
  manifestPath: string;
  manifest: CourseManifest;
} {
  const loaded = loadCourse(appRoot, courseId);
  if (!loaded) throw new Error('Course not found');
  const rootPath = loaded.rootPath;
  const manifestPath = path.join(rootPath, 'course.json');
  const manifest = readJson<CourseManifest>(manifestPath);
  return { loaded, rootPath, manifestPath, manifest };
}

export function renameStructureNode(
  appRoot: string,
  courseId: string,
  target: StructureTarget,
  title: string,
): StructureResult {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Title cannot be empty');

  const { rootPath, manifestPath, manifest } = loadManifest(appRoot, courseId);
  let focusKey: string | null = null;

  if (target.kind === 'module') {
    const mi = findModuleIndex(manifest, target.moduleId);
    if (mi < 0) throw new Error('Module not found');
    manifest.modules[mi].title = trimmed;
    const first = manifest.modules[mi].units[0]?.items?.[0];
    const unit = manifest.modules[mi].units[0] ?? null;
    focusKey = first ? entryKey(first, manifest.modules[mi], unit) : null;
  } else if (target.kind === 'unit') {
    const mi = findModuleIndex(manifest, target.moduleId);
    if (mi < 0) throw new Error('Module not found');
    const ui = findUnitIndex(manifest.modules[mi], target.unitId);
    if (ui < 0) throw new Error('Unit not found');
    manifest.modules[mi].units[ui].title = trimmed;
    const first = manifest.modules[mi].units[ui].items?.[0];
    focusKey = first
      ? entryKey(first, manifest.modules[mi], manifest.modules[mi].units[ui])
      : null;
  } else {
    const loc = locateItem(manifest, target.itemKey);
    if (!loc) throw new Error('Item not found');
    const mod = manifest.modules[loc.moduleIndex];
    const unit = loc.unitIndex != null ? mod.units[loc.unitIndex] : null;
    loc.entry.title = trimmed;
    if (loc.entry.type === 'quiz') {
      const actPath = path.join(rootPath, 'quizzes', loc.entry.id, 'activity.json');
      if (fs.existsSync(actPath)) {
        const act = readJson<Record<string, unknown>>(actPath);
        act.title = trimmed;
        writeJson(actPath, act);
      }
    } else if (loc.entry.type === 'lab') {
      const actPath = path.join(rootPath, 'labs', loc.entry.id, 'activity.json');
      if (fs.existsSync(actPath)) {
        const act = readJson<Record<string, unknown>>(actPath);
        act.title = trimmed;
        writeJson(actPath, act);
      }
    }
    focusKey = entryKey(loc.entry, mod, unit);
  }

  writeJson(manifestPath, manifest);
  return reloadResult(appRoot, courseId, focusKey);
}

export function deleteStructureNode(
  appRoot: string,
  courseId: string,
  target: StructureTarget,
): StructureResult {
  const { rootPath, manifestPath, manifest } = loadManifest(appRoot, courseId);

  if (target.kind === 'module') {
    if (manifest.modules.length <= 1) throw new Error('Cannot delete the last module');
    const mi = findModuleIndex(manifest, target.moduleId);
    if (mi < 0) throw new Error('Module not found');
    deleteModuleArtifacts(rootPath, manifest.modules[mi]);
    manifest.modules.splice(mi, 1);
  } else if (target.kind === 'unit') {
    const mi = findModuleIndex(manifest, target.moduleId);
    if (mi < 0) throw new Error('Module not found');
    const mod = manifest.modules[mi];
    if (mod.units.length <= 1) throw new Error('Cannot delete the last unit in a module');
    const ui = findUnitIndex(mod, target.unitId);
    if (ui < 0) throw new Error('Unit not found');
    deleteUnitArtifacts(rootPath, mod, mod.units[ui]);
    mod.units.splice(ui, 1);
  } else {
    const loc = locateItem(manifest, target.itemKey);
    if (!loc) throw new Error('Item not found');
    const mod = manifest.modules[loc.moduleIndex];
    if (loc.list === 'unit' && loc.unitIndex != null) {
      const unit = mod.units[loc.unitIndex];
      if ((unit.items?.length ?? 0) <= 1) {
        throw new Error('Cannot delete the last item in a unit');
      }
      const [removed] = (unit.items ?? []).splice(loc.itemIndex, 1);
      deleteEntryArtifacts(rootPath, removed, path.join(rootPath, mod.path, unit.id));
    } else {
      const [removed] = (mod.items ?? []).splice(loc.itemIndex, 1);
      deleteEntryArtifacts(rootPath, removed, path.join(rootPath, mod.path));
    }
  }

  writeJson(manifestPath, manifest);
  return reloadResult(appRoot, courseId, null);
}

function cloneQuiz(rootPath: string, sourceId: string, newId: string, title: string) {
  const src = path.join(rootPath, 'quizzes', sourceId);
  const dest = path.join(rootPath, 'quizzes', newId);
  if (!fs.existsSync(src)) throw new Error('Quiz files not found');
  copyDirRecursive(src, dest);
  const actPath = path.join(dest, 'activity.json');
  if (fs.existsSync(actPath)) {
    const act = readJson<Record<string, unknown>>(actPath);
    act.id = newId;
    act.title = title;
    writeJson(actPath, act);
  }
}

function cloneLab(rootPath: string, sourceId: string, newId: string, title: string) {
  const src = path.join(rootPath, 'labs', sourceId);
  const dest = path.join(rootPath, 'labs', newId);
  if (!fs.existsSync(src)) throw new Error('Lab files not found');
  copyDirRecursive(src, dest);
  const actPath = path.join(dest, 'activity.json');
  if (fs.existsSync(actPath)) {
    const act = readJson<Record<string, unknown>>(actPath);
    act.id = newId;
    act.title = title;
    if (typeof act.rubricFile === 'string') act.rubricFile = `${newId}.json`;
    writeJson(actPath, act);
  }
  const rubricSrc = path.join(rootPath, 'labs', 'rubrics', `${sourceId}.json`);
  const rubricDest = path.join(rootPath, 'labs', 'rubrics', `${newId}.json`);
  if (fs.existsSync(rubricSrc)) {
    const rubric = readJson<Record<string, unknown>>(rubricSrc);
    rubric.id = `rubric-${newId}`;
    rubric.labId = newId;
    if (typeof rubric.title === 'string') {
      rubric.title = String(rubric.title).replace(sourceId, newId);
    }
    writeJson(rubricDest, rubric);
  }
}

export function duplicateStructureItem(
  appRoot: string,
  courseId: string,
  itemKey: string,
): StructureResult {
  const { rootPath, manifestPath, manifest } = loadManifest(appRoot, courseId);
  const loc = locateItem(manifest, itemKey);
  if (!loc) throw new Error('Item not found');
  if (loc.entry.type !== 'lesson' && loc.entry.type !== 'quiz' && loc.entry.type !== 'lab') {
    throw new Error('Only lessons, quizzes, and labs can be duplicated');
  }

  const mod = manifest.modules[loc.moduleIndex];
  const unit = loc.unitIndex != null ? mod.units[loc.unitIndex] : null;
  const list =
    loc.list === 'unit' && unit
      ? (unit.items ?? (unit.items = []))
      : (mod.items ?? (mod.items = []));

  let newEntry: CourseSequenceEntry;
  if (loc.entry.type === 'lesson') {
    const siblingLessons = list.filter((i) => i.type === 'lesson').map((i) => i.id);
    const id = nextId(siblingLessons, 'lesson');
    const file = `${id}.html`;
    const dir =
      loc.list === 'unit' && unit
        ? path.join(rootPath, mod.path, unit.id)
        : path.join(rootPath, mod.path);
    fs.mkdirSync(dir, { recursive: true });
    const srcFile = path.join(dir, loc.entry.file);
    const destFile = path.join(dir, file);
    if (fs.existsSync(srcFile)) fs.copyFileSync(srcFile, destFile);
    else fs.writeFileSync(destFile, '', 'utf-8');
    newEntry = {
      type: 'lesson',
      id,
      title: `${loc.entry.title} (copy)`,
      file,
      durationMinutes: loc.entry.durationMinutes,
      bg: loc.entry.bg,
    };
  } else if (loc.entry.type === 'quiz') {
    const id = nextId(allQuizIds(manifest), 'quiz');
    const title = `${loc.entry.title} (copy)`;
    cloneQuiz(rootPath, loc.entry.id, id, title);
    newEntry = { type: 'quiz', id, title, bg: loc.entry.bg };
  } else {
    const id = nextId(allLabIds(manifest), 'lab');
    const title = `${loc.entry.title} (copy)`;
    cloneLab(rootPath, loc.entry.id, id, title);
    newEntry = { type: 'lab', id, title, bg: loc.entry.bg };
  }

  list.splice(loc.itemIndex + 1, 0, newEntry);
  writeJson(manifestPath, manifest);
  return reloadResult(appRoot, courseId, entryKey(newEntry, mod, unit));
}

function ensureLessonIdUnique(list: CourseSequenceEntry[], entry: CourseLessonEntry): CourseLessonEntry {
  const ids = list.filter((i) => i.type === 'lesson').map((i) => i.id);
  if (!ids.includes(entry.id)) return entry;
  const id = nextId(ids, 'lesson');
  return { ...entry, id, file: `${id}.html` };
}

function moveLessonFiles(
  rootPath: string,
  entry: CourseLessonEntry,
  fromMod: CourseModule,
  fromUnit: CourseUnit | null,
  toMod: CourseModule,
  toUnit: CourseUnit | null,
  finalEntry: CourseLessonEntry,
) {
  const fromDir =
    fromUnit != null
      ? path.join(rootPath, fromMod.path, fromUnit.id)
      : path.join(rootPath, fromMod.path);
  const toDir =
    toUnit != null
      ? path.join(rootPath, toMod.path, toUnit.id)
      : path.join(rootPath, toMod.path);
  fs.mkdirSync(toDir, { recursive: true });
  const src = path.join(fromDir, entry.file);
  const dest = path.join(toDir, finalEntry.file);
  if (src === dest) return;
  if (fs.existsSync(src)) {
    if (fs.existsSync(dest) && src !== dest) fs.unlinkSync(dest);
    fs.renameSync(src, dest);
  }
}

function moveUnitFolder(
  rootPath: string,
  unit: CourseUnit,
  fromMod: CourseModule,
  toMod: CourseModule,
) {
  if (fromMod.path === toMod.path) return;
  const src = path.join(rootPath, fromMod.path, unit.id);
  const dest = path.join(rootPath, toMod.path, unit.id);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    throw new Error('Unit folder already exists in destination module');
  }
  fs.renameSync(src, dest);
}

/** After a move, remove emptied units/modules. Keeps at least one module with one unit. */
function pruneEmptyAncestors(
  rootPath: string,
  manifest: CourseManifest,
  moduleId: string,
  unitId: string | null,
) {
  const mi = findModuleIndex(manifest, moduleId);
  if (mi < 0) return;
  const mod = manifest.modules[mi];

  if (unitId) {
    const ui = findUnitIndex(mod, unitId);
    if (ui >= 0 && (mod.units[ui].items?.length ?? 0) === 0) {
      deleteUnitArtifacts(rootPath, mod, mod.units[ui]);
      mod.units.splice(ui, 1);
    }
  }

  const moduleEmpty = mod.units.length === 0 && !(mod.items && mod.items.length > 0);
  if (!moduleEmpty) return;

  if (manifest.modules.length > 1) {
    deleteModuleArtifacts(rootPath, mod);
    manifest.modules.splice(mi, 1);
    return;
  }

  // Last module must remain valid for the course package.
  const unitIdNew = 'unit-01';
  const lessonId = 'lesson-01';
  const absDir = path.join(rootPath, mod.path, unitIdNew);
  fs.mkdirSync(absDir, { recursive: true });
  fs.writeFileSync(path.join(absDir, `${lessonId}.html`), EMPTY_SLIDE_HTML, 'utf-8');
  mod.units = [
    {
      id: unitIdNew,
      title: 'Unit 1',
      items: [
        {
          type: 'lesson',
          id: lessonId,
          title: 'Slide',
          file: `${lessonId}.html`,
        },
      ],
    },
  ];
  mod.items = undefined;
}

export function moveStructureNode(
  appRoot: string,
  courseId: string,
  source: StructureTarget,
  dest: StructureDropTarget,
): StructureResult {
  const { rootPath, manifestPath, manifest } = loadManifest(appRoot, courseId);
  let focusKey: string | null = null;

  if (source.kind === 'module') {
    if (dest.kind !== 'modules') throw new Error('Modules can only be reordered among modules');
    const fromIndex = findModuleIndex(manifest, source.moduleId);
    if (fromIndex < 0) throw new Error('Module not found');
    const [mod] = manifest.modules.splice(fromIndex, 1);
    let index = dest.index;
    if (dest.index > fromIndex) index = dest.index - 1;
    index = Math.max(0, Math.min(index, manifest.modules.length));
    manifest.modules.splice(index, 0, mod);
    const first = mod.units[0]?.items?.[0];
    focusKey = first ? entryKey(first, mod, mod.units[0] ?? null) : null;
  } else if (source.kind === 'unit') {
    if (dest.kind !== 'units') throw new Error('Units can only be dropped among units');
    const fromMi = findModuleIndex(manifest, source.moduleId);
    if (fromMi < 0) throw new Error('Module not found');
    const fromMod = manifest.modules[fromMi];
    const fromUi = findUnitIndex(fromMod, source.unitId);
    if (fromUi < 0) throw new Error('Unit not found');
    const fromModuleId = fromMod.id;
    const [unit] = fromMod.units.splice(fromUi, 1);
    const toMi = findModuleIndex(manifest, dest.moduleId);
    if (toMi < 0) throw new Error('Destination module not found');
    const toMod = manifest.modules[toMi];
    let finalUnit = unit;
    if (toMod.units.some((u) => u.id === unit.id) && fromModuleId !== toMod.id) {
      const id = nextId(
        toMod.units.map((u) => u.id),
        'unit',
      );
      const oldPath = path.join(rootPath, fromMod.path, unit.id);
      const tmpPath = path.join(rootPath, fromMod.path, id);
      if (fs.existsSync(oldPath)) fs.renameSync(oldPath, tmpPath);
      finalUnit = { ...unit, id };
    }
    moveUnitFolder(rootPath, finalUnit, fromMod, toMod);
    let index = Math.max(0, Math.min(dest.index, toMod.units.length));
    if (fromModuleId === toMod.id && dest.index > fromUi) index = Math.max(0, dest.index - 1);
    toMod.units.splice(index, 0, finalUnit);
    if (fromModuleId !== toMod.id) {
      pruneEmptyAncestors(rootPath, manifest, fromModuleId, null);
    }
    const first = finalUnit.items?.[0];
    const refreshedTo = manifest.modules.find((m) => m.id === dest.moduleId) ?? toMod;
    const refreshedUnit =
      refreshedTo.units.find((u) => u.id === finalUnit.id) ?? finalUnit;
    focusKey = first ? entryKey(first, refreshedTo, refreshedUnit) : null;
  } else {
    const loc = locateItem(manifest, source.itemKey);
    if (!loc) throw new Error('Item not found');
    const fromMod = manifest.modules[loc.moduleIndex];
    const fromUnit = loc.unitIndex != null ? fromMod.units[loc.unitIndex] : null;
    const fromModuleId = fromMod.id;
    const fromUnitId = fromUnit?.id ?? null;
    const fromList =
      loc.list === 'unit' && fromUnit
        ? (fromUnit.items ?? [])
        : (fromMod.items ?? []);
    const [entry] = fromList.splice(loc.itemIndex, 1);

    if (dest.kind === 'unit-items') {
      const toMi = findModuleIndex(manifest, dest.moduleId);
      if (toMi < 0) throw new Error('Destination module not found');
      const toMod = manifest.modules[toMi];
      const toUi = findUnitIndex(toMod, dest.unitId);
      if (toUi < 0) throw new Error('Destination unit not found');
      const toUnit = toMod.units[toUi];
      if (!toUnit.items) toUnit.items = [];
      let finalEntry = entry;
      if (entry.type === 'lesson') {
        finalEntry = ensureLessonIdUnique(toUnit.items, entry);
        moveLessonFiles(rootPath, entry, fromMod, fromUnit, toMod, toUnit, finalEntry);
      }
      let index = Math.max(0, Math.min(dest.index, toUnit.items.length));
      const sameList =
        loc.list === 'unit' &&
        fromUnitId === toUnit.id &&
        fromModuleId === toMod.id;
      if (sameList && dest.index > loc.itemIndex) index = Math.max(0, dest.index - 1);
      toUnit.items.splice(index, 0, finalEntry);
      focusKey = entryKey(finalEntry, toMod, toUnit);
    } else if (dest.kind === 'module-trailing') {
      if (entry.type === 'lesson') {
        throw new Error('Lessons must live inside a unit');
      }
      const toMi = findModuleIndex(manifest, dest.moduleId);
      if (toMi < 0) throw new Error('Destination module not found');
      const toMod = manifest.modules[toMi];
      if (!toMod.items) toMod.items = [];
      let index = Math.max(0, Math.min(dest.index, toMod.items.length));
      const sameList = loc.list === 'trailing' && fromModuleId === toMod.id;
      if (sameList && dest.index > loc.itemIndex) index = Math.max(0, dest.index - 1);
      toMod.items.splice(index, 0, entry);
      focusKey = entryKey(entry, toMod, null);
    } else {
      throw new Error('Items can only be dropped into a unit or module trailing list');
    }

    const leftSameUnit =
      dest.kind === 'unit-items' &&
      dest.moduleId === fromModuleId &&
      dest.unitId === fromUnitId;
    if (!leftSameUnit) {
      pruneEmptyAncestors(rootPath, manifest, fromModuleId, fromUnitId);
    }
  }

  writeJson(manifestPath, manifest);
  return reloadResult(appRoot, courseId, focusKey);
}

/** Resolve a sequence item's first focusable key after rename of module/unit titles (UI helper type). */
export type StructureMutationKind = 'rename' | 'delete' | 'duplicate' | 'move';
