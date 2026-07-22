import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { ExpandableShell } from '../ExpandableShell';

type Row = {
  network: string;
  type: string;
  tps: string;
  finality: string;
  fees: string;
};

const ROWS: Row[] = [
  { network: 'Bitcoin', type: 'PoW', tps: '~7', finality: 'Probabilistic', fees: 'sats/vByte' },
  { network: 'Ethereum', type: 'PoS', tps: '~15–30 L1', finality: 'Epoch-based', fees: 'gwei' },
  { network: 'Solana', type: 'PoS+', tps: 'High', finality: 'Fast slots', fees: 'lamports' },
  { network: 'Lightning', type: 'L2/Payment', tps: 'Very high', finality: 'Off-chain', fees: 'routing' },
  { network: 'Arbitrum', type: 'Optimistic L2', tps: 'High', finality: 'Challenge window', fees: 'ETH' },
];

type Col = keyof Row;

export function FilterTableWidget() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [sortKey, setSortKey] = useState<Col>('network');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const types = useMemo(() => ['all', ...Array.from(new Set(ROWS.map((r) => r.type)))], []);

  const rows = useMemo(() => {
    const filtered = ROWS.filter((r) => {
      const matchQ =
        !q ||
        r.network.toLowerCase().includes(q.toLowerCase()) ||
        r.type.toLowerCase().includes(q.toLowerCase());
      return matchQ && (type === 'all' || r.type === type);
    });
    const sorted = [...filtered].sort((a, b) => {
      const av = String(a[sortKey]).toLowerCase();
      const bv = String(b[sortKey]).toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [q, type, sortKey, sortDir]);

  const toggleSort = (key: Col) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: Col }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const th = (col: Col, label: string) => (
    <th className="px-2 py-2">
      <button
        type="button"
        onClick={() => toggleSort(col)}
        className="inline-flex cursor-pointer items-center gap-1 font-black uppercase tracking-wider hover:text-indigo-600 dark:hover:text-indigo-400"
      >
        {label}
        <SortIcon col={col} />
      </button>
    </th>
  );

  return (
    <ExpandableShell title="Network comparison" bodyClassName="p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter networks…"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {t === 'all' ? 'All types' : t}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] text-slate-500 dark:border-slate-700">
              {th('network', 'Network')}
              {th('type', 'Type')}
              {th('tps', 'Throughput')}
              {th('finality', 'Finality')}
              {th('fees', 'Fees')}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.network}
                className="border-b border-slate-100 text-slate-700 transition hover:bg-indigo-50/50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/30"
              >
                <td className="px-2 py-2.5 font-bold text-slate-900 dark:text-white">{r.network}</td>
                <td className="px-2 py-2.5">{r.type}</td>
                <td className="px-2 py-2.5">{r.tps}</td>
                <td className="px-2 py-2.5">{r.finality}</td>
                <td className="px-2 py-2.5 font-mono text-xs">{r.fees}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-slate-400">
                  No networks match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ExpandableShell>
  );
}
