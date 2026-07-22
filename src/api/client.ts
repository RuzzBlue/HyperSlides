import type { ApiRequest, ApiResponse } from '@shared/types';

const API_ORIGIN =
  typeof window !== 'undefined' && window.location?.origin?.startsWith('http')
    ? window.location.origin.includes('5173')
      ? 'http://127.0.0.1:8765'
      : window.location.origin
    : 'http://127.0.0.1:8765';

/**
 * Dual-runtime client:
 * - Electron → window.hyperslide.fetch (IPC → handleApiRequest)
 * - Browser  → HTTP /api/* (Express → same handleApiRequest)
 */
export async function apiFetch<T = unknown>(req: ApiRequest): Promise<ApiResponse<T>> {
  if (window.hyperslide?.fetch) {
    return window.hyperslide.fetch(req) as Promise<ApiResponse<T>>;
  }

  const url = new URL(req.path.startsWith('/api') ? req.path : `/api${req.path}`, API_ORIGIN);
  if (req.params) {
    for (const [k, v] of Object.entries(req.params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
  });

  const json = (await res.json()) as ApiResponse<T>;
  return json;
}

export function courseStaticUrl(folder: string, relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '');
  return `http://127.0.0.1:8765/courses/${folder}/${clean}`;
}

export function isElectronRuntime(): boolean {
  return Boolean(window.hyperslide?.isElectron);
}
