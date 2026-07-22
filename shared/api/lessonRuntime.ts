/**
 * Builds a full lesson document for the HyperClass runtime.
 * Courses ship content fragments; the app injects CSS, extensions, and widgets.
 */

const EXTENSION_CDN: Record<string, string[]> = {
  mermaid: ['https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js'],
  chartjs: ['https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js'],
  prism: [
    'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js',
    'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js',
    'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-typescript.min.js',
    'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js',
    'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js',
    'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css',
  ],
};

function extractBody(rawHtml: string): string {
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];
  // Already a fragment
  if (!/<html[\s>]/i.test(rawHtml)) return rawHtml;
  return rawHtml;
}

function rewriteWidgets(html: string, courseFolder: string, appOrigin: string): string {
  return html.replace(/<widget\s+id=["']([^"']+)["']\s*\/?>/gi, (_m, id: string) => {
    const src = `${appOrigin}/courses/${courseFolder}/widgets/${id}/index.html`;
    return `<div class="hc-widget" data-widget="${id}"><iframe title="Widget ${id}" src="${src}" loading="lazy"></iframe></div>`;
  });
}

function extensionTags(extensions: string[]): string {
  const tags: string[] = [];
  for (const ext of extensions) {
    const urls = EXTENSION_CDN[ext];
    if (!urls) continue;
    for (const url of urls) {
      if (url.endsWith('.css')) tags.push(`<link rel="stylesheet" href="${url}" />`);
      else tags.push(`<script src="${url}"></script>`);
    }
  }
  return tags.join('\n');
}

export function renderLessonDocument(opts: {
  rawHtml: string;
  courseFolder: string;
  lessonRelPath: string;
  extensions: string[];
  appOrigin: string;
}): string {
  const { rawHtml, courseFolder, lessonRelPath, extensions, appOrigin } = opts;
  const dir = lessonRelPath.includes('/')
    ? lessonRelPath.slice(0, lessonRelPath.lastIndexOf('/') + 1)
    : '';
  const baseHref = `${appOrigin}/courses/${courseFolder}/${dir}`;
  let body = extractBody(rawHtml);
  body = rewriteWidgets(body, courseFolder, appOrigin);
  const articleInner = /^\s*<article[\s>]/i.test(body)
    ? body
    : `<article class="hc-article">\n${body}\n  </article>`;

  const runtimeCss = `${appOrigin}/runtime/lesson.css`;
  const runtimeJs = `${appOrigin}/runtime/lesson.js`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base href="${baseHref}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${runtimeCss}" />
  ${extensionTags(extensions)}
  <style id="hyperclass-scrollbar">html{scrollbar-width:thin;scrollbar-color:#b8bec8 transparent}::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:#b8bec8;border-radius:999px;border:2px solid transparent;background-clip:padding-box}::-webkit-scrollbar-track{background:transparent}</style>
</head>
<body class="hc-lesson">
  ${articleInner}
  <script src="${runtimeJs}"></script>
</body>
</html>`;
}
