import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import mermaid from 'mermaid';
import {
  Chart,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  DoughnutController,
} from 'chart.js';

Chart.register(ArcElement, CategoryScale, LinearScale, Tooltip, Legend, DoughnutController);

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Outfit, system-ui, sans-serif',
});

/* —— Flip cards —— */
export function FlipCardsWidget() {
  const cards = [
    {
      front: 'Hash function',
      back: 'Maps any input to a fixed-length digest. Tiny input changes avalanche into a totally different output.',
    },
    {
      front: 'Private key',
      back: 'Secret material that authorizes spends. Anyone with it can move the associated funds.',
    },
    {
      front: 'Public address',
      back: 'Safe to share — like an account number. Derived from keys; used only to receive.',
    },
    {
      front: 'Consensus',
      back: 'How a network of peers agrees on a single shared history without a central referee.',
    },
  ];
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((c, i) => (
        <button
          key={c.front}
          type="button"
          onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
          className="group relative h-36 cursor-pointer [perspective:1000px]"
        >
          <div
            className={`relative h-full w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${
              flipped[i] ? '[transform:rotateY(180deg)]' : ''
            }`}
          >
            <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm [backface-visibility:hidden]">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-500">
                Tap to flip
              </span>
              <span className="text-lg font-black tracking-tight text-slate-900">{c.front}</span>
            </div>
            <div className="absolute inset-0 flex items-center rounded-2xl border border-indigo-200 bg-indigo-600 p-5 text-left text-sm leading-relaxed text-white shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
              {c.back}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* —— Accordion —— */
const ACCORDION_PRESETS: Record<string, { t: string; d: string }[]> = {
  platform: [
    {
      t: 'Interactive HTML lessons',
      d: 'Full-bleed article layouts with media, diagrams, and live widgets — not trapped in a 16:9 box.',
    },
    {
      t: 'Auto-graded knowledge checks',
      d: 'Multiple choice, matching, sequencing, short answers, and polls with instant feedback.',
    },
    {
      t: 'Hands-on labs with rubrics',
      d: 'Multi-section labs, evidence drawers, and clear expected outcomes for each step.',
    },
  ],
  security: [
    {
      t: 'Before opening a wallet',
      d: 'Update your device, use a screen lock, and reach the wallet from a bookmarked official source — not a link in a message.',
    },
    {
      t: 'Before signing or sending',
      d: 'Read the network, recipient, amount, approval scope, and fee. When unsure, cancel and research from a trusted source.',
    },
    {
      t: 'After a transaction',
      d: 'Record what happened, check its status, and revoke unnecessary token approvals where your network supports that control.',
    },
  ],
};

export function AccordionWidget({ preset }: { preset?: string }) {
  const items = ACCORDION_PRESETS[preset || 'platform'] || ACCORDION_PRESETS.platform;
  const [open, setOpen] = useState(0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {items.map((item, i) => {
        const on = open === i;
        return (
          <div key={item.t} className={i > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}>
            <button
              type="button"
              onClick={() => setOpen(on ? -1 : i)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="text-sm font-bold text-slate-900 dark:text-white">{item.t}</span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition dark:bg-indigo-950 dark:text-indigo-300 ${
                  on ? 'rotate-45' : ''
                }`}
              >
                +
              </span>
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ${
                on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.d}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* —— Carousel —— */
const CAROUSEL_PRESETS: Record<string, { title: string; body: string }[]> = {
  reentrancy: [
    {
      title: '1 · Find the vulnerable call',
      body: 'External value transfer happens before the balance is zeroed — the classic reentrancy window.',
    },
    {
      title: '2 · Attacker re-enters',
      body: 'The malicious contract’s fallback calls withdraw again while the old balance is still readable.',
    },
    {
      title: '3 · Drain & remediate',
      body: 'Funds leave repeatedly. Fix: Checks → Effects → Interactions. Update state before external calls.',
    },
  ],
  confirm: [
    {
      title: '1 · Broadcast',
      body: 'A signed transaction is shared with network peers and enters the mempool.',
    },
    {
      title: '2 · Validate',
      body: 'Nodes check signatures, balances, and protocol rules before inclusion.',
    },
    {
      title: '3 · Confirm',
      body: 'The tx lands in a block. Extra confirmations deepen confidence in finality.',
    },
  ],
};

export function CarouselWidget({ preset }: { preset?: string }) {
  const slides = CAROUSEL_PRESETS[preset || 'confirm'] || CAROUSEL_PRESETS.confirm;
  const [i, setI] = useState(0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="relative min-h-[160px] bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white">
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">
          Step simulator
        </div>
        <h4 className="text-xl font-black tracking-tight">{slides[i].title}</h4>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-200">{slides[i].body}</p>
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            type="button"
            onClick={() => setI((v) => (v - 1 + slides.length) % slides.length)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setI((v) => (v + 1) % slides.length)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex justify-center gap-1.5 bg-slate-50 px-4 py-3 dark:bg-slate-950">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setI(idx)}
            className={`h-1.5 cursor-pointer rounded-full transition-all ${
              idx === i ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-300 dark:bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* —— Timeline —— */
const TIMELINE_PRESETS: Record<string, { y: string; t: string; d: string }[]> = {
  blockchain: [
    { y: '2008', t: 'Bitcoin whitepaper', d: 'Peer-to-peer electronic cash without trusted intermediaries.' },
    { y: '2015', t: 'Ethereum launch', d: 'General-purpose smart contracts and programmable money.' },
    { y: '2020+', t: 'DeFi summer', d: 'Composable protocols for lending, trading, and yield.' },
    { y: 'Today', t: 'Institutional rails', d: 'Custody, L2 scaling, and real-world asset experiments.' },
  ],
  'wallet-setup': [
    { y: '01', t: 'Install', d: 'Download only from a verified official source.' },
    { y: '02', t: 'Back up', d: 'Write the recovery phrase offline — never store it in cloud photos.' },
    { y: '03', t: 'Receive', d: 'Accept a tiny test amount on the correct network.' },
    { y: '04', t: 'Review', d: 'Double-check every network and address before larger moves.' },
  ],
  'send-flow': [
    { y: '01', t: 'Copy', d: 'Pull the destination address from a trusted source — not a DM.' },
    { y: '02', t: 'Compare', d: 'Check the first and last characters after pasting.' },
    { y: '03', t: 'Select', d: 'Confirm the intended asset and network.' },
    { y: '04', t: 'Send', d: 'Broadcast a tiny amount, then wait for confirmation.' },
  ],
};

export function TimelineWidget({ preset }: { preset?: string }) {
  const events = TIMELINE_PRESETS[preset || 'blockchain'] || TIMELINE_PRESETS.blockchain;

  return (
    <div className="relative space-y-0 pl-2">
      <div className="absolute bottom-2 left-[19px] top-2 w-0.5 bg-gradient-to-b from-indigo-500 via-violet-400 to-emerald-400" />
      {events.map((e) => (
        <div key={`${e.y}-${e.t}`} className="relative flex gap-4 pb-6 last:pb-0">
          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-indigo-200 bg-white text-[10px] font-black text-indigo-700 shadow-sm dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-300">
            {e.y}
          </div>
          <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-black text-slate-900 dark:text-white">{e.t}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{e.d}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* —— Mermaid —— */
export function MermaidWidget({ chart }: { chart?: string }) {
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const definition =
    chart ||
    `flowchart LR
  A[User signs tx] --> B[Mempool]
  B --> C[Validators / miners]
  C --> D[New block]
  D --> E[Network sync]
  E --> F[Confirmed ledger]`;

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
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm">
      <div ref={ref} className="flex min-h-[140px] items-center justify-center" />
    </div>
  );
}

/* —— Pie / doughnut chart —— */
export function PieChartWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Community', 'Team', 'Treasury', 'Liquidity'],
        datasets: [
          {
            data: [45, 20, 20, 15],
            backgroundColor: ['#4f46e5', '#0d9488', '#f59e0b', '#e11d48'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Outfit' } } },
        },
        cutout: '58%',
      },
    });
    return () => chart.destroy();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mx-auto max-w-xs">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

/* —— YouTube —— */
export function YTVideoWidget({ videoId }: { videoId?: string }) {
  const id = videoId || 'l9jOJkAKUTc';
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-lg">
      <div className="relative aspect-video">
        <iframe
          title="Lesson video"
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        <Play className="h-3.5 w-3.5 text-indigo-400" />
        Embedded briefing
      </div>
    </div>
  );
}

/* —— Course widget iframe (from widgets/) —— */
export function CourseWidgetFrame({
  courseFolder,
  widgetId,
}: {
  courseFolder: string;
  widgetId: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0f1419] shadow-xl">
      <iframe
        title={widgetId}
        src={`http://127.0.0.1:8765/courses/${courseFolder}/widgets/${widgetId}/index.html`}
        className="block h-[300px] w-full border-0"
      />
    </div>
  );
}

export function PortalsRenderer({
  stageId,
  htmlContent,
  courseFolder,
}: {
  stageId: string;
  htmlContent: string;
  courseFolder: string;
}) {
  const [portals, setPortals] = useState<
    Array<{
      element: HTMLElement;
      type: string;
      videoId?: string;
      widgetId?: string;
      chart?: string;
      preset?: string;
    }>
  >([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stage = document.getElementById(stageId);
      if (!stage) return;
      const found: typeof portals = [];
      stage.querySelectorAll('[data-component]').forEach((el) => {
        found.push({
          element: el as HTMLElement,
          type: el.getAttribute('data-component') || '',
          videoId: el.getAttribute('data-video-id') || undefined,
          widgetId: el.getAttribute('data-widget-id') || undefined,
          chart: el.getAttribute('data-chart') || undefined,
          preset: el.getAttribute('data-preset') || undefined,
        });
      });
      setPortals(found);
    }, 40);
    return () => {
      window.clearTimeout(timer);
      setPortals([]);
    };
  }, [htmlContent, stageId]);

  return (
    <>
      {portals.map((p, idx) => {
        let node: ReactNode = null;
        switch (p.type) {
          case 'flipcards':
            node = <FlipCardsWidget />;
            break;
          case 'accordion':
            node = <AccordionWidget preset={p.preset} />;
            break;
          case 'carousel':
            node = <CarouselWidget preset={p.preset} />;
            break;
          case 'timeline':
            node = <TimelineWidget preset={p.preset} />;
            break;
          case 'mermaid-graph':
            node = <MermaidWidget chart={p.chart} />;
            break;
          case 'pie-chart':
            node = <PieChartWidget />;
            break;
          case 'yt-video':
            node = <YTVideoWidget videoId={p.videoId} />;
            break;
          case 'course-widget':
            if (p.widgetId) node = <CourseWidgetFrame courseFolder={courseFolder} widgetId={p.widgetId} />;
            break;
          default:
            node = null;
        }
        if (!node) return null;
        return createPortal(node, p.element, `${p.type}-${idx}`);
      })}
    </>
  );
}
