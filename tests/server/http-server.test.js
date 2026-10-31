import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHttpServer } from '../../src/server/http-server.js';
import { startServer } from '../../src/application/server.js';

async function withServer(run, clock = () => new Date('2030-01-02T03:04:05.000Z')) {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'ticketing-http-'));
  const publicDirectory = path.join(temporaryDirectory, 'public');
  await mkdir(publicDirectory);
  await writeFile(path.join(publicDirectory, 'index.html'), '<h1>fixture</h1>');
  await writeFile(path.join(publicDirectory, 'site.css'), 'body { color: black; }');
  await writeFile(path.join(publicDirectory, '.env'), 'PRIVATE=secret');
  await writeFile(path.join(temporaryDirectory, 'secret.txt'), 'outside public root');

  const server = createHttpServer({
    publicDirectory,
    clock,
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    startServer({ config: { port: 0, host: '127.0.0.1' }, server });
    server.once('listening', resolve);
  });

  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections?.();
    });
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

test('GET /health returns a deterministic liveness response without infrastructure details', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(await response.json(), {
      status: 'ok',
      service: 'event-ticketing-platform',
      timestamp: '2030-01-02T03:04:05.000Z',
    });
  });
});

test('GET serves only supported files under public with correct content types', async () => {
  await withServer(async (baseUrl) => {
    const html = await fetch(`${baseUrl}/`);
    assert.equal(html.status, 200);
    assert.equal(html.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.equal(await html.text(), '<h1>fixture</h1>');

    const css = await fetch(`${baseUrl}/site.css`);
    assert.equal(css.status, 200);
    assert.equal(css.headers.get('content-type'), 'text/css; charset=utf-8');
    assert.equal(css.headers.get('x-content-type-options'), 'nosniff');
  });
});

test('missing files, hidden files, and traversal requests do not expose private files', async () => {
  await withServer(async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/missing.js`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), {
      error: { code: 'NOT_FOUND', message: 'Resource was not found.' },
    });

    assert.equal((await fetch(`${baseUrl}/.env`)).status, 404);
    const traversal = await fetch(`${baseUrl}/%2e%2e%2fsecret.txt`);
    assert.equal(traversal.status, 404);
    assert.deepEqual(await traversal.json(), {
      error: { code: 'NOT_FOUND', message: 'Resource was not found.' },
    });
  });
});

test('unsupported methods and unknown non-file routes return safe errors', async () => {
  await withServer(async (baseUrl) => {
    const methodResponse = await fetch(`${baseUrl}/health`, { method: 'POST' });
    assert.equal(methodResponse.status, 405);
    assert.equal(methodResponse.headers.get('allow'), 'GET');
    assert.deepEqual(await methodResponse.json(), {
      error: { code: 'INVALID_STATE', message: 'HTTP method is not supported.' },
    });

    assert.equal((await fetch(`${baseUrl}/api/not-implemented`)).status, 404);
  });
});

test('unexpected controller failures return sanitized JSON without stack details', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 500);
    const body = await response.text();
    assert.equal(body, JSON.stringify({
      error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' },
    }));
    assert.doesNotMatch(body, /private clock failure|Error|stack/);
  }, () => {
    throw new Error('private clock failure');
  });
});
