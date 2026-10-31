import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/error-codes.js';
import { assertCurrencyCode, assertNonNegativeInteger } from '../../shared/validation/validate.js';

const ALLOWED_OPTIONS = new Set([
  'query',
  'city',
  'startDate',
  'endDate',
  'minPriceMinor',
  'maxPriceMinor',
  'currency',
  'availableOnly',
  'sortBy',
  'sortDirection',
]);

const SORT_FIELDS = new Set(['date', 'price', 'availability']);
const SORT_DIRECTIONS = new Set(['asc', 'desc']);
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

function validationError(message) {
  throw new AppError(ERROR_CODES.VALIDATION, message);
}

function parseDateBoundary(value, fieldName, isEnd) {
  if (typeof value !== 'string') validationError(`${fieldName} must be an ISO date or timestamp.`);

  const dateMatch = ISO_DATE_PATTERN.exec(value);
  if (dateMatch) {
    const parsedDate = new Date(`${value}T00:00:00.000Z`);
    if (parsedDate.toISOString().slice(0, 10) !== value) {
      validationError(`${fieldName} must be a valid calendar date.`);
    }
    if (isEnd) parsedDate.setUTCHours(23, 59, 59, 999);
    return parsedDate.getTime();
  }

  const dateTimeMatch = ISO_DATETIME_PATTERN.exec(value);
  if (!dateTimeMatch) {
    validationError(`${fieldName} must include an explicit timezone offset.`);
  }

  const [, year, month, day, hour, minute, second] = dateTimeMatch;
  const calendarDate = `${year}-${month}-${day}`;
  if (new Date(`${calendarDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== calendarDate
    || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) {
    validationError(`${fieldName} must be a valid ISO timestamp.`);
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) validationError(`${fieldName} must be a valid ISO timestamp.`);
  return timestamp;
}

function optionalText(value, fieldName, maxLength) {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    validationError(`${fieldName} must be a string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

export function validateDiscoveryOptions(input = {}) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    validationError('Discovery options must be an object.');
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_OPTIONS.has(key)) validationError('Unsupported discovery option.');
  }

  const query = optionalText(input.query, 'query', 200);
  const city = optionalText(input.city, 'city', 120);
  const startTimestamp = input.startDate === undefined
    ? undefined
    : parseDateBoundary(input.startDate, 'startDate', false);
  const endTimestamp = input.endDate === undefined
    ? undefined
    : parseDateBoundary(input.endDate, 'endDate', true);

  if (startTimestamp !== undefined && endTimestamp !== undefined && startTimestamp > endTimestamp) {
    validationError('startDate must not be later than endDate.');
  }

  const minPriceMinor = input.minPriceMinor === undefined
    ? undefined
    : assertNonNegativeInteger(input.minPriceMinor, 'minPriceMinor');
  const maxPriceMinor = input.maxPriceMinor === undefined
    ? undefined
    : assertNonNegativeInteger(input.maxPriceMinor, 'maxPriceMinor');
  if (minPriceMinor !== undefined && maxPriceMinor !== undefined && minPriceMinor > maxPriceMinor) {
    validationError('minPriceMinor must not exceed maxPriceMinor.');
  }

  const sortBy = input.sortBy;
  if (sortBy !== undefined && (typeof sortBy !== 'string' || !SORT_FIELDS.has(sortBy))) {
    validationError('sortBy must be date, price, or availability.');
  }

  const sortDirection = input.sortDirection;
  if (sortDirection !== undefined && (typeof sortDirection !== 'string' || !SORT_DIRECTIONS.has(sortDirection))) {
    validationError('sortDirection must be asc or desc.');
  }
  if (sortDirection !== undefined && sortBy === undefined) {
    validationError('sortDirection requires sortBy.');
  }

  if (input.availableOnly !== undefined && typeof input.availableOnly !== 'boolean') {
    validationError('availableOnly must be a boolean.');
  }

  const requiresPrice = minPriceMinor !== undefined || maxPriceMinor !== undefined || sortBy === 'price';
  if (requiresPrice && input.currency === undefined) {
    validationError('currency is required for price filtering or sorting.');
  }
  if (!requiresPrice && input.currency !== undefined) {
    validationError('currency is only valid for price filtering or sorting.');
  }
  const currency = input.currency === undefined ? undefined : assertCurrencyCode(input.currency);

  return Object.freeze({
    query,
    normalizedQuery: query.toLowerCase(),
    city,
    normalizedCity: city.toLowerCase(),
    startTimestamp,
    endTimestamp,
    minPriceMinor,
    maxPriceMinor,
    currency,
    availableOnly: input.availableOnly ?? false,
    sortBy,
    sortDirection: sortDirection ?? (sortBy === 'availability' ? 'desc' : 'asc'),
    requiresTicketData: requiresPrice || input.availableOnly === true || sortBy === 'availability',
  });
}