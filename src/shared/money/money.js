import { AppError } from '../errors/app-error.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { assertCurrencyCode, assertNonNegativeInteger } from '../validation/validate.js';

export function createMoney(amountMinor, currency) {
  return Object.freeze({
    amountMinor: assertNonNegativeInteger(amountMinor, 'amountMinor'),
    currency: assertCurrencyCode(currency),
  });
}

export function addMoney(left, right) {
  const first = createMoney(left?.amountMinor, left?.currency);
  const second = createMoney(right?.amountMinor, right?.currency);
  if (first.currency !== second.currency) {
    throw new AppError(ERROR_CODES.VALIDATION, 'Money values must use the same currency.');
  }

  const total = first.amountMinor + second.amountMinor;
  if (!Number.isSafeInteger(total)) {
    throw new AppError(ERROR_CODES.VALIDATION, 'Money total exceeds the supported range.');
  }

  return createMoney(total, first.currency);
}

export function multiplyMoney(money, quantity) {
  const amount = createMoney(money?.amountMinor, money?.currency);
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new AppError(ERROR_CODES.VALIDATION, 'quantity must be a positive safe integer.');
  }

  const total = amount.amountMinor * quantity;
  if (!Number.isSafeInteger(total)) {
    throw new AppError(ERROR_CODES.VALIDATION, 'Money total exceeds the supported range.');
  }

  return createMoney(total, amount.currency);
}