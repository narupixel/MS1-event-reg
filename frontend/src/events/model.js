export const EVENT_STATUSES = Object.freeze(["draft", "published", "closed"]);

export class EventValidationError extends Error {
  constructor(errors) {
    super("The event is invalid.");
    this.name = "EventValidationError";
    this.errors = errors;
  }
}

export function validateEvent(event) {
  const errors = {};

  if (!event.id) {
    errors.id = "An event ID is required.";
  }

  if (!event.title) {
    errors.title = "An event title is required.";
  }

  if (!event.description) {
    errors.description = "An event description is required.";
  }

  if (!event.venue) {
    errors.venue = "A venue is required.";
  }

  if (Number.isNaN(Date.parse(event.startsAt))) {
    errors.startsAt = "A valid event schedule is required.";
  }

  if (!Number.isInteger(event.capacity) || event.capacity < 1) {
    errors.capacity = "Capacity must be a positive whole number.";
  }

  if (!EVENT_STATUSES.includes(event.status)) {
    errors.status = "The event status is not supported.";
  }

  return errors;
}

export function validatePublication(event, now = new Date()) {
  if (event.status !== "published") {
    return {};
  }

  if (Date.parse(event.startsAt) <= now.getTime()) {
    return {
      startsAt: "A published event must be scheduled in the future.",
    };
  }

  return {};
}

export function createEvent(attributes) {
  const event = {
    id: String(attributes.id ?? "").trim(),
    title: String(attributes.title ?? "").trim(),
    description: String(attributes.description ?? "").trim(),
    startsAt: String(attributes.startsAt ?? "").trim(),
    timeZone: String(attributes.timeZone ?? "Asia/Manila").trim(),
    venue: String(attributes.venue ?? "").trim(),
    capacity: Number(attributes.capacity),
    status: String(attributes.status ?? "draft").trim().toLowerCase(),
  };
  const errors = validateEvent(event);

  if (Object.keys(errors).length > 0) {
    throw new EventValidationError(errors);
  }

  return Object.freeze(event);
}
