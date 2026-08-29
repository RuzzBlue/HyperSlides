import { useEffect, useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { ExpandableShell, PanZoomSurface } from '../ExpandableShell';

function assetUrl(courseFolder: string, rel: string) {
  if (/^https?:\/\//i.test(rel) || rel.startsWith('blob:') || rel.startsWith('data:')) {
    return rel;
  }
  const clean = rel.replace(/^\/+/, '');
  const parts = clean.split('/').map(encodeURIComponent).join('/');
  return `http://127.0.0.1:8765/courses/${encodeURIComponent(courseFolder)}/${parts}`;
}

function boolAttr(host: HTMLElement | null | undefined, name: string, fallback = true): boolean {
  const value = host?.getAttribute(name);
  return value == null ? fallback : value !== '0' && value !== 'false';
}

function fileExt(src: string): string {
  const base = src.split('?')[0]?.split('#')[0] || '';
  const name = base.split('/').pop() || '';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function isPdf(src: string) {
  return fileExt(src) === '.pdf';
}

function isImage(src: string) {
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp'].includes(fileExt(src));
}

function isVideo(src: string) {
  return ['.mp4', '.webm', '.ogg', '.mov', '.m4v'].includes(fileExt(src));
}

function resolveSrc(host: HTMLElement | null | undefined, src?: string): string {
  return (src || host?.getAttribute('data-src') || '').trim();
}

export function PdfEmbedWidget({
  courseFolder,
  src,
  title,
  host,
}: {
  courseFolder: string;
  src?: string;
  title?: string;
  host?: HTMLElement | null;
}) {
  const path = resolveSrc(host, src) || 'assets/documents/sample-document.pdf';
  const url = assetUrl(courseFolder, path);
  const label = title || host?.getAttribute('data-shell-title') || host?.getAttribute('data-title') || 'Course PDF';
  return (
    <ExpandableShell
      title={label}
      allowExpand={boolAttr(host, 'data-shell-expand', true)}
      allowSnapshot={boolAttr(host, 'data-shell-snapshot', false)}
      snapshotName={label}
      bodyClassName="h-[420px] bg-slate-100 dark:bg-slate-950"
      expandedBodyClassName="min-h-0 flex-1 bg-slate-100 dark:bg-slate-950"
    >
      <iframe title={label} src={url} className="h-full min-h-[400px] w-full border-0" />
    </ExpandableShell>
  );
}

export function AssetImageWidget({
  courseFolder,
  src,
  title,
  caption,
}: {
  courseFolder: string;
  src?: string;
  title?: string;
  caption?: string;
}) {
  const path = src || 'assets/images/transferencia 1 junio.svg';
  const url = assetUrl(courseFolder, path);
  return (
    <ExpandableShell
      title={title || 'Course image'}
      bodyClassName="h-[300px] bg-slate-50 dark:bg-slate-950"
      expandedBodyClassName="min-h-0 flex-1 bg-slate-50 dark:bg-slate-950"
    >
      <PanZoomSurface className="h-full min-h-[280px]">
        <div className="flex flex-col items-center gap-3 p-2">
          <img
            src={url}
            alt={caption || title || 'Asset'}
            className="max-h-[60vh] max-w-full object-contain"
            draggable={false}
          />
          {caption && (
            <p className="rounded-md bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              {caption}
            </p>
          )}
        </div>
      </PanZoomSurface>
    </ExpandableShell>
  );
}

export function AssetDownloadWidget({
  courseFolder,
  src,
  label,
  host,
}: {
  courseFolder: string;
  src?: string;
  label?: string;
  host?: HTMLElement | null;
}) {
  const path = resolveSrc(host, src) || 'assets/others/sample-notes.txt';
  const url = assetUrl(courseFolder, path);
  const name = path.split('/').pop() || 'download';
  const buttonLabel = label || host?.getAttribute('data-label') || name;

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-[color-mix(in_srgb,var(--lesson-accent,#4f46e5)_8%,white)] p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg"
          style={{ backgroundColor: 'var(--lesson-accent, #0e6e6a)' }}
        >
          <FileText className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="text-[10px] font-black uppercase tracking-[0.16em]"
            style={{ color: 'var(--lesson-accent, #0e6e6a)' }}
          >
            Downloadable resource
          </div>
          <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{buttonLabel}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{name}</p>
        </div>
        <a
          href={url}
          download={name}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-lg"
          style={{ backgroundColor: 'var(--lesson-accent, #0e6e6a)', color: '#ffffff' }}
        >
          <Download className="h-4 w-4 text-white" />
          <span className="text-white">Download</span>
        </a>
      </div>
    </div>
  );
}

/** Media File element: visualize in shell or download button. */
export function HcFileWidget({
  courseFolder,
  host,
}: {
  courseFolder: string;
  host?: HTMLElement | null;
}) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!host) return;
    const observer = new MutationObserver(() => setRevision((value) => value + 1));
    observer.observe(host, { attributes: true });
    return () => observer.disconnect();
  }, [host]);

  const model = useMemo(() => {
    void revision;
    const src = resolveSrc(host);
    const mode = (host?.getAttribute('data-hc-file-mode') || 'visualize').toLowerCase();
    return {
      src,
      mode: mode === 'download' ? 'download' : 'visualize',
      title:
        host?.getAttribute('data-shell-title') ||
        host?.getAttribute('data-title') ||
        host?.getAttribute('data-hc-label') ||
        'File',
      label: host?.getAttribute('data-label') || '',
      expand: boolAttr(host, 'data-shell-expand', true),
      zoom: boolAttr(host, 'data-shell-zoom', false),
      pan: boolAttr(host, 'data-shell-pan', false),
      snapshot: boolAttr(host, 'data-shell-snapshot', true),
    };
  }, [host, revision]);

  if (!model.src) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        Choose a file in the Media inspector.
      </div>
    );
  }

  if (model.mode === 'download') {
    return (
      <AssetDownloadWidget
        courseFolder={courseFolder}
        src={model.src}
        label={model.label || model.title}
        host={host}
      />
    );
  }

  const url = assetUrl(courseFolder, model.src);
  let body: React.ReactNode;
  if (isPdf(model.src)) {
    body = <iframe title={model.title} src={url} className="h-full min-h-[400px] w-full border-0" />;
  } else if (isImage(model.src)) {
    const img = (
      <img src={url} alt={model.title} className="max-h-[70vh] max-w-full object-contain" draggable={false} />
    );
    body =
      model.zoom || model.pan ? (
        <PanZoomSurface className="h-full min-h-[280px]" enableZoom={model.zoom} enablePan={model.pan}>
          {img}
        </PanZoomSurface>
      ) : (
        <div className="flex h-full min-h-[280px] items-center justify-center overflow-auto p-4">{img}</div>
      );
  } else if (isVideo(model.src)) {
    body = (
      <div className="flex h-full min-h-[280px] items-center justify-center bg-black p-2">
        <video src={url} controls playsInline className="max-h-full max-w-full" />
      </div>
    );
  } else {
    body = (
      <iframe title={model.title} src={url} className="h-full min-h-[400px] w-full border-0 bg-white" />
    );
  }

  return (
    <ExpandableShell
      title={model.title}
      allowExpand={model.expand}
      allowSnapshot={model.snapshot}
      snapshotName={model.title}
      bodyClassName="h-[420px] bg-slate-100 dark:bg-slate-950"
      expandedBodyClassName="min-h-0 flex-1 bg-slate-100 dark:bg-slate-950"
    >
      {body}
    </ExpandableShell>
  );
}
