import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/error-codes.js';
import { createSecureId } from '../../shared/security/secure-id.js';
import { assertIdentifier, assertPositiveInteger } from '../../shared/validation/validate.js';
import { MAX_ID_GENERATION_ATTEMPTS } from '../../shared/config/constants.js';
import { validateCreateTicketTierInput } from './ticket.validation.js';

function makeUniqueId(records, idGenerator, prefix) {
  for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
    const id = assertIdentifier(idGenerator(prefix), 'generated identifier');
    if (!records.has(id)) return id;
  }

  throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'Unable to allocate a unique identifier.');
}

function copyTier(tier) {
  return {
    id: tier.id,
    eventId: tier.eventId,
    name: tier.name,
    priceMinor: tier.priceMinor,
    currency: tier.currency,
    capacity: tier.capacity,
    availableQuantity: tier.capacity - tier.reservedQuantity,
  };
}

export function createTicketService({ events, idGenerator = createSecureId } = {}) {
  if (!events || typeof events.getEvent !== 'function' || typeof events.associateTicketTier !== 'function') {
    throw new TypeError('Ticket service requires the event service public interface.');
  }

  const tiers = new Map();

  function getStoredTier(ticketTierId) {
    const id = assertIdentifier(ticketTierId, 'ticketTierId');
    const tier = tiers.get(id);
    if (!tier) throw new AppError(ERROR_CODES.NOT_FOUND, 'Ticket tier was not found.');
    return tier;
  }

  return Object.freeze({
    createTicketTier(input) {
      const tierInput = validateCreateTicketTierInput(input);
      events.getEvent(tierInput.eventId);
      const tierId = makeUniqueId(tiers, idGenerator, 'tier');
      const tier = { id: tierId, ...tierInput, reservedQuantity: 0 };
      events.associateTicketTier(tierInput.eventId, tierId);
      tiers.set(tierId, tier);
      return copyTier(tier);
    },

    getTicketTier(ticketTierId) {
      return copyTier(getStoredTier(ticketTierId));
    },

    getAvailableQuantity(ticketTierId) {
      const tier = getStoredTier(ticketTierId);
      return tier.capacity - tier.reservedQuantity;
    },

    reserveInventory(ticketTierId, quantity) {
      const tier = getStoredTier(ticketTierId);
      const requestedQuantity = assertPositiveInteger(quantity, 'quantity');
      const available = tier.capacity - tier.reservedQuantity;
      if (requestedQuantity > available) {
        throw new AppError(ERROR_CODES.SOLD_OUT, 'Not enough tickets are available.');
      }

      const reserved = { ...tier, reservedQuantity: tier.reservedQuantity + requestedQuantity };
      tiers.set(tier.id, reserved);
      return copyTier(reserved);
    },

    releaseInventory(ticketTierId, quantity) {
      const tier = getStoredTier(ticketTierId);
      const releasedQuantity = assertPositiveInteger(quantity, 'quantity');
      if (releasedQuantity > tier.reservedQuantity) {
        throw new AppError(ERROR_CODES.INVALID_STATE, 'Cannot release more tickets than are reserved.');
      }

      const released = { ...tier, reservedQuantity: tier.reservedQuantity - releasedQuantity };
      tiers.set(tier.id, released);
      return copyTier(released);
    },
  });
}