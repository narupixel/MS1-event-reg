import { createRegistration } from "./model.js";

export class RegistrationConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "RegistrationConflictError";
  }
}

export async function createRegistrationRecord({
  eventId,
  attributes,
  eventRepository,
  registrationRepository,
  createId,
  now = new Date(),
}) {
  const registration = createRegistration({
    ...attributes,
    id: createId(),
    eventId,
    status: "confirmed",
    createdAt: now.toISOString(),
  });
  const event = await eventRepository.find(eventId);

  if (!event || event.status !== "published") {
    throw new RegistrationConflictError(
      "This event is not currently open for registration.",
    );
  }

  if (Date.parse(event.startsAt) <= now.getTime()) {
    throw new RegistrationConflictError("Registration has closed for this event.");
  }

  const registrationCount = await registrationRepository.countByEvent(eventId);

  if (registrationCount >= event.capacity) {
    throw new RegistrationConflictError("This event has reached capacity.");
  }

  return registrationRepository.create(registration);
}

export async function readRegistrations({
  eventRepository,
  registrationRepository,
}) {
  const registrations = await registrationRepository.list();
  const records = await Promise.all(
    registrations.map(async (registration) => {
      const event = await eventRepository.find(registration.eventId);

      return Object.freeze({
        ...registration,
        eventTitle: event?.title ?? "Unavailable event",
      });
    }),
  );

  return records.sort(
    (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
  );
}

export async function cancelRegistrationRecord({
  id,
  registrationRepository,
}) {
  const registration = await registrationRepository.find(id);

  if (!registration) {
    throw new Error("The registration could not be found.");
  }

  if (registration.status === "canceled") {
    return registration;
  }

  return registrationRepository.update(
    Object.freeze({ ...registration, status: "canceled" }),
  );
}

export async function removeRegistrationRecord({
  id,
  registrationRepository,
}) {
  const registration = await registrationRepository.find(id);

  if (!registration) {
    throw new Error("The registration could not be found.");
  }

  if (registration.status !== "canceled") {
    throw new Error("Cancel the registration before removing its record.");
  }

  return registrationRepository.remove(id);
}
