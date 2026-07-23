import { Fragment, type ReactNode } from 'react';

type Cell = boolean | string;

type Row = { feature: string; free: Cell; startup: Cell; team: Cell; enterprise: Cell };

type Section = { title: string; rows: Row[] };

const PLANS = ['Free', 'Startup', 'Team', 'Enterprise'] as const;

const MATRIX: Section[] = [
  {
    title: 'Financial data',
    rows: [
      { feature: 'Open/High/Low/Close', free: true, startup: true, team: true, enterprise: true },
      {
        feature: 'Price-volume difference indicator',
        free: false,
        startup: true,
        team: true,
        enterprise: true,
      },
    ],
  },
  {
    title: 'On-chain data',
    rows: [
      { feature: 'Network growth', free: true, startup: false, team: true, enterprise: true },
      { feature: 'Average token age consumed', free: true, startup: false, team: true, enterprise: true },
      { feature: 'Exchange flow', free: false, startup: false, team: true, enterprise: true },
      { feature: 'Total ERC20 exchange funds flow', free: false, startup: false, team: true, enterprise: true },
      { feature: 'Transaction volume', free: true, startup: true, team: true, enterprise: true },
      { feature: 'Total circulation (beta)', free: false, startup: true, team: true, enterprise: true },
      { feature: 'Velocity of tokens (beta)', free: true, startup: true, team: false, enterprise: true },
      { feature: 'ETH gas used', free: false, startup: true, team: true, enterprise: true },
    ],
  },
  {
    title: 'Social data',
    rows: [
      { feature: 'Dev activity', free: false, startup: true, team: false, enterprise: true },
      { feature: 'Topic search', free: true, startup: true, team: true, enterprise: true },
      { feature: 'Relative social dominance', free: false, startup: false, team: true, enterprise: true },
      { feature: 'Total social volume', free: true, startup: true, team: false, enterprise: true },
    ],
  },
];

const STICKY: Section[] = [
  {
    title: 'General',
    rows: [
      { feature: 'Number of seats', free: '1', startup: 'Up to 3', team: 'Up to 10', enterprise: 'Unlimited' },
      { feature: 'Storage', free: '15 GB', startup: '1 TB', team: '15 TB', enterprise: 'Unlimited' },
      { feature: 'Email sharing', free: true, startup: true, team: true, enterprise: true },
      { feature: 'Any time, anywhere access', free: false, startup: true, team: true, enterprise: true },
    ],
  },
  {
    title: 'Financial data',
    rows: [
      { feature: 'Open/High/Low/Close', free: false, startup: false, team: true, enterprise: true },
      {
        feature: 'Price-volume difference indicator',
        free: false,
        startup: true,
        team: true,
        enterprise: true,
      },
    ],
  },
  {
    title: 'On-chain data',
    rows: [
      { feature: 'Network growth', free: false, startup: false, team: true, enterprise: true },
      { feature: 'Average token age consumed', free: false, startup: true, team: true, enterprise: true },
      { feature: 'Exchange flow', free: false, startup: false, team: false, enterprise: true },
      { feature: 'Total ERC20 exchange funds flow', free: false, startup: true, team: true, enterprise: true },
      { feature: 'Transaction volume', free: false, startup: false, team: true, enterprise: true },
      { feature: 'Total circulation (beta)', free: false, startup: true, team: false, enterprise: true },
      { feature: 'Velocity of tokens (beta)', free: false, startup: false, team: false, enterprise: true },
      { feature: 'ETH gas used', free: false, startup: true, team: true, enterprise: true },
    ],
  },
  {
    title: 'Social data',
    rows: [
      { feature: 'Dev activity', free: false, startup: false, team: true, enterprise: true },
      { feature: 'Topic search', free: false, startup: true, team: true, enterprise: true },
      { feature: 'Relative social dominance', free: false, startup: false, team: false, enterprise: true },
    ],
  },
];

const PLAN_META = [
  { name: 'Free', note: 'Free forever' },
  { name: 'Startup', note: '$39 / month billed annually' },
  { name: 'Team', note: '$89 / month billed annually' },
  { name: 'Enterprise', note: '$149 / month billed annually' },
];

function Check() {
  return (
    <svg className="hc-cmp__icon is-yes" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Yes">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Minus() {
  return (
    <svg className="hc-cmp__icon is-no" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="No">
      <path d="M5 12h14" />
    </svg>
  );
}

function CellValue({ value }: { value: Cell }) {
  if (typeof value === 'boolean') return value ? <Check /> : <Minus />;
  return <span className="hc-cmp__text">{value}</span>;
}

function MatrixTable({ sections }: { sections: Section[] }) {
  return (
    <div className="hc-cmp hc-cmp--matrix">
      <table>
        <thead>
          <tr>
            <th scope="col">Plans</th>
            {PLANS.map((p) => (
              <th key={p} scope="col">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.title}>
              <tr className="hc-cmp__section">
                <th colSpan={5} scope="colgroup">
                  {section.title}
                </th>
              </tr>
              {section.rows.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  <td>
                    <CellValue value={row.free} />
                  </td>
                  <td>
                    <CellValue value={row.startup} />
                  </td>
                  <td>
                    <CellValue value={row.team} />
                  </td>
                  <td>
                    <CellValue value={row.enterprise} />
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StickyCompare({ sections }: { sections: Section[] }) {
  return (
    <div className="hc-cmp hc-cmp--sticky">
      <div className="hc-cmp__sticky-head">
        <div className="hc-cmp__feat-col">
          <span className="hc-cmp__head-label">Features</span>
        </div>
        {PLAN_META.map((p) => (
          <div key={p.name} className="hc-cmp__plan-col">
            <span className="hc-cmp__head-label">{p.name}</span>
            <span className="hc-cmp__head-note">{p.note}</span>
          </div>
        ))}
      </div>

      {sections.map((section) => (
        <div key={section.title} className="hc-cmp__block">
          <div className="hc-cmp__block-title">{section.title}</div>
          {section.rows.map((row) => (
            <div key={row.feature} className="hc-cmp__row">
              <div className="hc-cmp__feat-col">{row.feature}</div>
              <div className="hc-cmp__plan-col">
                <CellValue value={row.free} />
              </div>
              <div className="hc-cmp__plan-col">
                <CellValue value={row.startup} />
              </div>
              <div className="hc-cmp__plan-col">
                <CellValue value={row.team} />
              </div>
              <div className="hc-cmp__plan-col">
                <CellValue value={row.enterprise} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ComparePlansWidget({ preset }: { preset?: string }) {
  const mode = preset === 'sticky' ? 'sticky' : 'matrix';
  let body: ReactNode;
  if (mode === 'sticky') body = <StickyCompare sections={STICKY} />;
  else body = <MatrixTable sections={MATRIX} />;

  return (
    <div className="hc-cmp-wrap">
      <div className="hc-cmp-wrap__title">
        <h3>Compare plans</h3>
        <p>Whatever your status, offers evolve according to your needs.</p>
      </div>
      {body}
    </div>
  );
}
