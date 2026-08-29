/** Static HTML factories for data inserts (safe for catalog/drag use). */
export type DataKind = 'graph' | 'mermaid' | 'table' | 'container';

export function createGraphHtml(): string {
  return `<figure class="hc-data hc-data--graph" data-hc-data="graph" data-component="hc-chart" data-chart-type="bar" data-hc-label="Graph" data-shell-expand="1" data-shell-zoom="1" data-shell-pan="0" data-shell-snapshot="1" data-shell-title="Graph">
  <span data-item data-label="Alpha" data-value="40" data-color="#3b82f6" hidden></span>
  <span data-item data-label="Beta" data-value="28" data-color="#10b981" hidden></span>
  <span data-item data-label="Gamma" data-value="18" data-color="#f59e0b" hidden></span>
  <span data-item data-label="Delta" data-value="14" data-color="#ef4444" hidden></span>
</figure>`;
}

export function createMermaidHtml(): string {
  return `<figure class="hc-data hc-data--mermaid" data-hc-data="mermaid" data-component="mermaid-graph" data-hc-label="Mermaid" data-shell-expand="1" data-shell-zoom="1" data-shell-pan="1" data-shell-snapshot="1" data-shell-title="Diagram">
  <pre data-chart hidden>flowchart LR
  A[Start] --> B[Process]
  B --> C[End]</pre>
</figure>`;
}

export function createTableHtml(): string {
  return `<div class="hc-table-wrap hc-data hc-data--table" data-hc-data="table" data-hc-label="Table">
  <table class="hc-table">
    <thead><tr><th>A</th><th>B</th><th>C</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>2</td><td>3</td></tr>
      <tr><td>4</td><td>5</td><td>6</td></tr>
    </tbody>
  </table>
</div>`;
}

export function createContainerHtml(): string {
  return `<figure class="hc-data hc-data--container" data-hc-data="container" data-component="hc-container" data-hc-label="Container" data-shell-expand="1" data-shell-zoom="1" data-shell-pan="1" data-shell-snapshot="1" data-shell-title="Container">
  <div class="hc-data-container__body" data-hc-container-body>
    <p>Drop or insert content here.</p>
  </div>
</figure>`;
}

export function createDataHtml(kind: DataKind): string {
  switch (kind) {
    case 'graph':
      return createGraphHtml();
    case 'mermaid':
      return createMermaidHtml();
    case 'table':
      return createTableHtml();
    case 'container':
      return createContainerHtml();
  }
}

export function catalogIdForDataKind(
  kind: DataKind,
): 'data-graph' | 'data-mermaid' | 'data-table' | 'data-container' {
  return `data-${kind}`;
}

export function detectDataKind(el: HTMLElement): DataKind | null {
  const host = resolveDataTarget(el);
  const explicit = host.getAttribute('data-hc-data');
  if (explicit === 'graph' || explicit === 'mermaid' || explicit === 'table' || explicit === 'container') {
    return explicit;
  }
  const component = (host.getAttribute('data-component') || '').toLowerCase();
  if (
    component === 'hc-chart' ||
    component === 'pie-chart' ||
    component === 'demo-chart' ||
    component.includes('chart') ||
    component.includes('graph') ||
    component.includes('pie')
  ) {
    return 'graph';
  }
  if (component === 'hc-container') return 'container';
  if (component === 'mermaid-graph' || component.includes('mermaid')) return 'mermaid';
  if (component === 'filter-table' || component.includes('table')) return 'table';
  if (host.matches('table, .hc-table-wrap') || host.querySelector(':scope > table, :scope > .hc-table')) {
    return 'table';
  }
  if (host.hasAttribute('data-hc-container-body')) return 'container';
  return null;
}

export function resolveDataTarget(el: HTMLElement): HTMLElement {
  const host = el.closest(
    '[data-hc-data], [data-component="hc-chart"], [data-component="hc-container"], [data-component="mermaid-graph"], [data-component="pie-chart"], [data-component="demo-chart"], [data-component="filter-table"], .hc-table-wrap',
  ) as HTMLElement | null;
  if (host) return host;
  if (
    el.matches(
      '[data-component="hc-chart"], [data-component="hc-container"], [data-component="mermaid-graph"], [data-component="pie-chart"], [data-component="demo-chart"], [data-component="filter-table"], .hc-table-wrap, table',
    )
  ) {
    return el;
  }
  const componentHost = el.closest('[data-component]') as HTMLElement | null;
  if (componentHost) {
    const name = (componentHost.getAttribute('data-component') || '').toLowerCase();
    if (
      name.includes('chart') ||
      name.includes('graph') ||
      name.includes('pie') ||
      name.includes('mermaid') ||
      name.includes('table') ||
      name.includes('container')
    ) {
      return componentHost;
    }
  }
  const nested = el.querySelector(
    '[data-hc-data], [data-component="hc-chart"], [data-component="hc-container"], [data-component="mermaid-graph"], [data-component="pie-chart"], [data-component="demo-chart"], .hc-table-wrap',
  );
  return nested instanceof HTMLElement ? nested : el;
}
