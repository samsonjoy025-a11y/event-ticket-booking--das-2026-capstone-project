import {
  assertObjectFields,
  assertRequiredString,
  assertIdentifier,
} from '../../shared/validation/validate.js';

export function validateWaitlistAttendee(input) {
  assertObjectFields(input, ['ticketTierId', 'attendeeId', 'displayName'], 'waitlist attendee');

  return {
    ticketTierId: assertIdentifier(input.ticketTierId, 'ticketTierId'),
    attendeeId: assertIdentifier(input.attendeeId, 'attendeeId'),
    displayName: assertRequiredString(input.displayName, 'displayName', { maxLength: 100 }),
  };
}