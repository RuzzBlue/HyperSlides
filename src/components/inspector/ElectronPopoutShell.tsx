import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

function copyStylesInto(targetDoc: Document) {
  const head = targetDoc.head;
  document.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
    head.appendChild(node.cloneNode(true));
  });
  document.querySelectorAll('style').forEach((node) => {
    head.appendChild(node.cloneNode(true));
  });
  targetDoc.documentElement.className = document.documentElement.className;
  targetDoc.documentElement.style.cssText = document.documentElement.style.cssText;
  targetDoc.body.className = document.body.className;
  // Match app chrome background so the OS window doesn't flash white.
  const bg =
    getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() ||
    getComputedStyle(document.body).backgroundColor ||
    '#e8eaed';
  targetDoc.body.style.margin = '0';
  targetDoc.body.style.height = '100%';
  targetDoc.body.style.overflow = 'hidden';
  targetDoc.body.style.background = bg;
  targetDoc.documentElement.style.height = '100%';
}

/**
 * Opens a real OS window (Electron) and portals React children into it.
 * Components keep running in the main renderer JS context (same hooks/DOM refs).
 */
export function ElectronPopoutShell({
  title,
  width,
  height,
  name,
  children,
  onClose,
  onBlocked,
}: {
  title: string;
  width: number;
  height: number;
  /** Unique window name so multiple inspectors can coexist later. */
  name: string;
  children: ReactNode;
  onClose: () => void;
  /** Popup blocked / failed — caller can fall back to in-app float. */
  onBlocked?: () => void;
}) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const childRef = useRef<Window | null>(null);
  const closedByUs = useRef(false);

  useEffect(() => {
    closedByUs.current = false;
    const features = [
      'popup=yes',
      `width=${Math.round(width)}`,
      `height=${Math.round(height)}`,
      'resizable=yes',
      'scrollbars=no',
    ].join(',');
    const child = window.open('about:blank', name, features);
    if (!child) {
      onBlocked?.();
      return;
    }
    childRef.current = child;

    const doc = child.document;
    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><div id="hc-electron-popout-root" style="display:flex;flex-direction:column;height:100%;width:100%;"></div></body></html>`,
    );
    doc.close();
    copyStylesInto(doc);
    child.document.title = title;

    const root = doc.getElementById('hc-electron-popout-root');
    setMount(root);

    const handleUnload = () => {
      setMount(null);
      childRef.current = null;
      if (!closedByUs.current) onClose();
    };
    child.addEventListener('beforeunload', handleUnload);

    // Keep styles in sync when Vite HMR injects new <style> tags.
    const styleObserver = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (
            node instanceof HTMLStyleElement ||
            (node instanceof HTMLLinkElement && node.rel === 'stylesheet')
          ) {
            doc.head.appendChild(node.cloneNode(true));
          }
        });
      }
    });
    styleObserver.observe(document.head, { childList: true });

    return () => {
      styleObserver.disconnect();
      child.removeEventListener('beforeunload', handleUnload);
      setMount(null);
      closedByUs.current = true;
      childRef.current = null;
      if (!child.closed) child.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  useEffect(() => {
    if (!mount) return;
    const win = mount.ownerDocument.defaultView;
    if (win && !win.closed) win.document.title = title;
  }, [mount, title]);

  useEffect(() => {
    const win = childRef.current;
    if (!win || win.closed) return;
    try {
      win.resizeTo(Math.round(width), Math.round(height));
    } catch {
      // Some platforms restrict resizeTo; native chrome resize still works.
    }
  }, [width, height]);

  if (!mount) return null;
  return createPortal(children, mount);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
