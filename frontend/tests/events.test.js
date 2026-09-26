import test from "node:test";
import assert from "node:assert/strict";

import {
  createEvent,
  createEventMemory,
  createEventRecord,
  createEventSeed,
  createEventStorage,
  EventRemovalError,
  EventValidationError,
  readEvent,
  readEvents,
  readOpenEvents,
  removeEventRecord,
  updateEventRecord,
  validateEvent,
  validatePublication,
} from "../src/events/index.js";
import { createRegistrationMemory } from "../src/registrations/index.js";

const validEvent = {
  id: "later-event",
  title: "Later Event",
  description: "A valid event used by the test suite.",
  startsAt: "2026-12-10T10:00:00+08:00",
  timeZone: "Asia/Manila",
  venue: "Makati",
  capacity: 2,
  status: "published",
};

function createStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("createEvent normalizes and freezes valid event data", () => {
  const event = createEvent({ ...validEvent, title: "  Later Event  " });

  assert.equal(event.title, "Later Event");
  assert.equal(Object.isFrozen(event), true);
});

test("createEvent rejects invalid event data", () => {
  assert.throws(
    () => createEvent({ ...validEvent, capacity: 0 }),
    (error) =>
      error instanceof EventValidationError &&
      error.errors.capacity === "Capacity must be a positive whole number.",
  );
});

test("validateEvent reports every required field and unsupported value", () => {
  assert.deepEqual(
    validateEvent({
      id: "",
      title: "",
      description: "",
      startsAt: "not-a-date",
      venue: "",
      capacity: 1.5,
      status: "archived",
    }),
    {
      id: "An event ID is required.",
      title: "An event title is required.",
      description: "An event description is required.",
      venue: "A venue is required.",
      startsAt: "A valid event schedule is required.",
      capacity: "Capacity must be a positive whole number.",
      status: "The event status is not supported.",
    },
  );

  assert.throws(() => createEvent({}), EventValidationError);
});

test("createEvent applies the draft and time zone defaults", () => {
  const event = createEvent({
    ...validEvent,
    status: undefined,
    timeZone: undefined,
  });

  assert.equal(event.status, "draft");
  assert.equal(event.timeZone, "Asia/Manila");
});

test("validatePublication allows drafts and future published events", () => {
  const now = new Date("2026-09-12T00:00:00+08:00");

  assert.deepEqual(
    validatePublication({ ...validEvent, status: "draft" }, now),
    {},
  );
  assert.deepEqual(validatePublication(validEvent, now), {});
});

test("readEvents sorts events and derives registration totals", async () => {
  const earlierEvent = createEvent({
    ...validEvent,
    id: "earlier-event",
    title: "Earlier Event",
    startsAt: "2026-11-10T10:00:00+08:00",
  });
  const laterEvent = createEvent(validEvent);
  const eventRepository = createEventMemory([laterEvent, earlierEvent]);
  const registrationRepository = createRegistrationMemory([
    { eventId: earlierEvent.id, status: "confirmed" },
    { eventId: earlierEvent.id, status: "canceled" },
  ]);

  const events = await readEvents({ eventRepository, registrationRepository });

  assert.deepEqual(
    events.map((event) => event.id),
    ["earlier-event", "later-event"],
  );
  assert.equal(events[0].registrationCount, 1);
  assert.equal(events[0].remainingCapacity, 1);
});

test("readEvent returns one event with derived availability", async () => {
  const event = createEvent(validEvent);
  const eventRepository = createEventMemory([event]);
  const registrationRepository = createRegistrationMemory([
    { eventId: event.id, status: "confirmed" },
  ]);

  const result = await readEvent({
    id: event.id,
    eventRepository,
    registrationRepository,
  });

  assert.equal(result.registrationCount, 1);
  assert.equal(result.registrationRecordCount, 1);
  assert.equal(result.remainingCapacity, 1);
  assert.equal(
    await readEvent({
      id: "missing-event",
      eventRepository,
      registrationRepository,
    }),
    null,
  );
});

test("readOpenEvents returns only future published events with space", async () => {
  const open = createEvent(validEvent);
  const draft = createEvent({ ...validEvent, id: "draft", status: "draft" });
  const past = createEvent({
    ...validEvent,
    id: "past",
    startsAt: "2026-08-10T10:00:00+08:00",
  });
  const full = createEvent({ ...validEvent, id: "full", capacity: 1 });
  const eventRepository = createEventMemory([open, draft, past, full]);
  const registrationRepository = createRegistrationMemory([
    { id: "full-seat", eventId: full.id, status: "confirmed" },
  ]);

  const events = await readOpenEvents({
    eventRepository,
    registrationRepository,
    now: new Date("2026-09-13T00:00:00+08:00"),
  });

  assert.deepEqual(events.map((event) => event.id), [open.id]);
});

