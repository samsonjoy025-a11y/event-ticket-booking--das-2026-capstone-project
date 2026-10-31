export function getServerConfig(environment = process.env) {
  const rawPort = environment.PORT ?? '3000';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new TypeError('PORT must be an integer between 1 and 65535.');
  }

  const host = environment.HOST ?? '127.0.0.1';
  if (typeof host !== 'string' || host.length === 0 || host.includes('\0')) {
    throw new TypeError('HOST must be a non-empty hostname.');
  }

  return Object.freeze({ host, port });
}