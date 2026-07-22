import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from '../shared/api/handleApiRequest.ts';
import { getCoursesRoot } from '../shared/api/courses.ts';
import type { ApiMethod } from '../shared/types.ts';

export function resolveAppRoot(): string {
  // When packaged, courses live in resources; in dev, project root
  const candidates = [
    process.env.CRYPTOHUB_ROOT,
    path.resolve(process.cwd()),
    path.resolve(process.cwd(), '..'),
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'courses'))) return c;
  }
  return path.resolve(process.cwd());
}

export function createServer(options?: { appRoot?: string; serveDist?: boolean }) {
  const appRoot = options?.appRoot ?? resolveAppRoot();
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '4mb' }));

  // Static course packages (lessons, assets)
  app.use('/courses', express.static(getCoursesRoot(appRoot)));

  // Unified API adapter → handleApiRequest
  app.all('/api/*', async (req, res) => {
    const apiPath = req.path; // /api/...
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') params[k] = v;
    }

    const result = await handleApiRequest(
      {
        method: req.method.toUpperCase() as ApiMethod,
        path: apiPath,
        body: req.body,
        params,
      },
      { appRoot },
    );

    res.status(result.status).json(result);
  });

  if (options?.serveDist !== false) {
    const dist = path.join(appRoot, 'dist');
    if (fs.existsSync(dist)) {
      app.use(express.static(dist));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(dist, 'index.html'));
      });
    }
  }

  return { app, appRoot };
}

export async function startServer(port = 8765, options?: { appRoot?: string; serveDist?: boolean }) {
  const { app, appRoot } = createServer(options);
  return new Promise<{ port: number; appRoot: string }>((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => {
      resolve({ port, appRoot });
    });
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // Another HyperSlide server already serving courses/API — OK for Electron
        console.warn(`Port ${port} in use — reusing existing local server`);
        resolve({ port, appRoot });
        return;
      }
      reject(err);
    });
  });
}
