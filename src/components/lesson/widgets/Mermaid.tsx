import { useEffect, useId, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ExpandableShell, PanZoomSurface } from '../ExpandableShell';
import { attr, text } from './mountData';

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
      const fromAttr = attr(chartEl, 'data-chart');
      const fromText = text(chartEl);
      if (fromAttr) return fromAttr;
      if (fromText) return (chartEl.textContent || '').trim();
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

export function MermaidWidget({
  chart,
  host,
}: {
  chart?: string;
  host?: HTMLElement | null;
}) {
  const baseId = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const definition = useMemo(() => resolveChart(host, chart), [host, chart]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const renderId = `mmd-${baseId}-${tick}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg } = await mermaid.render(renderId, definition);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (ref.current) ref.current.textContent = 'Diagram failed to render.';
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [definition, baseId, tick]);

  return (
    <ExpandableShell
      title="Consensus flow diagram"
      bodyClassName="h-[280px]"
      expandedBodyClassName="min-h-0 flex-1"
    >
      <PanZoomSurface className="h-full min-h-[280px] bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div
          ref={ref}
          className="[&_svg]:max-w-none"
          onDoubleClick={() => setTick((t) => t + 1)}
          title="Double-click to re-render diagram"
        />
      </PanZoomSurface>
    </ExpandableShell>
  );
}
