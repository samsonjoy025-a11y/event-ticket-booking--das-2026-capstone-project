import { realpath, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PUBLIC_DIRECTORY = fileURLToPath(new URL('../../public/', import.meta.url));
const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
]);

function sendJson(response, statusCode, code, message) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify({ error: { code, message } }));
}

function containsPath(root, candidate) {
  const relativePath = path.relative(root, candidate);
  return relativePath === '' || (!relativePath.startsWith(`..${path.sep}`)
    && relativePath !== '..' && !path.isAbsolute(relativePath));
}

function hasUnsafePath(rawPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return true;
  }

  if (decodedPath.includes('\0') || decodedPath.includes('\\')) return true;
  return decodedPath.split('/').some((segment) => (
    segment === '.' || segment === '..' || (segment.startsWith('.') && segment.length > 0)
  ));
}

function getRawPath(requestUrl) {
  if (typeof requestUrl !== 'string' || !requestUrl.startsWith('/')) return null;
  const queryIndex = requestUrl.indexOf('?');
  const fragmentIndex = requestUrl.indexOf('#');
  const endIndex = [queryIndex, fragmentIndex].filter((index) => index >= 0)
    .reduce((lowest, index) => Math.min(lowest, index), requestUrl.length);
  return requestUrl.slice(0, endIndex);
}

export function createStaticController({ publicDirectory = DEFAULT_PUBLIC_DIRECTORY } = {}) {
  const configuredPublicDirectory = path.resolve(publicDirectory);

  return Object.freeze({
    async serve(request, response, pathname) {
      const rawPath = getRawPath(request.url);
      if (!rawPath || hasUnsafePath(rawPath)) {
        sendJson(response, 404, 'NOT_FOUND', 'Resource was not found.');
        return;
      }

      let publicRoot;
      let requestedFile;
      try {
        publicRoot = await realpath(configuredPublicDirectory);
        const relativeUrlPath = decodeURIComponent(pathname).replace(/^\/+/, '');
        const fileName = relativeUrlPath || 'index.html';
        requestedFile = path.resolve(publicRoot, fileName);
        if (!containsPath(publicRoot, requestedFile)) {
          sendJson(response, 404, 'NOT_FOUND', 'Resource was not found.');
          return;
        }

        const actualFile = await realpath(requestedFile);
        if (!containsPath(publicRoot, actualFile)) {
          sendJson(response, 404, 'NOT_FOUND', 'Resource was not found.');
          return;
        }

        const fileStats = await stat(actualFile);
        const contentType = MIME_TYPES.get(path.extname(actualFile).toLowerCase());
        if (!fileStats.isFile() || !contentType) {
          sendJson(response, 404, 'NOT_FOUND', 'Resource was not found.');
          return;
        }

        const contents = await readFile(actualFile);
        response.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': contents.length,
          'Cache-Control': 'no-cache',
          'X-Content-Type-Options': 'nosniff',
        });
        response.end(contents);
      } catch (error) {
        if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
          sendJson(response, 404, 'NOT_FOUND', 'Resource was not found.');
          return;
        }

        sendJson(response, 500, 'INTERNAL_ERROR', 'The request could not be completed.');
      }
    },
  });
}