import { createBookingReference } from '../../shared/security/secure-id.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/error-codes.js';
import { assertRequiredString } from '../../shared/validation/validate.js';
import { MAX_BOOKING_REFERENCE_ATTEMPTS } from '../../shared/config/constants.js';

export function createUniqueBookingReference(existingReferences, referenceGenerator = createBookingReference) {
  for (let attempt = 0; attempt < MAX_BOOKING_REFERENCE_ATTEMPTS; attempt += 1) {
    const reference = assertRequiredString(referenceGenerator(), 'generated booking reference', { maxLength: 64 });
    if (!existingReferences.has(reference)) return reference;
  }

  throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Unable to allocate a unique booking reference.');
}