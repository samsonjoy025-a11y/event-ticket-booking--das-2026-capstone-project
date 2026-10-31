import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDiscoveryOptions } from '../../src/services/event-discovery-service/discovery.validation.js';
import { ERROR_CODES } from '../../src/shared/errors/error-codes.js';

test('normalizes text and applies documented sorting defaults', () => {
  assert.equal(validateDiscoveryOptions({ query: '  Tech  ' }).normalizedQuery, 'tech');
  assert.equal(validateDiscoveryOptions({ city: ' Lagos ' }).normalizedCity, 'lagos');
  assert.equal(validateDiscoveryOptions({ sortBy: 'availability' }).sortDirection, 'desc');
  assert.equal(validateDiscoveryOptions({ sortBy: 'date' }).sortDirection, 'asc');
});

test('rejects invalid date order, local-time timestamps, malformed dates, and invalid prices', () => {
  const invalidInputs = [
    { startDate: '2030-05-02', endDate: '2030-05-01' },
    { startDate: '2030-05-01T10:00:00' },
    { startDate: '2030-02-30' },
    { minPriceMinor: 20, maxPriceMinor: 10, currency: 'USD' },
    { minPriceMinor: -1, currency: 'USD' },
    { minPriceMinor: 1.5, currency: 'USD' },
    { minPriceMinor: 1 },
    { sortBy: 'price' },
  ];

  for (const input of invalidInputs) {
    assert.throws(() => validateDiscoveryOptions(input), (error) => error.code === ERROR_CODES.VALIDATION);
  }
});

test('rejects unsupported options, sort directions, currencies, and availability types', () => {
  const invalidInputs = [
    { unsupported: true },
    { sortBy: 'rating' },
    { sortBy: 'date', sortDirection: 'sideways' },
    { sortDirection: 'asc' },
    { availableOnly: 1 },
    { sortBy: 'price', currency: 'usd' },
    { currency: 'USD' },
  ];

  for (const input of invalidInputs) {
    assert.throws(() => validateDiscoveryOptions(input), (error) => error.code === ERROR_CODES.VALIDATION);
  }
});