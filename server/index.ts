import { startServer } from './createServer.ts';

const port = Number(process.env.PORT || 8765);

const { appRoot } = await startServer(port, { serveDist: true });
console.log(`HyperClass server running at http://127.0.0.1:${port}`);
console.log(`Courses root: ${appRoot}/courses`);