test("event summaries never report negative availability", async () => {
  const event = createEvent({ ...validEvent, capacity: 1 });
  const eventRepository = createEventMemory([event]);
  const registrationRepository = createRegistrationMemory([
    { eventId: event.id, status: "confirmed" },
    { eventId: event.id, status: "confirmed" },
  ]);

  const [summary] = await readEvents({
    eventRepository,
    registrationRepository,
  });

  assert.equal(summary.remainingCapacity, 0);
});

test("event memory store covers create, read, update, and remove errors", async () => {
  const event = createEvent(validEvent);
  const eventRepository = createEventMemory();

  await eventRepository.create(event);
  assert.equal(await eventRepository.find(event.id), event);
  await assert.rejects(eventRepository.create(event), /already exists/);
  await assert.rejects(
    eventRepository.update({ ...event, id: "missing-event" }),
    /could not be found/,
  );
  await assert.rejects(
    eventRepository.remove("missing-event"),
    /could not be found/,
  );
});

test("event storage repository shares events across instances", async () => {
  const storage = createStorage();
  const firstRepository = createEventStorage(storage, "events");
  const secondRepository = createEventStorage(storage, "events");

  await firstRepository.create(createEvent(validEvent));

  assert.equal((await secondRepository.find(validEvent.id)).title, validEvent.title);
});

test("event seed provides valid published and draft sample events", () => {
  const seed = createEventSeed();

  assert.equal(seed.length, 2);
  assert.deepEqual(
    seed.map((event) => event.status),
    ["published", "draft"],
  );
  seed.forEach((event) => assert.equal(Object.isFrozen(event), true));
});

test("createEventRecord validates publication and stores the event", async () => {
  const eventRepository = createEventMemory();

  const event = await createEventRecord({
    attributes: validEvent,
    eventRepository,
    createId: () => "created-event",
    now: new Date("2026-09-12T00:00:00+08:00"),
  });

  assert.equal(event.id, "created-event");
  assert.deepEqual(await eventRepository.list(), [event]);
});

test("createEventRecord rejects a published event in the past", async () => {
  const eventRepository = createEventMemory();

  await assert.rejects(
    createEventRecord({
      attributes: { ...validEvent, startsAt: "2026-08-10T10:00:00+08:00" },
      eventRepository,
      createId: () => "past-event",
      now: new Date("2026-09-12T00:00:00+08:00"),
    }),
    (error) =>
      error instanceof EventValidationError &&
      error.errors.startsAt === "A published event must be scheduled in the future.",
  );
});

test("updateEventRecord protects capacity already used by registrations", async () => {
  const event = createEvent(validEvent);
  const eventRepository = createEventMemory([event]);
  const registrationRepository = createRegistrationMemory([
    { eventId: event.id, status: "confirmed" },
    { eventId: event.id, status: "confirmed" },
  ]);

  await assert.rejects(
    updateEventRecord({
      id: event.id,
      attributes: { ...validEvent, capacity: 1 },
      eventRepository,
      registrationRepository,
      now: new Date("2026-09-12T00:00:00+08:00"),
    }),
    (error) =>
      error instanceof EventValidationError &&
      error.errors.capacity === "Capacity cannot be lower than 2.",
  );
});

test("updateEventRecord stores a valid event edit", async () => {
  const event = createEvent(validEvent);
  const eventRepository = createEventMemory([event]);
  const registrationRepository = createRegistrationMemory();

  const updatedEvent = await updateEventRecord({
    id: event.id,
    attributes: { ...validEvent, title: "Updated Event" },
    eventRepository,
    registrationRepository,
    now: new Date("2026-09-12T00:00:00+08:00"),
  });

  assert.equal(updatedEvent.title, "Updated Event");
  assert.equal((await eventRepository.list())[0].title, "Updated Event");
});

test("removeEventRecord removes an event without registrations", async () => {
  const event = createEvent(validEvent);
  const eventRepository = createEventMemory([event]);

  await removeEventRecord({
    id: event.id,
    eventRepository,
    registrationRepository: createRegistrationMemory(),
  });

  assert.deepEqual(await eventRepository.list(), []);
});

test("removeEventRecord protects events with registrations", async () => {
  const event = createEvent(validEvent);
  const eventRepository = createEventMemory([event]);
  const registrationRepository = createRegistrationMemory([
    { eventId: event.id, status: "canceled" },
  ]);

  await assert.rejects(
    removeEventRecord({
      id: event.id,
      eventRepository,
      registrationRepository,
    }),
    (error) =>
      error.name === "EventRemovalError" &&
      error.message ===
        "Remove or cancel this event's registrations before removing the event.",
  );
});

test("removeEventRecord reports a missing event", async () => {
  await assert.rejects(
    removeEventRecord({
      id: "missing-event",
      eventRepository: createEventMemory(),
      registrationRepository: createRegistrationMemory(),
    }),
    (error) =>
      error instanceof EventRemovalError &&
      error.message === "The event could not be found.",
  );
});
