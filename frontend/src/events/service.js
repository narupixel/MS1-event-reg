import {
  createEvent,
  EventValidationError,
  validatePublication,
} from "./model.js";

export class EventRemovalError extends Error {
  constructor(message) {
    super(message);
    this.name = "EventRemovalError";
  }
}

async function summarizeEvent(event, registrationRepository) {
  const [registrationCount, registrationRecordCount] = await Promise.all([
    registrationRepository.countByEvent(event.id),
    registrationRepository.countAllByEvent(event.id),
  ]);

  return Object.freeze({
    ...event,
    registrationCount,
    registrationRecordCount,
    remainingCapacity: Math.max(event.capacity - registrationCount, 0),
  });
}

export async function createEventRecord({
  attributes,
  eventRepository,
  createId,
  now = new Date(),
}) {
  const event = createEvent({ ...attributes, id: createId() });
  const errors = validatePublication(event, now);

  if (Object.keys(errors).length > 0) {
    throw new EventValidationError(errors);
  }

  return eventRepository.create(event);
}

export async function readEvent({
  id,
  eventRepository,
  registrationRepository,
}) {
  const event = await eventRepository.find(id);

  return event ? summarizeEvent(event, registrationRepository) : null;
}

export async function readEvents({ eventRepository, registrationRepository }) {
  const events = await eventRepository.list();
  const summaries = await Promise.all(
    events.map((event) => summarizeEvent(event, registrationRepository)),
  );

  return summaries.sort(
    (first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt),
  );
}

export async function readOpenEvents({
  eventRepository,
  registrationRepository,
  now = new Date(),
}) {
  const events = await readEvents({ eventRepository, registrationRepository });

  return events.filter(
    (event) =>
      event.status === "published" &&
      Date.parse(event.startsAt) > now.getTime() &&
      event.remainingCapacity > 0,
  );
}

export async function updateEventRecord({
  id,
  attributes,
  eventRepository,
  registrationRepository,
  now = new Date(),
}) {
  const event = createEvent({ ...attributes, id });
  const errors = validatePublication(event, now);
  const registrationCount = await registrationRepository.countByEvent(id);

  if (event.capacity < registrationCount) {
    errors.capacity = `Capacity cannot be lower than ${registrationCount}.`;
  }

  if (Object.keys(errors).length > 0) {
    throw new EventValidationError(errors);
  }

  return eventRepository.update(event);
}

export async function removeEventRecord({
  id,
  eventRepository,
  registrationRepository,
}) {
  const event = await eventRepository.find(id);

  if (!event) {
    throw new EventRemovalError("The event could not be found.");
  }

  const registrationCount = await registrationRepository.countAllByEvent(id);

  if (registrationCount > 0) {
    throw new EventRemovalError(
      "Remove or cancel this event's registrations before removing the event.",
    );
  }

  return eventRepository.remove(id);
}
