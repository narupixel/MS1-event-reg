import test from "node:test";
import assert from "node:assert/strict";

import {
  cancelRegistrationRecord,
  createRegistration,
  createRegistrationMemory,
  createRegistrationRecord,
  isEmailAddress,
  readRegistrations,
  RegistrationConflictError,
  RegistrationValidationError,
  createRegistrationStorage,
  removeRegistrationRecord,
  validateRegistration,
} from "../src/registrations/index.js";
import { createEvent, createEventMemory } from "../src/events/index.js";

const event = createEvent({
  id: "open-event",
  title: "Open Event",
  description: "An event open to registrations.",
  startsAt: "2026-12-10T10:00:00+08:00",
  timeZone: "Asia/Manila",
  venue: "Makati",
  capacity: 2,
  status: "published",
});

const validRegistration = {
  id: "registration-one",
  eventId: event.id,
  attendeeName: "Ada Lovelace",
  email: "ADA@example.com",
  status: "confirmed",
  createdAt: "2026-09-13T01:00:00.000Z",
};

function createStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("createRegistration normalizes attendee details", () => {
  const registration = createRegistration({
    ...validRegistration,
    attendeeName: "  Ada Lovelace  ",
  });

  assert.equal(registration.attendeeName, "Ada Lovelace");
  assert.equal(registration.email, "ada@example.com");
  assert.equal(Object.isFrozen(registration), true);
});

test("createRegistration rejects an invalid email address", () => {
  assert.throws(
    () => createRegistration({ ...validRegistration, email: "not-an-email" }),
    (error) =>
      error instanceof RegistrationValidationError &&
      error.errors.email === "Enter a valid email address.",
  );
});

test("createRegistration rejects unusually long attendee input", () => {
  assert.throws(
    () =>
      createRegistration({
        ...validRegistration,
        attendeeName: "A".repeat(101),
      }),
    (error) =>
      error instanceof RegistrationValidationError &&
      error.errors.attendeeName ===
        "Your name must be 100 characters or fewer.",
  );
});

test("validateRegistration reports every required field and unsupported value", () => {
  assert.deepEqual(
    validateRegistration({
      id: "",
      eventId: "",
      attendeeName: "",
      email: "",
      status: "pending",
      createdAt: "not-a-date",
    }),
    {
      id: "A registration ID is required.",
      eventId: "An event is required.",
      attendeeName: "Your name is required.",
      email: "Enter a valid email address.",
      status: "The registration status is not supported.",
      createdAt: "A valid creation time is required.",
    },
  );

  assert.throws(() => createRegistration({}), RegistrationValidationError);
});

test("createRegistration applies defaults and validates email length", () => {
  const registration = createRegistration({
    ...validRegistration,
    status: undefined,
  });

  assert.equal(registration.status, "confirmed");
  assert.equal(isEmailAddress(registration.email), true);
  assert.equal(isEmailAddress(null), false);
  assert.throws(
    () =>
      createRegistration({
        ...validRegistration,
        email: `${"a".repeat(250)}@x.com`,
      }),
    (error) =>
      error instanceof RegistrationValidationError &&
      error.errors.email === "Your email must be 254 characters or fewer.",
  );
});

test("createRegistrationRecord confirms one available place", async () => {
  const eventRepository = createEventMemory([event]);
  const registrationRepository = createRegistrationMemory();

  const registration = await createRegistrationRecord({
    eventId: event.id,
    attributes: {
      attendeeName: validRegistration.attendeeName,
      email: validRegistration.email,
    },
    eventRepository,
    registrationRepository,
    createId: () => validRegistration.id,
    now: new Date(validRegistration.createdAt),
  });

  assert.equal(registration.status, "confirmed");
  assert.equal(await registrationRepository.countByEvent(event.id), 1);
});

test("createRegistrationRecord rejects a full event", async () => {
  const fullEvent = createEvent({ ...event, capacity: 1 });
  const eventRepository = createEventMemory([fullEvent]);
  const registrationRepository = createRegistrationMemory([
    createRegistration(validRegistration),
  ]);

  await assert.rejects(
    createRegistrationRecord({
      eventId: event.id,
      attributes: { attendeeName: "Grace Hopper", email: "grace@example.com" },
      eventRepository,
      registrationRepository,
      createId: () => "registration-two",
      now: new Date(validRegistration.createdAt),
    }),
    /reached capacity/,
  );
});

test("createRegistrationRecord rejects unavailable event states", async () => {
  const draftEvent = createEvent({ ...event, status: "draft" });
  const eventRepository = createEventMemory([draftEvent]);

  await assert.rejects(
    createRegistrationRecord({
      eventId: event.id,
      attributes: { attendeeName: "Grace Hopper", email: "grace@example.com" },
      eventRepository,
      registrationRepository: createRegistrationMemory(),
      createId: () => "registration-two",
      now: new Date(validRegistration.createdAt),
    }),
    /not currently open/,
  );
});

