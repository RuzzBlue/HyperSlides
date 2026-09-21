import { useEffect, useId, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ExpandableShell, PanZoomSurface } from '../ExpandableShell';
import { attr } from './mountData';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Outfit, system-ui, sans-serif',
});

const BIG_MERMAID = `flowchart TB
  subgraph User["User device"]
    W[Wallet]
    S[Sign transaction]
  end
  subgraph Network["Peer network"]
    M[Mempool]
    V[Validators / miners]
    P[Propagate block]
  end
  subgraph Ledger["Shared ledger"]
    B[New block]
    C[Confirmations]
    L[Canonical tip]
  end
  W --> S --> M --> V --> B --> P --> C --> L
  L -.->|sync headers / state| W`;

function resolveChart(host: HTMLElement | null | undefined, chart?: string): string {
  if (chart?.trim()) return chart.trim();
  if (host) {
    const chartEl = host.querySelector('[data-chart]');
    if (chartEl) {
      // Prefer element body (inspector writes textContent). Attribute is often just a marker.
      const fromText = (chartEl.textContent || '').trim();
      if (fromText) return fromText;
      const fromAttr = attr(chartEl, 'data-chart');
      if (fromAttr) return fromAttr;
    }
    const hostAttr = attr(host, 'data-chart');
    if (hostAttr) return hostAttr;
    const code = host.querySelector('pre, code');
    if (code) {
      const codeText = (code.textContent || '').trim();
      if (codeText) return codeText;
    }
  }
  return BIG_MERMAID;
}

function isMermaidSourceTarget(host: HTMLElement, target: Node): boolean {
  const el =
    target.nodeType === Node.TEXT_NODE
      ? target.parentElement
      : target instanceof HTMLElement
        ? target
        : null;
  if (!el) return false;
  if (el === host) return true;
  if (el.hasAttribute('data-chart') || el.closest('[data-chart]')) return true;
  if (el.matches('pre, code') || el.closest('pre, code')) return true;
  if (el.hasAttribute('data-hc-source-root') || el.closest('[data-hc-source-root]')) return true;
  return false;
}

export function MermaidWidget({
  chart,
  host,
}: {
  chart?: string;
  host?: HTMLElement | null;
}) {
  const baseId = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const [sourceTick, setSourceTick] = useState(0);
  const definition = useMemo(() => resolveChart(host, chart), [host, chart, sourceTick]);
  const [tick, setTick] = useState(0);
  const title = host?.getAttribute('data-shell-title') || host?.getAttribute('data-hc-label') || 'Diagram';
  const allowExpand = host?.getAttribute('data-shell-expand') !== '0';
  const allowZoom = host?.getAttribute('data-shell-zoom') !== '0';
  const allowPan = host?.getAttribute('data-shell-pan') !== '0';
  const allowSnapshot = host?.getAttribute('data-shell-snapshot') === '1';

  useEffect(() => {
    if (!host) return;
    const observer = new MutationObserver((records) => {
      const sourceChanged = records.some((record) => {
        if (record.type === 'attributes') {
          if (record.target === host && record.attributeName?.startsWith('data-')) return true;
          if (
            record.target instanceof HTMLElement &&
            (record.attributeName === 'data-chart' || record.target.hasAttribute('data-chart'))
          ) {
            return true;
          }
          return false;
        }
        if (record.type === 'characterData') {
          return isMermaidSourceTarget(host, record.target);
        }
        const changed = [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)];
        return changed.some((node) => isMermaidSourceTarget(host, node));
      });
      if (sourceChanged) setSourceTick((value) => value + 1);
    });
    observer.observe(host, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [host]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const gen = `${baseId}-${tick}-${sourceTick}`;
    const run = async () => {
      try {
        // Mermaid requires unique ids; strip chars that break SVG/CSS selectors.
        const renderId = `mmd-${gen.replace(/[^a-zA-Z0-9_-]/g, '')}-${Math.random().toString(36).slice(2, 7)}`;
        const { svg } = await mermaid.render(renderId, definition);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch (err) {
        if (cancelled) return;
        console.error('[mermaid] render failed', err, definition);
        if (ref.current) ref.current.textContent = 'Diagram failed to render.';
      }
    };
    // Debounce so mid-edit / portal mutations don't race a good SVG with a failed one.
    timer = window.setTimeout(() => {
      void run();
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [definition, baseId, tick, sourceTick]);

  return (
    <ExpandableShell
      title={title}
      allowExpand={allowExpand}
      allowSnapshot={allowSnapshot}
      snapshotName={title}
      bodyClassName="h-[280px]"
      expandedBodyClassName="min-h-0 flex-1"
    >
      {allowZoom || allowPan ? (
        <PanZoomSurface
          enableZoom={allowZoom}
          enablePan={allowPan}
          className="h-full min-h-[280px] bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900"
        >
          <div
            ref={ref}
            className="[&_svg]:max-w-none"
            onDoubleClick={() => setTick((t) => t + 1)}
            title="Double-click to re-render diagram"
          />
        </PanZoomSurface>
      ) : (
        <div className="h-full min-h-[280px] overflow-auto bg-gradient-to-b from-slate-50 to-white p-4 dark:from-slate-950 dark:to-slate-900">
          <div
            ref={ref}
            className="[&_svg]:max-w-none"
            onDoubleClick={() => setTick((t) => t + 1)}
            title="Double-click to re-render diagram"
          />
        </div>
      )}
    </ExpandableShell>
  );
}
