import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Film, Image as ImageIcon, Search, X } from 'lucide-react';
import { apiFetch } from '../../../api/client';
import { usePrefs } from '../../../prefs/PrefsProvider';
import { courseAssetUrl } from '../styleThemeColors';

export type LibraryAsset = {
  path: string;
  name: string;
  folder: 'images' | 'videos' | 'documents' | 'others';
  kind: 'image' | 'video' | 'other';
  mtimeMs: number;
};

type FolderFilter = 'all' | 'images' | 'videos';
type KindFilter = 'all' | 'image' | 'video';
type SortMode = 'recent' | 'folder' | 'name';

const FOLDER_TABS: { id: FolderFilter; labelKey: 'mediaLibraryTabAll' | 'mediaLibraryTabImages' | 'mediaLibraryTabVideos' }[] = [
  { id: 'all', labelKey: 'mediaLibraryTabAll' },
  { id: 'images', labelKey: 'mediaLibraryTabImages' },
  { id: 'videos', labelKey: 'mediaLibraryTabVideos' },
];

/** Modal to browse uploaded course images + videos (assets/images + assets/videos). */
export function AssetLibraryModal({
  open,
  courseId,
  onPick,
  onClose,
}: {
  open: boolean;
  courseId: string;
  onPick: (asset: LibraryAsset) => void;
  onClose: () => void;
}) {
  const { tr } = usePrefs();
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState<FolderFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [sort, setSort] = useState<SortMode>('recent');
  const [files, setFiles] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await apiFetch<{ files: LibraryAsset[] }>({
          method: 'GET',
          path: `/api/courses/${courseId}/assets`,
          params: { folder: 'media' },
        });
        if (cancelled) return;
        if (!res.ok || !res.data?.files) {
          setFiles([]);
          setError(res.error || tr('mediaLibraryLoadError'));
          return;
        }
        setFiles(
          res.data.files.filter((f) => f.kind === 'image' || f.kind === 'video') as LibraryAsset[],
        );
      } catch {
        if (!cancelled) {
          setFiles([]);
          setError(tr('mediaLibraryLoadError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, courseId, tr]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = files.filter((f) => {
      if (folder === 'images' && f.folder !== 'images') return false;
      if (folder === 'videos' && f.folder !== 'videos' && f.folder !== 'others') return false;
      if (kindFilter === 'image' && f.kind !== 'image') return false;
      if (kindFilter === 'video' && f.kind !== 'video') return false;
      if (q && !f.name.toLowerCase().includes(q) && !f.path.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
    list = [...list];
    if (sort === 'recent') {
      list.sort((a, b) => b.mtimeMs - a.mtimeMs || a.name.localeCompare(b.name));
    } else if (sort === 'folder') {
      list.sort(
        (a, b) =>
          a.folder.localeCompare(b.folder) ||
          b.mtimeMs - a.mtimeMs ||
          a.name.localeCompare(b.name),
      );
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [files, folder, kindFilter, query, sort]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={tr('mediaLibraryTitle')}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(86vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--stage)] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <div>
            <div className="text-[13px] font-semibold text-[var(--ink)]">{tr('mediaLibraryTitle')}</div>
            <div className="text-[10px] text-[var(--ink-muted)]">{tr('mediaLibraryHint')}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
            aria-label={tr('mediaLibraryClose')}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-1 border-b border-[var(--line)] px-3 pt-2">
          {FOLDER_TABS.map((tab) => {
            const active = folder === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFolder(tab.id)}
                className={`cursor-pointer rounded-t-md px-3 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {tr(tab.labelKey)}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-1 pb-1">
            {(
              [
                ['all', 'mediaLibraryKindAll'],
                ['image', 'mediaLibraryKindImage'],
                ['video', 'mediaLibraryKindVideo'],
              ] as const
            ).map(([id, key]) => (
              <button
                key={id}
                type="button"
                onClick={() => setKindFilter(id)}
                className={`cursor-pointer rounded-md px-2 py-1 text-[10px] font-semibold ${
                  kindFilter === id
                    ? 'bg-black/10 text-[var(--ink)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {tr(key)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-3 py-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr('mediaLibrarySearch')}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] py-2 pl-8 pr-3 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="cursor-pointer rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-2 text-[11px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            aria-label={tr('mediaLibrarySort')}
          >
            <option value="recent">{tr('mediaLibrarySortRecent')}</option>
            <option value="folder">{tr('mediaLibrarySortFolder')}</option>
            <option value="name">{tr('mediaLibrarySortName')}</option>
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="px-2 py-8 text-center text-[12px] text-[var(--ink-muted)]">
              {tr('styleBgImageUploading')}
            </p>
          ) : error ? (
            <p className="px-2 py-8 text-center text-[12px] text-[var(--ink-muted)]">{error}</p>
          ) : entries.length === 0 ? (
            <p className="px-2 py-8 text-center text-[12px] text-[var(--ink-muted)]">
              {tr('mediaLibraryEmpty')}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {entries.map((file) => {
                const url = courseAssetUrl(courseId, file.path);
                return (
                  <button
                    key={file.path}
                    type="button"
                    title={file.name}
                    onClick={() => {
                      onPick(file);
                      onClose();
                    }}
                    className="group cursor-pointer overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)]/60 text-left hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
                  >
                    <div className="relative aspect-square bg-black/5">
                      {file.kind === 'image' ? (
                        <div
                          className="absolute inset-0 bg-center bg-cover"
                          style={{ backgroundImage: `url("${url}")` }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-black/10 to-black/5">
                          <Film className="h-7 w-7 text-[var(--ink-muted)]" />
                          <video
                            src={url}
                            muted
                            preload="metadata"
                            className="absolute inset-0 h-full w-full object-cover opacity-70"
                          />
                        </div>
                      )}
                      <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-black/55 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white">
                        {file.kind === 'image' ? (
                          <ImageIcon className="h-2.5 w-2.5" />
                        ) : (
                          <Film className="h-2.5 w-2.5" />
                        )}
                        {file.kind}
                      </span>
                    </div>
                    <div className="space-y-0.5 px-1.5 py-1">
                      <div className="truncate text-[10px] font-medium text-[var(--ink)]">{file.name}</div>
                      <div className="truncate text-[8px] text-[var(--ink-muted)]">
                        {file.folder}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
