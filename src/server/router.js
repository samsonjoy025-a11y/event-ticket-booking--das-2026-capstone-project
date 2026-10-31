import { createHealthController } from './health.controller.js';
import { createStaticController } from './static.controller.js';

function sendJson(response, statusCode, body, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

export function createRouter({ clock, publicDirectory } = {}) {
  const healthController = createHealthController({ clock });
  const staticController = createStaticController({ publicDirectory });

  return async function routeRequest(request, response) {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');

    let requestUrl;
    try {
      requestUrl = new URL(request.url, 'http://localhost');
    } catch {
      sendJson(response, 400, { error: { code: 'VALIDATION', message: 'Request path is invalid.' } });
      return;
    }

    if (request.method !== 'GET') {
      request.resume();
      sendJson(response, 405, { error: { code: 'INVALID_STATE', message: 'HTTP method is not supported.' } }, {
        Allow: 'GET',
      });
      return;
    }

    if (requestUrl.pathname === '/health') {
      sendJson(response, 200, healthController.getHealth());
      return;
    }

    try {
      await staticController.serve(request, response, requestUrl.pathname);
    } catch {
      if (!response.headersSent) {
        sendJson(response, 500, { error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' } });
      } else {
        response.destroy();
      }
    }
  };
}