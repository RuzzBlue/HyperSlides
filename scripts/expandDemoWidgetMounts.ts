/**
 * Expand empty data-component mounts in hyperclass_demo_v001 into editable
 * [data-item] (or section/chart) children via shared/widgetMountExpand.ts.
 *
 * Run: npx tsx scripts/expandDemoWidgetMounts.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandMountInner } from '../shared/widgetMountExpand.ts';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesRoot = path.join(appRoot, 'courses', 'hyperclass_demo_v001', 'modules');

function walkHtmlFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walkHtmlFiles(full));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

function parseAttrs(attrBlob: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([:@\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrBlob))) {
    attrs[m[1]] = m[2] ?? m[3] ?? '';
  }
  return attrs;
}

function serializeOpening(attrs: Record<string, string>): string {
  const parts = Object.entries(attrs).map(([k, v]) => `${k}="${v.replace(/"/g, '&quot;')}"`);
  return `<div ${parts.join(' ')}>`;
}

function mergeHostAttrs(
  existing: Record<string, string>,
  patch?: Record<string, string>,
): Record<string, string> {
  if (!patch) return { ...existing };
  const next = { ...existing };
  for (const [k, v] of Object.entries(patch)) {
    if (next[k] == null || String(next[k]).trim() === '') next[k] = v;
  }
  return next;
}

/** Empty or whitespace-only inner that has no editable markers yet. */
function alreadyExpanded(inner: string): boolean {
  return (
    /\bdata-item\b/i.test(inner) ||
    /\bdata-section\b/i.test(inner) ||
    /\bdata-chart\b/i.test(inner) ||
    /\bdata-hero\b/i.test(inner)
  );
}

type Stats = {
  filesModified: number;
  mountsExpanded: number;
  mountsSkippedExpanded: number;
  mountsSkippedNull: Record<string, number>;
  mountsUnknown: Record<string, number>;
};

function expandFile(filePath: string, stats: Stats): boolean {
  const original = fs.readFileSync(filePath, 'utf-8');
  // Match empty <div …data-component…></div> (attrs may span lines); ignore self-closing.
  const mountRe =
    /<div\s+([^>]*\bdata-component\s*=\s*["'][^"']+["'][^>]*)>\s*<\/div>/gi;

  let changed = false;
  const next = original.replace(mountRe, (full, attrBlob: string) => {
    const attrs = parseAttrs(attrBlob);
    const type = (attrs['data-component'] || '').trim();
    if (!type) return full;

    // Inner of a matched empty mount is always empty — but guard if somehow not
    if (alreadyExpanded(full)) {
      stats.mountsSkippedExpanded += 1;
      return full;
    }

    const preset = attrs['data-preset'];
    const expanded = expandMountInner(type, preset);
    if (!expanded) {
      stats.mountsSkippedNull[type] = (stats.mountsSkippedNull[type] || 0) + 1;
      return full;
    }

    const merged = mergeHostAttrs(attrs, expanded.hostAttrs);
    const opening = serializeOpening(merged);
    stats.mountsExpanded += 1;
    changed = true;
    return `${opening}${expanded.inner}</div>`;
  });

  if (changed) {
    fs.writeFileSync(filePath, next, 'utf-8');
    stats.filesModified += 1;
  }
  return changed;
}

function main() {
  const files = walkHtmlFiles(modulesRoot);
  const stats: Stats = {
    filesModified: 0,
    mountsExpanded: 0,
    mountsSkippedExpanded: 0,
    mountsSkippedNull: {},
    mountsUnknown: {},
  };

  for (const file of files) {
    expandFile(file, stats);
  }

  console.log(`Files scanned: ${files.length}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Mounts expanded: ${stats.mountsExpanded}`);
  if (stats.mountsSkippedExpanded) {
    console.log(`Mounts skipped (already expanded): ${stats.mountsSkippedExpanded}`);
  }
  const skipped = Object.entries(stats.mountsSkippedNull);
  if (skipped.length) {
    console.log('Types skipped (attribute-driven / no expander):');
    for (const [t, n] of skipped.sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`  ${t}: ${n}`);
    }
  }
}

main();
