import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Film,
  Image as ImageIcon,
  Indent,
  Italic,
  Link2,
  List,
  ListOrdered,
  Outdent,
  Strikethrough,
  Underline,
  Upload,
} from 'lucide-react';
import { apiFetch } from '../../../api/client';
import { usePrefs } from '../../../prefs/PrefsProvider';
import { parseYoutubeVideoId } from '../../../lib/youtubeEmbed';
import { AssetLibraryModal, type LibraryAsset } from '../media/AssetLibraryModal';
import { courseAssetUrl } from '../styleThemeColors';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';

/**
 * Lightweight HTML contentEditable used by Lab Activities sections.
 * Emits full HTML on change so callers can dirty-track and save.
 */
export function SimpleRichTextEditor({
  value,
  courseId,
  onChange,
  placeholder,
}: {
  value: string;
  courseId: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const { tr } = usePrefs();
  const editorRef = useRef<HTMLDivElement>(null);
  const lastExternal = useRef(value);
  const [empty, setEmpty] = useState(() => !value.replace(/<[^>]+>/g, '').trim());
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryKind, setLibraryKind] = useState<'image' | 'video'>('image');
  const [uploading, setUploading] = useState(false);
  const [linkPrompt, setLinkPrompt] = useState<'image' | 'video' | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadKind, setUploadKind] = useState<'image' | 'video'>('image');

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // Seed once, then only accept external value changes (e.g. section switch).
    if (el.dataset.seeded !== '1') {
      el.innerHTML = value || '';
      el.dataset.seeded = '1';
      lastExternal.current = value;
      setEmpty(!editorHasText(el));
      return;
    }
    if (value === lastExternal.current) return;
    lastExternal.current = value;
    if (el.innerHTML !== value) {
      el.innerHTML = value || '';
      setEmpty(!editorHasText(el));
    }
  }, [value]);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    lastExternal.current = html;
    setEmpty(!editorHasText(el));
    onChange(html);
  }, [onChange]);

  const run = (command: string, arg?: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const setHeading = (level: HeadingLevel) => {
    run('formatBlock', level === 'p' ? 'p' : level);
  };

  const insertHtml = (html: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand('insertHTML', false, html);
    emit();
  };

  const insertMediaUrl = (kind: 'image' | 'video', url: string) => {
    const clean = url.trim();
    if (!clean) return;
    if (kind === 'image') {
      insertHtml(`<img src="${escapeAttr(clean)}" alt="" style="max-width:100%;height:auto;" />`);
      return;
    }
    const ytId = parseYoutubeVideoId(clean);
    if (ytId) {
      insertHtml(
        `<div data-component="yt-video" data-video-id="${escapeAttr(ytId)}" style="aspect-ratio:16/9;width:100%;max-width:100%;"></div>`,
      );
      return;
    }
    insertHtml(
      `<video src="${escapeAttr(clean)}" controls style="max-width:100%;height:auto;"></video>`,
    );
  };

  const uploadFiles = async (files: FileList | null, kind: 'image' | 'video') => {
    if (!files?.length || !courseId) return;
    const fileObj = files[0]!;
    setUploading(true);
    try {
      const dataBase64 = await readFileAsBase64(fileObj);
      const folder = kind === 'image' ? 'images' : 'videos';
      const res = await apiFetch<{ path: string }>({
        method: 'POST',
        path: `/api/courses/${courseId}/assets`,
        body: { filename: fileObj.name, dataBase64, folder },
      });
      if (!res.ok || !res.data?.path) return;
      insertMediaUrl(kind, courseAssetUrl(courseId, res.data.path));
    } finally {
      setUploading(false);
    }
  };

  const onPickLibrary = (asset: LibraryAsset) => {
    const url = courseAssetUrl(courseId, asset.path);
    insertMediaUrl(asset.kind === 'video' ? 'video' : 'image', url);
    setLibraryOpen(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-[var(--line)] bg-[var(--panel)] px-1.5 py-1">
        <select
          aria-label={tr('activityRteHeading')}
          defaultValue="p"
          onChange={(e) => setHeading(e.target.value as HeadingLevel)}
          className="mr-0.5 h-7 rounded border border-[var(--line)] bg-[var(--stage)] px-1 text-[10px] font-semibold text-[var(--ink)] outline-none"
        >
          <option value="p">P</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
          <option value="h5">H5</option>
          <option value="h6">H6</option>
        </select>
        <ToolBtn title={tr('activityRteBold')} onClick={() => run('bold')}>
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title={tr('activityRteItalic')} onClick={() => run('italic')}>
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title={tr('activityRteUnderline')} onClick={() => run('underline')}>
          <Underline className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title={tr('activityRteStrike')} onClick={() => run('strikeThrough')}>
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <ToolBtn title={tr('activityRteBullet')} onClick={() => run('insertUnorderedList')}>
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title={tr('activityRteOrdered')} onClick={() => run('insertOrderedList')}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title={tr('activityRteIndent')} onClick={() => run('indent')}>
          <Indent className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title={tr('activityRteOutdent')} onClick={() => run('outdent')}>
          <Outdent className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <ToolBtn title={tr('activityRteAlignLeft')} onClick={() => run('justifyLeft')}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title={tr('activityRteAlignCenter')} onClick={() => run('justifyCenter')}>
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title={tr('activityRteAlignRight')} onClick={() => run('justifyRight')}>
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <label
          title={tr('activityRteColor')}
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
        >
          <span className="text-[11px] font-bold">A</span>
          <input
            type="color"
            className="sr-only"
            onChange={(e) => run('foreColor', e.target.value)}
          />
        </label>
        <Sep />
        <ToolBtn
          title={tr('activityRteImageLink')}
          onClick={() => {
            setLinkUrl('');
            setLinkPrompt('image');
          }}
        >
          <Link2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          title={tr('activityRteImageLibrary')}
          onClick={() => {
            setLibraryKind('image');
            setLibraryOpen(true);
          }}
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          title={tr('activityRteImageUpload')}
          onClick={() => {
            setUploadKind('image');
            fileInputRef.current?.click();
          }}
        >
          <Upload className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          title={tr('activityRteVideoLink')}
          onClick={() => {
            setLinkUrl('');
            setLinkPrompt('video');
          }}
        >
          <Film className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          title={tr('activityRteVideoLibrary')}
          onClick={() => {
            setLibraryKind('video');
            setLibraryOpen(true);
          }}
        >
          <Film className="h-3.5 w-3.5 opacity-70" />
        </ToolBtn>
        {uploading && (
          <span className="ml-1 text-[10px] text-[var(--ink-muted)]">{tr('activityRteUploading')}</span>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={uploadKind === 'image' ? 'image/*' : 'video/*'}
          className="hidden"
          onChange={(e) => {
            void uploadFiles(e.target.files, uploadKind);
            e.target.value = '';
          }}
        />
      </div>

      {linkPrompt && (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--line)] bg-[var(--stage)] px-2 py-1.5">
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={tr('activityRteUrlPlaceholder')}
            className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[12px] outline-none focus:border-[var(--accent)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                insertMediaUrl(linkPrompt, linkUrl);
                setLinkPrompt(null);
              } else if (e.key === 'Escape') {
                setLinkPrompt(null);
              }
            }}
          />
          <button
            type="button"
            className="cursor-pointer rounded-md bg-[var(--accent)] px-2 py-1 text-[11px] font-semibold text-white"
            onClick={() => {
              insertMediaUrl(linkPrompt, linkUrl);
              setLinkPrompt(null);
            }}
          >
            {tr('activityRteInsert')}
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-md px-2 py-1 text-[11px] text-[var(--ink-muted)]"
            onClick={() => setLinkPrompt(null)}
          >
            {tr('inspectorCodeCancel')}
          </button>
        </div>
      )}

      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder ?? tr('activityRtePlaceholder')}
        onInput={emit}
        onBlur={emit}
        className={`activity-rte min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[13px] leading-relaxed text-[var(--ink)] outline-none [&_img]:max-w-full [&_video]:max-w-full ${
          empty ? 'is-empty' : ''
        }`}
      />

      <AssetLibraryModal
        open={libraryOpen}
        courseId={courseId}
        onClose={() => setLibraryOpen(false)}
        onPick={(asset) => {
          if (libraryKind === 'video' && asset.kind !== 'video') return;
          if (libraryKind === 'image' && asset.kind !== 'image') return;
          onPickLibrary(asset);
        }}
      />
    </div>
  );
}

function editorHasText(el: HTMLElement): boolean {
  return Boolean(el.textContent?.replace(/\u00a0/g, ' ').trim());
}

function ToolBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="mx-0.5 h-4 w-px bg-[var(--line)]" />;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1]! : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}
