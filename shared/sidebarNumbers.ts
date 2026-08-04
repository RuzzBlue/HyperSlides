import type { SidebarNumberViews, SidebarViewMode } from './types.ts';

/** Whether numbering should appear for the active sidebar layout. */
export function sidebarNumbersActive(
  enabled: boolean | undefined,
  views: SidebarNumberViews | undefined,
  mode: SidebarViewMode,
): boolean {
  if (!enabled) return false;
  const scope = views ?? 'navigator';
  if (scope === 'both') return true;
  return scope === mode;
}
