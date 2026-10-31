import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookingReference, createSecureId } from '../../src/shared/security/secure-id.js';

test('secure identifiers have the requested prefix and cryptographic hex payload', () => {
  const identifier = createSecureId('event');

  assert.match(identifier, /^event_[a-f0-9]{32}$/);
});

test('booking references have a stable public format', () => {
  assert.match(createBookingReference(), /^BK-[A-F0-9]{32}$/);
});

test('generated identifiers and booking references are unique across a sample', () => {
  const identifiers = new Set(Array.from({ length: 500 }, () => createSecureId('test')));
  const references = new Set(Array.from({ length: 500 }, () => createBookingReference()));

  assert.equal(identifiers.size, 500);
  assert.equal(references.size, 500);
});

test('identifier prefixes reject unsafe characters', () => {
  assert.throws(() => createSecureId('../event'), TypeError);
});