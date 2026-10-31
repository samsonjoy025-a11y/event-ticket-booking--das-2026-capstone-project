import { randomBytes } from 'node:crypto';

const ID_BYTES = 16;
const REFERENCE_BYTES = 16;

export function createSecureId(prefix = 'id') {
  if (typeof prefix !== 'string' || !/^[a-z][a-z0-9-]*$/i.test(prefix)) {
    throw new TypeError('Identifier prefix must be a simple alphanumeric label.');
  }

  return `${prefix}_${randomBytes(ID_BYTES).toString('hex')}`;
}

export function createBookingReference() {
  return `BK-${randomBytes(REFERENCE_BYTES).toString('hex').toUpperCase()}`;
}