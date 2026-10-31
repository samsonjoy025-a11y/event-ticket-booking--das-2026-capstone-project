import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/error-codes.js';
import { assertIdentifier } from '../../shared/validation/validate.js';
import { LinkedListQueue } from './linked-list-queue.js';
import { validateWaitlistAttendee } from './waitlist.validation.js';

function copyAttendee(attendee) {
  return attendee ? { ...attendee } : null;
}

export function createWaitlistService() {
  const queues = new Map();

  function getQueue(ticketTierId) {
    const id = assertIdentifier(ticketTierId, 'ticketTierId');
    let queueState = queues.get(id);
    if (!queueState) {
      queueState = { queue: new LinkedListQueue(), attendeeIds: new Set() };
      queues.set(id, queueState);
    }

    return queueState;
  }

  return Object.freeze({
    addAttendee(input) {
      const attendee = validateWaitlistAttendee(input);
      const queueState = getQueue(attendee.ticketTierId);
      if (queueState.attendeeIds.has(attendee.attendeeId)) {
        throw new AppError(ERROR_CODES.CONFLICT, 'Attendee is already on this waitlist.');
      }

      queueState.queue.enqueue(attendee);
      queueState.attendeeIds.add(attendee.attendeeId);
      return copyAttendee(attendee);
    },

    removeNextAttendee(ticketTierId) {
      const queueState = getQueue(ticketTierId);
      const attendee = queueState.queue.dequeue();
      if (attendee) queueState.attendeeIds.delete(attendee.attendeeId);
      return copyAttendee(attendee);
    },

    peekNextAttendee(ticketTierId) {
      return copyAttendee(getQueue(ticketTierId).queue.peek());
    },

    isEmpty(ticketTierId) {
      return getQueue(ticketTierId).queue.isEmpty();
    },

    getQueueSize(ticketTierId) {
      return getQueue(ticketTierId).queue.size;
    },
  });
}