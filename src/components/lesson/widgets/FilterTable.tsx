import { useMemo, useState } from 'react';
import { ExpandableShell } from '../ExpandableShell';

const ROWS = [
  { network: 'Bitcoin', type: 'PoW', tps: '~7', finality: 'Probabilistic', fees: 'sats/vByte' },
  { network: 'Ethereum', type: 'PoS', tps: '~15–30 L1', finality: 'Epoch-based', fees: 'gwei' },
  { network: 'Solana', type: 'PoS+', tps: 'High', finality: 'Fast slots', fees: 'lamports' },
  { network: 'Lightning', type: 'L2/Payment', tps: 'Very high', finality: 'Off-chain', fees: 'routing' },
  { network: 'Arbitrum', type: 'Optimistic L2', tps: 'High', finality: 'Challenge window', fees: 'ETH' },
];

export function FilterTableWidget() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const types = useMemo(() => ['all', ...Array.from(new Set(ROWS.map((r) => r.type)))], []);
  const rows = ROWS.filter((r) => {
    const matchQ =
      !q ||
      r.network.toLowerCase().includes(q.toLowerCase()) ||
      r.type.toLowerCase().includes(q.toLowerCase());
    return matchQ && (type === 'all' || r.type === type);
  });

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
            <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-700">
              <th className="px-2 py-2">Network</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Throughput</th>
              <th className="px-2 py-2">Finality</th>
              <th className="px-2 py-2">Fees</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.network}
                className="border-b border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-300"
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
