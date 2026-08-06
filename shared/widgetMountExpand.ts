/**
 * Expand empty demo mounts into editable [data-item] HTML.
 * Used by scripts/expandDemoWidgetMounts.ts and as the canonical template shape.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function itemOpen(attrs: Record<string, string | undefined>): string {
  const parts = Object.entries(attrs)
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(([k, v]) => `${k}="${escapeHtml(String(v))}"`);
  return `<div data-item ${parts.join(' ')}>`;
}

function itemClose(): string {
  return '</div>';
}

function pTag(dataAttr: string, content: string): string {
  if (!content) return '';
  return `<p ${dataAttr}>${escapeHtml(content)}</p>`;
}

function itemsHtml(blocks: string[]): string {
  return `\n${blocks.join('\n')}\n`;
}

export function expandAccordion(preset?: string): string {
  const sets: Record<string, { t: string; d: string }[]> = {
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
  const list = sets[preset || 'platform'] || sets.platform;
  return itemsHtml(
    list.map(
      (it) =>
        `${itemOpen({ 'data-title': it.t })}${pTag('data-body', it.d)}${itemClose()}`,
    ),
  );
}

export function expandTimelineSteps(preset: string): string {
  const sets: Record<string, { y: string; t: string; d: string }[]> = {
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
  const list = sets[preset] || sets['wallet-setup'];
  return itemsHtml(
    list.map(
      (it) =>
        `${itemOpen({ 'data-y': it.y, 'data-title': it.t })}${pTag('data-body', it.d)}${itemClose()}`,
    ),
  );
}

export function expandTimelineDetail(): string {
  const list = [
    {
      y: '2008',
      t: 'Bitcoin Whitepaper',
      subtitle: 'The Genesis Moment (2008)',
      body: 'Satoshi Nakamoto publishes the foundational whitepaper, proposing a fully decentralized peer-to-peer cash network using Proof-of-Work to solve the double-spending problem.',
      extra:
        'No central bank, no trusted clearinghouses. It combined cryptography, digital signatures, and decentralized consensus into a single secure ledger architecture.',
    },
    {
      y: '2015',
      t: 'Ethereum Launch',
      subtitle: 'Programmable Money',
      body: 'Ethereum goes live with a general-purpose virtual machine, unlocking smart contracts beyond simple payments.',
      extra: 'Developers can now encode agreements, tokens, and applications that run on shared infrastructure.',
    },
    {
      y: '2020+',
      t: 'DeFi Summer',
      subtitle: 'Composable Finance',
      body: 'Lending, AMMs, and yield protocols compose like Lego — capital and risk move at internet speed.',
      extra: 'The boom also taught hard lessons about audits, oracles, and economic exploits.',
    },
    {
      y: 'Today',
      t: 'Institutional Rails',
      subtitle: 'Scale & Custody',
      body: 'L2 networks, regulated custody, and real-world asset experiments bridge crypto with traditional finance.',
      extra: 'The core idea remains: a shared, verifiable ledger without a single operator.',
    },
  ];
  return itemsHtml(
    list.map(
      (it) =>
        `${itemOpen({ 'data-y': it.y, 'data-title': it.t, 'data-subtitle': it.subtitle })}${pTag('data-body', it.body)}${pTag('data-extra', it.extra)}${itemClose()}`,
    ),
  );
}

export function expandTimelineTrail(): string {
  const list = [
    {
      id: 'discover',
      title: 'Discover',
      tipTitle: 'Start from a trusted entry',
      tipSub: 'Step 1 of the trail',
      tipBody:
        'Open the wallet from a bookmark you created yourself — never from a cold search result or DM link.',
      tipItems: ['Official store / vendor', 'Bookmark the real URL', 'Ignore lookalike domains'],
    },
    {
      id: 'verify',
      title: 'Verify',
      tipTitle: 'Confirm network & asset',
      tipSub: 'Step 2 of the trail',
      tipBody: 'Match the network badge and ticker before you touch amounts. Wrong chain = stuck or lost funds.',
      tipItems: ['Network badge visible', 'Asset ticker matches', 'Cancel if anything feels off'],
    },
    {
      id: 'address',
      title: 'Address',
      tipTitle: 'Paste, then re-check',
      tipSub: 'Step 3 of the trail',
      tipBody: 'Paste the destination once, then compare the first and last characters against your notes.',
      tipItems: ['Prefer paste over typing', 'Check first 4 + last 4', 'No address from strangers'],
    },
    {
      id: 'amount',
      title: 'Amount',
      tipTitle: 'Start tiny on new paths',
      tipSub: 'Step 4 of the trail',
      tipBody: 'Send a dust-sized test first when the destination is new. Scale up only after confirmation.',
      tipItems: ['Leave room for fees', 'Test before large sends', 'Note the tx hash'],
    },
    {
      id: 'review',
      title: 'Review',
      tipTitle: 'Read the preview twice',
      tipSub: 'Step 5 of the trail',
      tipBody: 'Asset, network, amount, fee, and recipient must match your intent. Anything odd → cancel.',
      tipItems: ['Recipient matches', 'Fee understood', 'No seed phrase fields'],
    },
    {
      id: 'sign',
      title: 'Sign',
      tipTitle: 'Approve only when sure',
      tipSub: 'Step 6 of the trail',
      tipBody:
        'Signing proves authority. After broadcast, watch the explorer until you trust the confirmation depth.',
      tipItems: ['Hardware confirm if used', 'Save the hash', 'Wait for confirmations'],
    },
  ];
  return itemsHtml(
    list.map((it) => {
      const tips = it.tipItems.map((t) => `<li data-tip-item>${escapeHtml(t)}</li>`).join('');
      return `${itemOpen({
        'data-id': it.id,
        'data-title': it.title,
        'data-tip-title': it.tipTitle,
        'data-tip-sub': it.tipSub,
      })}${pTag('data-body', it.tipBody)}<ul data-tip-items>${tips}</ul>${itemClose()}`;
    }),
  );
}

type TabItem = { label: string; title: string; body: string; icon?: string };

const TAB_PRESETS: Record<string, { style?: string; orientation?: string; items: TabItem[] }> = {
  ownership: {
    style: 'default',
    orientation: 'horizontal',
    items: [
      {
        label: 'Keys',
        title: 'Private keys authorize',
        body: 'A private key (or seed phrase) is the secret that signs transactions. Treat it like the deed to digital property — never share it.',
        icon: 'key-round',
      },
      {
        label: 'Addresses',
        title: 'Addresses receive',
        body: 'A public address is safe to share. It identifies where funds can arrive without revealing the authorizing secret.',
        icon: 'map-pin',
      },
      {
        label: 'Custody',
        title: 'Who holds the keys?',
        body: 'Self-custody means you hold the secret. Custodial services hold it for you — convenient, but “not your keys, not your coins.”',
        icon: 'shield',
      },
    ],
  },
  layers: {
    style: 'default',
    orientation: 'vertical',
    items: [
      {
        label: 'Settlement',
        title: 'Layer 1 settlement',
        body: 'Base chains finalize ownership with strong security assumptions and global consensus.',
        icon: 'layers',
      },
      {
        label: 'Scaling',
        title: 'Layer 2 throughput',
        body: 'Rollups and side systems batch activity, then settle proofs or state back to L1 for security.',
        icon: 'boxes',
      },
      {
        label: 'Apps',
        title: 'Application layer',
        body: 'Wallets, DEXs, and protocols are the interfaces users touch — still bound by underlying ledger rules.',
        icon: 'app-window',
      },
    ],
  },
  underline: {
    style: 'underline',
    items: [
      {
        label: 'Overview',
        title: 'Account overview',
        body: 'Balances, recent activity, and network status in one place — the default home most professional wallets open to.',
        icon: 'app-window',
      },
      {
        label: 'Activity',
        title: 'Transaction history',
        body: 'Confirmed sends and receives with explorer links when available — your audit trail for this account.',
        icon: 'link-2',
      },
      {
        label: 'Settings',
        title: 'Preferences & security',
        body: 'Networks, contacts, and lock timers live here. Change carefully; small misconfigs cause big confusion later.',
        icon: 'shield',
      },
    ],
  },
  pills: {
    style: 'pills',
    items: [
      {
        label: 'Hot',
        title: 'Hot wallet',
        body: 'Connected to the internet for daily use. Convenient for small balances and frequent activity.',
        icon: 'wallet',
      },
      {
        label: 'Cold',
        title: 'Cold / hardware',
        body: 'Keys stay offline until you deliberately sign. Best for long-term storage and larger amounts.',
        icon: 'lock',
      },
      {
        label: 'Multi-sig',
        title: 'Shared control',
        body: 'Multiple keys must approve. Used by teams and treasuries to reduce single-point-of-failure risk.',
        icon: 'shield',
      },
    ],
  },
  'icon-line': {
    style: 'icon-line',
    items: [
      {
        label: 'Connect',
        title: 'Connect wallet',
        body: 'Link a wallet so the app can read balances and request signatures — never your seed phrase.',
        icon: 'link-2',
      },
      {
        label: 'Review',
        title: 'Review the ask',
        body: 'Read network, spender, and permission scope before you approve anything on-chain.',
        icon: 'shield',
      },
      {
        label: 'Confirm',
        title: 'Confirm on device',
        body: 'Hardware and mobile prompts are your last checkpoint — cancel if the details look wrong.',
        icon: 'key-round',
      },
    ],
  },
  'side-nav': {
    style: 'side-nav',
    orientation: 'vertical',
    items: [
      {
        label: 'Portfolio',
        title: 'Holdings snapshot',
        body: 'Assets across networks with rough USD marks — useful for orientation, not tax reporting.',
        icon: 'wallet',
      },
      {
        label: 'Networks',
        title: 'Network switcher',
        body: 'Each chain has its own fees and addresses. Always confirm the badge before sending.',
        icon: 'network',
      },
      {
        label: 'Security',
        title: 'Lock & recovery',
        body: 'Auto-lock timers, biometrics, and recovery reminders keep everyday use safer.',
        icon: 'lock',
      },
    ],
  },
  wallets: {
    style: 'card-top',
    items: [
      {
        label: 'Browser',
        title: 'Extension wallets',
        body: 'Fast for DeFi and NFTs in the browser. Keep only what you need for active sessions.',
        icon: 'app-window',
      },
      {
        label: 'Mobile',
        title: 'Phone wallets',
        body: 'On-the-go payments and scans. Protect the device like you protect the keys.',
        icon: 'wallet',
      },
      {
        label: 'Hardware',
        title: 'Dedicated devices',
        body: 'Sign offline with a secure element. Pair with a watch-only or software companion for convenience.',
        icon: 'lock',
      },
    ],
  },
  networks: {
    style: 'card-left',
    orientation: 'vertical',
    items: [
      {
        label: 'Mainnet',
        title: 'Production networks',
        body: 'Real value moves here. Fees and finality rules differ by chain — learn them before sizing up.',
        icon: 'network',
      },
      {
        label: 'Testnet',
        title: 'Practice lanes',
        body: 'Faucet funds, same workflows, no real money. Perfect for first sends and dApp dry-runs.',
        icon: 'layers',
      },
      {
        label: 'L2',
        title: 'Scaling networks',
        body: 'Lower fees and faster UX while still settling security back to a base chain.',
        icon: 'boxes',
      },
    ],
  },
  compare: {
    style: 'compare',
    items: [
      {
        label: 'Self-custody',
        title: 'You hold the keys',
        body: 'Maximum control and responsibility. Recovery is yours alone — backups matter.',
        icon: 'key-round',
      },
      {
        label: 'Custodial',
        title: 'A service holds keys',
        body: 'Password resets and support desks exist — counterparty and platform risk come with that.',
        icon: 'shield',
      },
      {
        label: 'Hybrid',
        title: 'Split the risk',
        body: 'Spend wallets online, vaults offline or multi-sig. Match custody to balance size.',
        icon: 'layers',
      },
    ],
  },
};

export function expandTabs(preset?: string): string {
  const conf = TAB_PRESETS[preset || 'ownership'] || TAB_PRESETS.ownership;
  return itemsHtml(
    conf.items.map(
      (it) =>
        `${itemOpen({
          'data-label': it.label,
          'data-title': it.title,
          'data-icon': it.icon,
        })}${pTag('data-body', it.body)}${itemClose()}`,
    ),
  );
}

export function tabMeta(preset?: string): { style?: string; orientation?: string } {
  const conf = TAB_PRESETS[preset || 'ownership'] || TAB_PRESETS.ownership;
  return { style: conf.style, orientation: conf.orientation };
}

export function expandChecklist(preset?: string): string {
  const sets: Record<string, { title: string; items: { label: string; hint?: string }[] }> = {
    send: {
      title: 'Before you send',
      items: [
        { label: 'Recipient address verified (first & last characters)' },
        { label: 'Correct network selected' },
        { label: 'Amount is a deliberate test size' },
        { label: 'Fee is understood before signing' },
        { label: 'No seed phrase was typed into any website' },
      ],
    },
    wallet: {
      title: 'Wallet hardening',
      items: [
        { label: 'Installed from an official source', hint: 'Store or vendor site only' },
        { label: 'Recovery phrase written offline', hint: 'Paper / metal — never a screenshot' },
        { label: 'Screen lock enabled on device', hint: 'PIN, biometrics, or both' },
        { label: 'Bookmarked the real wallet URL', hint: 'Avoid search-result phishing' },
      ],
    },
    guided: {
      title: 'First send checklist',
      items: [
        { label: 'Open wallet from your bookmark', hint: 'Not a search result' },
        { label: 'Confirm network badge', hint: 'Mainnet vs testnet' },
        { label: 'Paste the recipient address', hint: 'Match first/last chars' },
        { label: 'Enter a small test amount', hint: 'Dust-sized first transfer' },
        { label: 'Review fee, then approve', hint: 'Cancel if anything looks off' },
      ],
    },
  };
  const conf = sets[preset || 'send'] || sets.send;
  const blocks = conf.items.map(
    (it) => `${itemOpen({ 'data-label': it.label, 'data-hint': it.hint })}${itemClose()}`,
  );
  return `\n<!-- checklist title via data-title on host -->\n${blocks.join('\n')}\n`;
}

export function checklistTitle(preset?: string): string {
  const map: Record<string, string> = {
    send: 'Before you send',
    wallet: 'Wallet hardening',
    guided: 'First send checklist',
  };
  return map[preset || 'send'] || map.send;
}

type FlipCard = {
  front: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  icon?: string;
  accent?: string;
  image?: string;
};

export function expandFlipcards(preset?: string): string {
  const grid: FlipCard[] = [
    {
      front: 'Hash function',
      eyebrow: 'Integrity',
      title: 'Cryptographic hash',
      subtitle: 'One-way fingerprint',
      body: 'Maps any input to a fixed-length digest. A tiny change avalanches into a totally different output — perfect for tamper evidence.',
      icon: 'hash',
      accent: 'from-sky-500 to-cyan-600',
    },
    {
      front: 'Private key',
      eyebrow: 'Authority',
      title: 'Private key',
      subtitle: 'Signing secret',
      body: 'Secret material that authorizes spends. Anyone who holds it can move the associated funds — never share or screenshot it.',
      icon: 'key',
      accent: 'from-rose-500 to-orange-500',
    },
    {
      front: 'Public address',
      eyebrow: 'Receive',
      title: 'Public address',
      subtitle: 'Safe to publish',
      body: 'Derived from keys and used only to receive. Share it like an account number — it cannot authorize an outgoing spend by itself.',
      icon: 'fingerprint',
      accent: 'from-emerald-500 to-teal-600',
    },
    {
      front: 'Consensus',
      eyebrow: 'Agreement',
      title: 'Network consensus',
      subtitle: 'Shared history',
      body: 'How peers agree on one ledger tip without a central referee — the foundation of decentralized settlement.',
      icon: 'network',
      accent: 'from-violet-500 to-indigo-600',
    },
  ];
  const icons: FlipCard[] = [
    {
      front: 'Seed phrase',
      eyebrow: 'Backup',
      title: 'Recovery phrase',
      subtitle: 'Human-readable secret',
      body: 'Usually 12 or 24 words that regenerate your keys. Write it offline, store it safely, never type it into a website.',
      icon: 'lock',
      accent: 'from-teal-500 to-emerald-600',
    },
    {
      front: 'Hot wallet',
      eyebrow: 'Access',
      title: 'Software wallet',
      subtitle: 'Connected to the net',
      body: 'Convenient for day-to-day amounts. Keep only what you need online; move larger balances to colder storage.',
      icon: 'wallet',
      accent: 'from-indigo-500 to-violet-600',
    },
  ];
  const rich: FlipCard[] = [
    {
      front: 'What is finality?',
      eyebrow: 'Rich flip · topic card',
      title: 'Finality, in practice',
      subtitle: 'Definitions & checklist',
      body: 'Finality is confidence that a confirmed transaction will not be reversed under normal network assumptions. Probabilistic chains deepen confidence with each block; some systems offer economic finality after a checkpoint.\n\nWait for the confirmations your risk model requires. Prefer reputable explorers for status, not random DMs. Large transfers: consider a test send first.\n\nKeep facilitator talking points on the back where scrolling is expected — glossary notes, caveats, and longer explanations without leaving the slide.',
      icon: 'shield',
      accent: 'from-teal-700 to-slate-900',
    },
  ];
  const image: FlipCard[] = [
    {
      front: 'Distributed ledger',
      eyebrow: 'Image flip',
      title: 'How shared ledgers stay in sync',
      subtitle: 'Tap to read the long description',
      body: 'A blockchain is a replicated state machine: each honest peer applies the same ordered transactions and arrives at the same balances. Forks happen when peers temporarily disagree on the tip; consensus rules decide which history wins.\n\nLight clients may trust headers or proofs instead of downloading every byte. Full nodes verify everything they can.\n\nWhen you check a confirmation, you ask how deep your transaction sits under subsequent blocks — and therefore how expensive a reorganization would need to be to undo it.\n\nScroll continues here on purpose: put dense copy on the back where scrolling is expected.',
      icon: 'network',
      accent: 'from-slate-800 to-teal-900',
      image:
        'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=800&fit=crop&q=80',
    },
  ];
  const list =
    preset === 'icons' ? icons : preset === 'rich' ? rich : preset === 'image' ? image : grid;
  return itemsHtml(
    list.map(
      (it) =>
        `${itemOpen({
          'data-front': it.front,
          'data-eyebrow': it.eyebrow,
          'data-title': it.title,
          'data-subtitle': it.subtitle,
          'data-icon': it.icon,
          'data-accent': it.accent,
          ...(it.image ? { 'data-image': it.image } : {}),
        })}${pTag('data-body', it.body)}${itemClose()}`,
    ),
  );
}

export function expandFeatureTabs(): string {
  const tabs = [
    {
      id: 'workspace',
      title: 'All-in-one workspace',
      blurb: 'Create a business, whether you’ve got a fresh idea.',
      desktop:
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=750&fit=crop&q=80',
      mobile:
        'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=1200&fit=crop&q=80',
    },
    {
      id: 'automation',
      title: 'Automation on a whole new level',
      blurb: 'Use automation to scale campaigns profitably and save time doing it.',
      desktop:
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=750&fit=crop&q=80',
      mobile:
        'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&h=1200&fit=crop&q=80',
    },
    {
      id: 'teams',
      title: 'Solving problems for every team',
      blurb: 'One tool for your company to share knowledge and ship projects.',
      desktop:
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=750&fit=crop&q=80',
      mobile:
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=1200&fit=crop&q=80',
    },
  ];
  return itemsHtml(
    tabs.map(
      (it) =>
        `${itemOpen({
          'data-id': it.id,
          'data-title': it.title,
          'data-blurb': it.blurb,
          'data-desktop': it.desktop,
          'data-mobile': it.mobile,
        })}${itemClose()}`,
    ),
  );
}

export function expandRevealSteps(preset?: string): string {
  const sets: Record<string, { title: string; body: string }[]> = {
    'wallet-prepare': [
      {
        title: 'Verify the source',
        body: 'Type or use a trusted bookmark for the official wallet site or app store listing.',
      },
      {
        title: 'Create and back up',
        body: 'Write the phrase offline, in order. Never photograph it. Verify when the wallet asks.',
      },
      {
        title: 'Find receive',
        body: 'Select the correct asset and network, then copy the public receiving address.',
      },
    ],
  };
  const list = sets[preset || 'wallet-prepare'] || sets['wallet-prepare'];
  return itemsHtml(
    list.map(
      (it) =>
        `${itemOpen({ 'data-title': it.title })}${pTag('data-body', it.body)}${itemClose()}`,
    ),
  );
}

export function expandCompareSteps(_preset?: string): string {
  const steps = [
    {
      label: 'Purpose',
      btc: 'Digital cash / store of value with a fixed monetary policy.',
      eth: 'Programmable settlement layer for smart contracts and tokens.',
    },
    {
      label: 'Consensus',
      btc: 'Proof-of-Work mining secures the chain.',
      eth: 'Proof-of-Stake validators secure the chain.',
    },
    {
      label: 'Scripting',
      btc: 'Limited scripting focused on payments and covenants.',
      eth: 'Turing-complete EVM enables complex on-chain apps.',
    },
    {
      label: 'Fees',
      btc: 'Fee market for scarce block space (sats/vByte).',
      eth: 'Base fee + tip model (EIP-1559) with L2 scaling paths.',
    },
  ];
  return itemsHtml(
    steps.map(
      (it) =>
        `${itemOpen({
          'data-label': it.label,
          'data-btc': it.btc,
          'data-eth': it.eth,
        })}${itemClose()}`,
    ),
  );
}

export function expandStepShowcase(preset?: string): string {
  if (preset === 'compact-count') {
    const steps = [
      {
        title: 'Prepare the destination',
        body: 'Copy the receive address from the other wallet. Prefer paste over typing. Match the network badge.',
      },
      {
        title: 'Set a safe amount',
        body: 'Leave room for fees. For a first send to a new address, start with a dust-sized test.',
      },
      {
        title: 'Read the preview twice',
        body: 'Asset, network, amount, fee, and recipient must match your notes. Anything odd → cancel.',
      },
      {
        title: 'Sign only when sure',
        body: 'Approve on the device or in-app prompt. Save the transaction hash for the explorer check.',
      },
    ];
    return itemsHtml(
      steps.map(
        (it) =>
          `${itemOpen({ 'data-title': it.title })}${pTag('data-body', it.body)}${itemClose()}`,
      ),
    );
  }
  if (preset === 'code-walk') {
    const steps = [
      {
        title: 'Declare the payload',
        body: 'We start with a plain object that describes what we want to send. No network call yet — just data you can inspect.',
        file: 'demo.js · declare',
        code: '// Step 1 — shape the intent before signing\nconst transfer = {\n  asset: "ETH",\n  network: "mainnet",\n  to: "0xabc…",\n  amount: "0.05",\n};',
      },
      {
        title: 'Estimate the fee',
        body: 'Ask the provider for a fee suggestion. Surface it in the UI so the learner sees cost before commitment.',
        file: 'demo.js · fee',
        code: '// Step 2 — quote a fee the user can refuse\nconst fee = await estimateFee(transfer);\nconsole.log("max fee", fee.max);\nif (fee.max > budget) {\n  throw new Error("fee too high");\n}',
      },
      {
        title: 'Sign the transaction',
        body: 'Signing proves authority without revealing the private key to the dapp page. Keep this step explicit and cancellable.',
        file: 'demo.js · sign',
        code: '// Step 3 — user gesture required\nconst signed = await wallet.sign({\n  ...transfer,\n  fee,\n});\n// signed.raw is opaque hex — never edit by hand',
      },
      {
        title: 'Broadcast and watch',
        body: 'Push the signed payload to the network, then poll (or subscribe) until you see a confirmation depth you trust.',
        file: 'demo.js · send',
        code: '// Step 4 — publish, then verify on an explorer\nconst hash = await broadcast(signed.raw);\nawait waitForConfirmations(hash, 3);\necho "settled:", hash;',
      },
    ];
    return itemsHtml(
      steps.map(
        (it) =>
          `${itemOpen({ 'data-title': it.title, 'data-file': it.file })}${pTag('data-body', it.body)}<pre data-code>${escapeHtml(it.code)}</pre>${itemClose()}`,
      ),
    );
  }
  // icon-card (default)
  const iconSteps = [
    {
      title: 'Discover',
      cue: 'Step 1 · Find the path',
      body: 'Start from a trusted bookmark. Confirm the network and asset before you touch any form fields.',
    },
    {
      title: 'Broadcast',
      cue: 'Step 2 · Share the signed tx',
      body: 'Your wallet publishes the signed payload to peers. It sits in the mempool until a block includes it.',
    },
    {
      title: 'Validate',
      cue: 'Step 3 · Rules before rewards',
      body: 'Nodes check signatures, balances, and protocol rules. Invalid work is dropped without drama.',
    },
    {
      title: 'Confirm',
      cue: 'Step 4 · Depth builds trust',
      body: 'Inclusion in a block is the first win. Extra confirmations make a reorganization increasingly unlikely.',
    },
  ];
  return itemsHtml(
    iconSteps.map(
      (it) =>
        `${itemOpen({ 'data-title': it.title, 'data-cue': it.cue })}${pTag('data-body', it.body)}${itemClose()}`,
    ),
  );
}

export function expandProcessSteps(): string {
  const steps = [
    {
      title: 'Gather the facts',
      body: 'Asset, network, amount, and destination address — write them down before opening the wallet.',
    },
    {
      title: 'Simulate the send',
      body: 'Use a dry-run or a tiny test transfer when the destination is new or the amount is large.',
    },
    {
      title: 'Review the preview',
      body: 'Read fee, total debit, and any approval scope. Cancel if anything looks unfamiliar.',
    },
    {
      title: 'Sign and confirm',
      body: 'Approve only when the preview matches your notes. Record the tx hash for follow-up.',
    },
  ];
  return itemsHtml(
    steps.map(
      (it) =>
        `${itemOpen({ 'data-title': it.title })}${pTag('data-body', it.body)}${itemClose()}`,
    ),
  );
}

type StatExpand = {
  label?: string;
  value: string;
  decimals?: string;
  prefix?: string;
  suffix?: string;
  caption: string;
  badge?: string;
};

function statItemHtml(it: StatExpand, hero = false): string {
  return `${itemOpen({
    ...(hero ? { 'data-hero': 'true' } : {}),
    'data-label': it.label,
    'data-value': it.value,
    'data-decimals': it.decimals,
    'data-prefix': it.prefix,
    'data-suffix': it.suffix,
    'data-caption': it.caption,
    'data-badge': it.badge,
  })}${itemClose()}`;
}

export function expandMetricsStats(preset?: string): {
  inner: string;
  hostAttrs: Record<string, string>;
} {
  if (preset === 'featured') {
    const hero: StatExpand = {
      value: '92',
      suffix: '%',
      caption: 'of U.S. adults have bought from businesses using Space',
      badge: '+7% this month',
    };
    const items: StatExpand[] = [
      { value: '99.95', decimals: '2', suffix: '%', caption: 'in fulfilling orders' },
      { value: '2000', suffix: '+', caption: 'partner with HyperClass' },
      { value: '85', suffix: '%', caption: 'this year alone' },
    ];
    const heroEl = `<div data-hero data-value="${escapeHtml(hero.value)}" data-suffix="${escapeHtml(hero.suffix || '')}" data-caption="${escapeHtml(hero.caption)}" data-badge="${escapeHtml(hero.badge || '')}"></div>`;
    return {
      inner: `\n${heroEl}\n${items.map((it) => statItemHtml(it)).join('\n')}\n`,
      hostAttrs: { 'data-title': 'Featured metric · count-up' },
    };
  }
  if (preset === 'cards') {
    const items: StatExpand[] = [
      { label: 'Courses shipped', value: '128', caption: 'demo packages ready' },
      { label: 'Avg. completion', value: '76', suffix: '%', caption: 'across active learners' },
      { label: 'Slide layouts', value: '42', suffix: '+', caption: 'patterns in this demo' },
      { label: 'Components', value: '18', caption: 'interactive portals live' },
    ];
    return {
      inner: itemsHtml(items.map((it) => statItemHtml(it))),
      hostAttrs: { 'data-title': 'Metric cards · count-up' },
    };
  }
  // triple
  const items: StatExpand[] = [
    {
      label: 'Accuracy rate',
      value: '99.95',
      decimals: '2',
      suffix: '%',
      caption: 'in fulfilling orders',
    },
    { label: 'Startup businesses', value: '2000', suffix: '+', caption: 'partner with HyperClass' },
    { label: 'Happy customer', value: '85', suffix: '%', caption: 'this year alone' },
  ];
  return {
    inner: itemsHtml(items.map((it) => statItemHtml(it))),
    hostAttrs: { 'data-title': 'Triple stats · count-up' },
  };
}

function cellStr(v: boolean | string): string {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return v;
}

function expandPlanSections(
  sections: {
    title: string;
    rows: {
      feature: string;
      free: boolean | string;
      startup: boolean | string;
      team: boolean | string;
      enterprise: boolean | string;
    }[];
  }[],
): string {
  const blocks = sections.map((sec) => {
    const rows = sec.rows
      .map(
        (r) =>
          `<div data-row data-feature="${escapeHtml(r.feature)}" data-free="${escapeHtml(cellStr(r.free))}" data-startup="${escapeHtml(cellStr(r.startup))}" data-team="${escapeHtml(cellStr(r.team))}" data-enterprise="${escapeHtml(cellStr(r.enterprise))}"></div>`,
      )
      .join('\n');
    return `<div data-section data-title="${escapeHtml(sec.title)}">\n${rows}\n</div>`;
  });
  return `\n${blocks.join('\n')}\n`;
}

export function expandComparePlans(preset?: string): {
  inner: string;
  hostAttrs: Record<string, string>;
} {
  const matrix = [
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
        {
          feature: 'Average token age consumed',
          free: true,
          startup: false,
          team: true,
          enterprise: true,
        },
        { feature: 'Exchange flow', free: false, startup: false, team: true, enterprise: true },
        {
          feature: 'Total ERC20 exchange funds flow',
          free: false,
          startup: false,
          team: true,
          enterprise: true,
        },
        { feature: 'Transaction volume', free: true, startup: true, team: true, enterprise: true },
        {
          feature: 'Total circulation (beta)',
          free: false,
          startup: true,
          team: true,
          enterprise: true,
        },
        {
          feature: 'Velocity of tokens (beta)',
          free: true,
          startup: true,
          team: false,
          enterprise: true,
        },
        { feature: 'ETH gas used', free: false, startup: true, team: true, enterprise: true },
      ],
    },
    {
      title: 'Social data',
      rows: [
        { feature: 'Dev activity', free: false, startup: true, team: false, enterprise: true },
        { feature: 'Topic search', free: true, startup: true, team: true, enterprise: true },
        {
          feature: 'Relative social dominance',
          free: false,
          startup: false,
          team: true,
          enterprise: true,
        },
        { feature: 'Total social volume', free: true, startup: true, team: false, enterprise: true },
      ],
    },
  ];
  const sticky = [
    {
      title: 'General',
      rows: [
        {
          feature: 'Number of seats',
          free: '1',
          startup: 'Up to 3',
          team: 'Up to 10',
          enterprise: 'Unlimited',
        },
        {
          feature: 'Storage',
          free: '15 GB',
          startup: '1 TB',
          team: '15 TB',
          enterprise: 'Unlimited',
        },
        { feature: 'Email sharing', free: true, startup: true, team: true, enterprise: true },
        {
          feature: 'Any time, anywhere access',
          free: false,
          startup: true,
          team: true,
          enterprise: true,
        },
      ],
    },
    {
      title: 'Financial data',
      rows: [
        {
          feature: 'Open/High/Low/Close',
          free: false,
          startup: false,
          team: true,
          enterprise: true,
        },
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
        {
          feature: 'Average token age consumed',
          free: false,
          startup: true,
          team: true,
          enterprise: true,
        },
        { feature: 'Exchange flow', free: false, startup: false, team: false, enterprise: true },
        {
          feature: 'Total ERC20 exchange funds flow',
          free: false,
          startup: true,
          team: true,
          enterprise: true,
        },
        {
          feature: 'Transaction volume',
          free: false,
          startup: false,
          team: true,
          enterprise: true,
        },
        {
          feature: 'Total circulation (beta)',
          free: false,
          startup: true,
          team: false,
          enterprise: true,
        },
        {
          feature: 'Velocity of tokens (beta)',
          free: false,
          startup: false,
          team: false,
          enterprise: true,
        },
        { feature: 'ETH gas used', free: false, startup: true, team: true, enterprise: true },
      ],
    },
    {
      title: 'Social data',
      rows: [
        { feature: 'Dev activity', free: false, startup: false, team: true, enterprise: true },
        { feature: 'Topic search', free: false, startup: true, team: true, enterprise: true },
        {
          feature: 'Relative social dominance',
          free: false,
          startup: false,
          team: false,
          enterprise: true,
        },
      ],
    },
  ];
  return {
    inner: expandPlanSections(preset === 'sticky' ? sticky : matrix),
    hostAttrs: {
      'data-title': 'Compare plans',
      'data-subtitle': 'Whatever your status, offers evolve according to your needs.',
    },
  };
}

export function expandFilterTable(): string {
  const rows = [
    {
      network: 'Bitcoin',
      type: 'PoW',
      tps: '~7',
      finality: 'Probabilistic',
      fees: 'sats/vByte',
    },
    {
      network: 'Ethereum',
      type: 'PoS',
      tps: '~15–30 L1',
      finality: 'Epoch-based',
      fees: 'gwei',
    },
    { network: 'Solana', type: 'PoS+', tps: 'High', finality: 'Fast slots', fees: 'lamports' },
    {
      network: 'Lightning',
      type: 'L2/Payment',
      tps: 'Very high',
      finality: 'Off-chain',
      fees: 'routing',
    },
    {
      network: 'Arbitrum',
      type: 'Optimistic L2',
      tps: 'High',
      finality: 'Challenge window',
      fees: 'ETH',
    },
  ];
  return itemsHtml(
    rows.map(
      (r) =>
        `${itemOpen({
          'data-network': r.network,
          'data-type': r.type,
          'data-tps': r.tps,
          'data-finality': r.finality,
          'data-fees': r.fees,
        })}${itemClose()}`,
    ),
  );
}

export function expandPieChart(): string {
  const segments = [
    {
      label: 'Community Airdrop',
      value: '45',
      color: '#4f46e5',
      vesting: '100% fully unlocked at Token Generation (TGE)',
      use: 'Distributed to early active sandbox testers and network stress-testers.',
    },
    {
      label: 'Team',
      value: '20',
      color: '#0d9488',
      vesting: '12-month cliff, then 24-month linear unlock',
      use: 'Core contributors building and maintaining the protocol.',
    },
    {
      label: 'Treasury',
      value: '20',
      color: '#f59e0b',
      vesting: 'Multisig-governed releases',
      use: 'Grants, audits, and long-term ecosystem runway.',
    },
    {
      label: 'Liquidity',
      value: '15',
      color: '#e11d48',
      vesting: 'Bootstrapped at launch',
      use: 'Market making and exchange listing liquidity.',
    },
  ];
  return itemsHtml(
    segments.map(
      (s) =>
        `${itemOpen({
          'data-label': s.label,
          'data-value': s.value,
          'data-color': s.color,
          'data-vesting': s.vesting,
          'data-use': s.use,
        })}${itemClose()}`,
    ),
  );
}

export function expandDemoChart(preset?: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const area = [42, 48, 45, 58, 62, 70, 68, 74, 71, 80, 78, 86];
  const negFree = [12, 18, 14, 22, 19, 28, 24, 31, 27, 35, 30, 38];
  const multiBar = [18, 24, 21, 32, 28, 36, 30, 41];
  const multiLine = [28, 32, 30, 36, 40, 44, 42, 48, 46, 52, 55, 60];
  let values = area;
  let labels = months;
  let comment = 'area series (host points feed AreaCard)';
  if (preset === 'neg-line') {
    values = negFree;
    comment = 'sample Free series points — multi-series presets keep built-in chart data';
  } else if (preset === 'multi-bar') {
    values = multiBar;
    labels = months.slice(0, 8);
    comment = 'sample Income points — MultiBarCard uses built-in dual series';
  } else if (preset === 'multi-line') {
    values = multiLine;
    comment = 'sample Desktop series — MultiLineCard uses built-in three series';
  }
  const blocks = labels.map(
    (label, i) =>
      `${itemOpen({ 'data-label': label, 'data-value': String(values[i] ?? 0) })}${itemClose()}`,
  );
  return `\n<!-- ${comment} -->\n${blocks.join('\n')}\n`;
}

export function expandMermaidGraph(): string {
  const chart = `flowchart TB
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
  return `\n<pre data-chart>${escapeHtml(chart)}</pre>\n`;
}

export function expandImageCarousel(): string {
  const slides = [
    {
      src: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1200&h=675&fit=crop&q=80',
      caption: 'Hardware wallets keep keys offline for larger balances.',
    },
    {
      src: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=675&fit=crop&q=80',
      caption: 'Public ledgers make settlement transparent without revealing private keys.',
    },
    {
      src: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=1200&h=675&fit=crop&q=80',
      caption: 'Mobile hot wallets are convenient for learning — start with tiny amounts.',
    },
  ];
  return itemsHtml(
    slides.map(
      (s) => `${itemOpen({ 'data-src': s.src, 'data-caption': s.caption })}${itemClose()}`,
    ),
  );
}

export function expandMarqueeCarousel(): string {
  const items = [
    {
      src: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=480&h=320&fit=crop&q=80',
      label: 'Lorem felis',
    },
    {
      src: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=480&h=320&fit=crop&q=80',
      label: 'Ipsum nisl',
    },
    {
      src: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=480&h=320&fit=crop&q=80',
      label: 'Dolor amet',
    },
    { src: 'https://cataas.com/cat?width=480&height=320', label: 'Sit elit' },
    {
      src: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=480&h=320&fit=crop&q=80',
      label: 'Consectetur',
    },
    {
      src: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=480&h=320&fit=crop&q=80',
      label: 'Adipiscing',
    },
  ];
  return itemsHtml(
    items.map((it) => `${itemOpen({ 'data-src': it.src, 'data-label': it.label })}${itemClose()}`),
  );
}

export function expandImageCompare(): {
  inner: string;
  hostAttrs: Record<string, string>;
} {
  const before =
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop&q=80';
  const after =
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=800&fit=crop&q=80';
  return {
    inner: itemsHtml([
      `${itemOpen({ 'data-src': before, 'data-label': 'Before' })}${itemClose()}`,
      `${itemOpen({ 'data-src': after, 'data-label': 'After' })}${itemClose()}`,
    ]),
    hostAttrs: { 'data-before': before, 'data-after': after },
  };
}

/** Map component type + attrs → inner HTML (and optional host attr patches). */
export function expandMountInner(
  type: string,
  preset?: string,
): { inner: string; hostAttrs?: Record<string, string> } | null {
  switch (type) {
    case 'accordion':
      return { inner: expandAccordion(preset) };
    case 'timeline':
      if (!preset || preset === 'blockchain') {
        return { inner: expandTimelineDetail() };
      }
      return { inner: expandTimelineSteps(preset) };
    case 'timeline-detail':
    case 'timeline-horizontal':
      return { inner: expandTimelineDetail() };
    case 'timeline-trail':
      return { inner: expandTimelineTrail() };
    case 'tabs': {
      const meta = tabMeta(preset);
      return {
        inner: expandTabs(preset),
        hostAttrs: {
          ...(meta.style ? { 'data-style': meta.style } : {}),
          ...(meta.orientation ? { 'data-orientation': meta.orientation } : {}),
        },
      };
    }
    case 'checklist':
      return {
        inner: expandChecklist(preset),
        hostAttrs: { 'data-title': checklistTitle(preset) },
      };
    case 'flipcards':
      return { inner: expandFlipcards(preset) };
    case 'feature-tabs':
      return { inner: expandFeatureTabs() };
    case 'reveal-steps':
      return { inner: expandRevealSteps(preset) };
    case 'compare-steps':
      return { inner: expandCompareSteps(preset) };
    case 'step-showcase':
      return { inner: expandStepShowcase(preset) };
    case 'process-steps':
      return { inner: expandProcessSteps() };
    case 'metrics-stats':
      return expandMetricsStats(preset);
    case 'compare-plans':
      return expandComparePlans(preset);
    case 'filter-table':
      return { inner: expandFilterTable() };
    case 'pie-chart':
      return { inner: expandPieChart() };
    case 'demo-chart':
      return { inner: expandDemoChart(preset) };
    case 'mermaid-graph':
      return { inner: expandMermaidGraph() };
    case 'image-carousel':
      return { inner: expandImageCarousel() };
    case 'marquee-carousel':
      return { inner: expandMarqueeCarousel() };
    case 'image-compare':
      return expandImageCompare();
    // Attribute-driven embeds — leave mounts as-is
    case 'course-widget':
    case 'yt-video':
    case 'pdf-embed':
    case 'asset-image':
    case 'asset-download':
      return null;
    default:
      return null;
  }
}
