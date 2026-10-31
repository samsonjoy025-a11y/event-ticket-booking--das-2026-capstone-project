import { pathToFileURL } from 'node:url';
import { createHttpServer } from '../server/http-server.js';
import { getServerConfig } from '../shared/config/server.config.js';

export function startServer({ config = getServerConfig(), server = createHttpServer() } = {}) {
  server.listen(config.port, config.host);
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = startServer();
  server.on('listening', () => {
    const address = server.address();
    console.log(`Event ticketing server listening on ${address.address}:${address.port}`);
  });
  server.on('error', () => {
    console.error('Event ticketing server failed to start.');
    process.exitCode = 1;
  });
}