test("createRegistrationRecord reports a missing event", async () => {
  await assert.rejects(
    createRegistrationRecord({
      eventId: "missing-event",
      attributes: { attendeeName: "Grace Hopper", email: "grace@example.com" },
      eventRepository: createEventMemory(),
      registrationRepository: createRegistrationMemory(),
      createId: () => "registration-two",
      now: new Date(validRegistration.createdAt),
    }),
    (error) =>
      error instanceof RegistrationConflictError &&
      error.message === "This event is not currently open for registration.",
  );
});

test("createRegistrationRecord rechecks the event schedule", async () => {
  const pastEvent = createEvent({
    ...event,
    startsAt: "2026-09-12T10:00:00+08:00",
  });

  await assert.rejects(
    createRegistrationRecord({
      eventId: event.id,
      attributes: { attendeeName: "Grace Hopper", email: "grace@example.com" },
      eventRepository: createEventMemory([pastEvent]),
      registrationRepository: createRegistrationMemory(),
      createId: () => "registration-two",
      now: new Date(validRegistration.createdAt),
    }),
    /Registration has closed/,
  );
});

test("readRegistrations adds the event title", async () => {
  const eventRepository = createEventMemory([event]);
  const registration = createRegistration(validRegistration);
  const registrationRepository = createRegistrationMemory([registration]);

  const records = await readRegistrations({
    eventRepository,
    registrationRepository,
  });

  assert.equal(records[0].eventTitle, event.title);
});

test("readRegistrations sorts newest first and labels a missing event", async () => {
  const older = createRegistration(validRegistration);
  const newer = createRegistration({
    ...validRegistration,
    id: "registration-two",
    eventId: "missing-event",
    createdAt: "2026-09-13T02:00:00.000Z",
  });
  const records = await readRegistrations({
    eventRepository: createEventMemory([event]),
    registrationRepository: createRegistrationMemory([older, newer]),
  });

  assert.deepEqual(
    records.map((registration) => registration.id),
    [newer.id, older.id],
  );
  assert.equal(records[0].eventTitle, "Unavailable event");
  records.forEach((registration) =>
    assert.equal(Object.isFrozen(registration), true),
  );
});

test("cancelRegistrationRecord restores event capacity", async () => {
  const registration = createRegistration(validRegistration);
  const registrationRepository = createRegistrationMemory([registration]);

  const canceled = await cancelRegistrationRecord({
    id: registration.id,
    registrationRepository,
  });

  assert.equal(canceled.status, "canceled");
  assert.equal(await registrationRepository.countByEvent(event.id), 0);
  assert.equal(await registrationRepository.countAllByEvent(event.id), 1);
});

test("cancelRegistrationRecord is idempotent and reports a missing record", async () => {
  const canceled = createRegistration({
    ...validRegistration,
    status: "canceled",
  });
  const registrationRepository = createRegistrationMemory([canceled]);

  assert.equal(
    await cancelRegistrationRecord({ id: canceled.id, registrationRepository }),
    canceled,
  );
  await assert.rejects(
    cancelRegistrationRecord({ id: "missing", registrationRepository }),
    /could not be found/,
  );
});

test("removeRegistrationRecord requires cancellation", async () => {
  const registration = createRegistration(validRegistration);
  const registrationRepository = createRegistrationMemory([registration]);

  await assert.rejects(
    removeRegistrationRecord({ id: registration.id, registrationRepository }),
    /Cancel the registration/,
  );

  await cancelRegistrationRecord({
    id: registration.id,
    registrationRepository,
  });
  await removeRegistrationRecord({
    id: registration.id,
    registrationRepository,
  });

  assert.deepEqual(await registrationRepository.list(), []);
});

test("removeRegistrationRecord reports a missing record", async () => {
  await assert.rejects(
    removeRegistrationRecord({
      id: "missing",
      registrationRepository: createRegistrationMemory(),
    }),
    /could not be found/,
  );
});

test("registration memory store covers duplicate and missing CRUD records", async () => {
  const registration = createRegistration(validRegistration);
  const registrationRepository = createRegistrationMemory([
    registration,
    { eventId: event.id, status: "confirmed" },
  ]);

  assert.equal((await registrationRepository.list()).length, 2);
  assert.equal(await registrationRepository.find(registration.id), registration);
  assert.equal(await registrationRepository.find("initial-1").then(Boolean), true);
  await assert.rejects(registrationRepository.create(registration), /already exists/);
  await assert.rejects(
    registrationRepository.update({ ...registration, id: "missing" }),
    /could not be found/,
  );
  await assert.rejects(registrationRepository.remove("missing"), /could not be found/);
});

test("registration storage repository shares records across instances", async () => {
  const storage = createStorage();
  const firstRepository = createRegistrationStorage(storage, "registrations");
  const secondRepository = createRegistrationStorage(storage, "registrations");

  await firstRepository.create(createRegistration(validRegistration));

  assert.equal((await secondRepository.list()).length, 1);
});
