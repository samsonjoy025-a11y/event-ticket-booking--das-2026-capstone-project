import {
  assertObjectFields,
  assertRequiredString,
  assertValidDate,
} from '../../shared/validation/validate.js';

export function validateCreateEventInput(input) {
  assertObjectFields(input, ['title', 'city', 'venue', 'eventDate'], 'event');

  return {
    title: assertRequiredString(input.title, 'title'),
    city: assertRequiredString(input.city, 'city'),
    venue: assertRequiredString(input.venue, 'venue'),
    eventDate: assertValidDate(input.eventDate, 'eventDate').toISOString(),
  };
}