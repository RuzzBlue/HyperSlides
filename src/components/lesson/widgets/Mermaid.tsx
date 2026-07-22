import { useEffect, useId, useRef } from 'react';
import mermaid from 'mermaid';
import { ExpandableShell, PanZoomSurface } from '../ExpandableShell';

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

export function MermaidWidget({ chart }: { chart?: string }) {
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const definition = chart || BIG_MERMAID;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { svg } = await mermaid.render(`mmd-${id}`, definition);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (ref.current) ref.current.textContent = 'Diagram failed to render.';
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [definition, id]);

  return (
    <ExpandableShell
      title="Consensus flow diagram"
      bodyClassName="h-[280px]"
      expandedBodyClassName="min-h-0 flex-1"
    >
      <PanZoomSurface className="h-full min-h-[280px] bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div ref={ref} className="[&_svg]:max-w-none" />
      </PanZoomSurface>
    </ExpandableShell>
  );
}
