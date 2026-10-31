import {
  assertCurrencyCode,
  assertNonNegativeInteger,
  assertObjectFields,
  assertPositiveInteger,
  assertRequiredString,
  assertIdentifier,
} from '../../shared/validation/validate.js';

export function validateCreateTicketTierInput(input) {
  assertObjectFields(input, ['eventId', 'name', 'priceMinor', 'currency', 'capacity'], 'ticket tier');

  return {
    eventId: assertIdentifier(input.eventId, 'eventId'),
    name: assertRequiredString(input.name, 'name', { maxLength: 100 }),
    priceMinor: assertNonNegativeInteger(input.priceMinor, 'priceMinor'),
    currency: assertCurrencyCode(input.currency),
    capacity: assertPositiveInteger(input.capacity, 'capacity'),
  };
}