import { useLayoutEffect, useRef, useState } from 'react';
import { ExpandableShell, PanZoomSurface } from '../ExpandableShell';

function boolAttr(host: HTMLElement | null | undefined, name: string, fallback = true): boolean {
  const value = host?.getAttribute(name);
  return value == null ? fallback : value !== '0' && value !== 'false';
}

/**
 * Card shell around author-owned HTML (images, text, etc.).
 * Moves `[data-hc-container-body]` into the shell so expand/zoom/pan work
 * without cloning content (keeps object-mode selection on real nodes).
 */
export function HcContainerWidget({ host }: { host?: HTMLElement | null }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [revision, setRevision] = useState(0);

  useLayoutEffect(() => {
    if (!host) return;
    const observer = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.type === 'attributes' &&
            record.target === host &&
            record.attributeName?.startsWith('data-shell-'),
        )
      ) {
        setRevision((value) => value + 1);
      }
    });
    observer.observe(host, { attributes: true });
    return () => observer.disconnect();
  }, [host]);

  useLayoutEffect(() => {
    if (!host || !slotRef.current) return;
    const body =
      host.querySelector<HTMLElement>('[data-hc-container-body]') ??
      Array.from(host.children).find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && !node.hasAttribute('data-react-root'),
      ) ??
      null;
    if (!body) return;
    const slot = slotRef.current;
    if (body.parentElement !== slot) {
      slot.appendChild(body);
    }
    return () => {
      if (body.isConnected && host.isConnected && body.parentElement === slot) {
        host.appendChild(body);
      }
    };
  }, [host, revision]);

  const title = host?.getAttribute('data-shell-title') || host?.getAttribute('data-hc-label') || 'Container';
  const allowExpand = boolAttr(host, 'data-shell-expand');
  const allowZoom = boolAttr(host, 'data-shell-zoom');
  const allowPan = boolAttr(host, 'data-shell-pan');
  const allowSnapshot = host?.getAttribute('data-shell-snapshot') === '1';

  const body = (
    <div
      ref={slotRef}
      className="hc-data-container__slot min-h-[160px] w-full p-3 [&_:where(img,video)]:max-w-full"
    />
  );

  return (
    <ExpandableShell
      title={title}
      allowExpand={allowExpand}
      allowSnapshot={allowSnapshot}
      snapshotName={title}
      bodyClassName="h-[280px]"
      expandedBodyClassName="min-h-0 flex-1"
      className="hc-data-container"
    >
      {allowZoom || allowPan ? (
        <PanZoomSurface
          className="h-full min-h-[200px] bg-[var(--panel)]"
          enableZoom={allowZoom}
          enablePan={allowPan}
        >
          <div className="min-h-[200px] w-[min(720px,90vw)]">{body}</div>
        </PanZoomSurface>
      ) : (
        <div className="h-full min-h-[200px] overflow-auto">{body}</div>
      )}
    </ExpandableShell>
  );
}
