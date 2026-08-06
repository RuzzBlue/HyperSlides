import { useEffect, useMemo, useState } from 'react';
import { clampIndex, hasMountItems, queryMountItems } from './mountData';

/** Parse mount items once per host/signature; clamp an active index when length changes. */
export function useClampedIndex(length: number, initial = 0) {
  const [index, setIndex] = useState(initial);
  useEffect(() => {
    setIndex((i) => clampIndex(i, length));
  }, [length]);
  return [index, setIndex] as const;
}

export function useHostItemNodes(host: HTMLElement | null | undefined): HTMLElement[] {
  return useMemo(() => {
    if (!host || !hasMountItems(host)) return [];
    return queryMountItems(host);
  }, [host]);
}
