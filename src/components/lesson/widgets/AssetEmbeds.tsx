import { Download, FileText, ImageIcon } from 'lucide-react';
import { ExpandableShell } from '../ExpandableShell';

function assetUrl(courseFolder: string, rel: string) {
  const clean = rel.replace(/^\/+/, '');
  const parts = clean.split('/').map(encodeURIComponent).join('/');
  return `http://127.0.0.1:8765/courses/${encodeURIComponent(courseFolder)}/${parts}`;
}

export function PdfEmbedWidget({
  courseFolder,
  src,
  title,
}: {
  courseFolder: string;
  src?: string;
  title?: string;
}) {
  const path = src || 'assets/documents/YieldLens-Crypto_Flexible-2026-07-15 (1).pdf';
  const url = assetUrl(courseFolder, path);
  return (
    <ExpandableShell
      title={title || 'Course PDF'}
      bodyClassName="h-[420px] bg-slate-100 dark:bg-slate-950"
      expandedBodyClassName="min-h-0 flex-1 bg-slate-100 dark:bg-slate-950"
    >
      <iframe title={title || 'PDF'} src={url} className="h-full min-h-[400px] w-full border-0" />
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
    <ExpandableShell title={title || 'Course image'} bodyClassName="bg-slate-50 p-4 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <img
            src={url}
            alt={caption || title || 'Asset'}
            className="max-h-[320px] w-full object-contain"
          />
        </div>
        {caption && (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <ImageIcon className="h-3.5 w-3.5" />
            {caption}
          </p>
        )}
      </div>
    </ExpandableShell>
  );
}

export function AssetDownloadWidget({
  courseFolder,
  src,
  label,
}: {
  courseFolder: string;
  src?: string;
  label?: string;
}) {
  const path = src || 'assets/others/Perfil_Riesgo_Branko_Pereira.txt';
  const url = assetUrl(courseFolder, path);
  const name = path.split('/').pop() || 'download.txt';

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/50 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-indigo-950/30">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
          <FileText className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
            Downloadable resource
          </div>
          <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {label || name}
          </div>
          <p className="text-xs text-slate-500">Example of linking course assets for offline review.</p>
        </div>
        <a
          href={url}
          download={name}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-lg"
        >
          <Download className="h-4 w-4" />
          Download .txt
        </a>
      </div>
    </div>
  );
}
