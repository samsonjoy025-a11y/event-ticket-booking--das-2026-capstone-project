import { AppError } from '../errors/app-error.js';
import { ERROR_CODES } from '../errors/error-codes.js';

function validationError(message) {
  throw new AppError(ERROR_CODES.VALIDATION, message);
}

export function assertRequiredString(value, fieldName, { maxLength = 200 } = {}) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength) {
    validationError(`${fieldName} must be a non-empty string of at most ${maxLength} characters.`);
  }

  return value.trim();
}

export function assertPositiveInteger(value, fieldName) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    validationError(`${fieldName} must be a positive safe integer.`);
  }

  return value;
}

export function assertNonNegativeInteger(value, fieldName) {
  if (!Number.isSafeInteger(value) || value < 0) {
    validationError(`${fieldName} must be a non-negative safe integer.`);
  }

  return value;
}

export function assertValidDate(value, fieldName) {
  const parsedDate = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(parsedDate.getTime())) {
    validationError(`${fieldName} must be a valid date.`);
  }

  return parsedDate;
}

export function assertCurrencyCode(value, fieldName = 'currency') {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) {
    validationError(`${fieldName} must be a three-letter uppercase currency code.`);
  }

  return value;
}

export function assertIdentifier(value, fieldName = 'identifier') {
  if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{1,127}$/.test(value)) {
    validationError(`${fieldName} must be a valid identifier.`);
  }

  return value;
}

export function assertObjectFields(value, fieldNames, objectName = 'input') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    validationError(`${objectName} must be an object.`);
  }

  for (const fieldName of fieldNames) {
    if (!Object.hasOwn(value, fieldName)) {
      validationError(`${fieldName} is required.`);
    }
  }

  return value;
}