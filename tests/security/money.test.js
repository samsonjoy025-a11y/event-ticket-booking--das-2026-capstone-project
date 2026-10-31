import test from 'node:test';
import assert from 'node:assert/strict';
import { addMoney, createMoney, multiplyMoney } from '../../src/shared/money/money.js';
import { ERROR_CODES } from '../../src/shared/errors/error-codes.js';

test('money operations use integer minor units and explicit currencies', () => {
  assert.deepEqual(createMoney(199, 'USD'), { amountMinor: 199, currency: 'USD' });
  assert.deepEqual(addMoney(createMoney(199, 'USD'), createMoney(1, 'USD')),
    { amountMinor: 200, currency: 'USD' });
  assert.deepEqual(multiplyMoney(createMoney(125, 'NGN'), 3),
    { amountMinor: 375, currency: 'NGN' });
});

test('money rejects decimals, negative amounts, invalid currency, mismatches, and overflow', () => {
  for (const amount of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => createMoney(amount, 'USD'), (error) => error.code === ERROR_CODES.VALIDATION);
  }
  assert.throws(() => createMoney(100, 'usd'), (error) => error.code === ERROR_CODES.VALIDATION);
  assert.throws(() => addMoney(createMoney(1, 'USD'), createMoney(1, 'EUR')),
    (error) => error.code === ERROR_CODES.VALIDATION);
  assert.throws(() => multiplyMoney(createMoney(Number.MAX_SAFE_INTEGER, 'USD'), 2),
    (error) => error.code === ERROR_CODES.VALIDATION);
});