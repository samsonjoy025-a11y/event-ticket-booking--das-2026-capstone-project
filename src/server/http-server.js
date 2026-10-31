import { createServer } from 'node:http';
import { createRouter } from './router.js';

export function createHttpServer(options = {}) {
  const router = createRouter(options);
  return createServer((request, response) => {
    void router(request, response).catch(() => {
      if (response.headersSent) {
        response.destroy();
        return;
      }

      response.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' },
      }));
    });
  });
}