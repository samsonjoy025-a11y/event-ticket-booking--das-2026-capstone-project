import test from 'node:test';
import assert from 'node:assert/strict';
import { getServerConfig } from '../../src/shared/config/server.config.js';

test('server configuration supplies safe defaults and accepts explicit host and port', () => {
  assert.deepEqual(getServerConfig({}), { host: '127.0.0.1', port: 3000 });
  assert.deepEqual(getServerConfig({ HOST: 'localhost', PORT: '8080' }), { host: 'localhost', port: 8080 });
});

test('server configuration rejects invalid ports and hosts', () => {
  for (const environment of [
    { PORT: '0' },
    { PORT: '65536' },
    { PORT: 'not-a-port' },
    { HOST: '' },
    { HOST: 'bad\0host' },
  ]) {
    assert.throws(() => getServerConfig(environment), TypeError);
  }
});