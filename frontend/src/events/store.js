import { createEvent } from "./model.js";

export function createEventMemory(initialEvents = []) {
  const events = new Map(initialEvents.map((event) => [event.id, event]));

  return Object.freeze({
    async create(event) {
      if (events.has(event.id)) {
        throw new Error("An event with this ID already exists.");
      }

      events.set(event.id, event);
      return event;
    },

    async list() {
      return Array.from(events.values());
    },

    async find(id) {
      return events.get(id) ?? null;
    },

    async update(event) {
      if (!events.has(event.id)) {
        throw new Error("The event could not be found.");
      }

      events.set(event.id, event);
      return event;
    },

    async remove(id) {
      const event = events.get(id);

      if (!event) {
        throw new Error("The event could not be found.");
      }

      events.delete(id);
      return event;
    },
  });
}

export function createEventStorage(storage, key, initialEvents = []) {
  readEvents(storage, key, initialEvents);

  function sync() {
    return createEventMemory(readEvents(storage, key));
  }

  return Object.freeze({
    async create(event) {
      const repository = sync();
      const result = await repository.create(event);
      writeEvents(storage, key, await repository.list());
      return result;
    },
    async find(id) {
      return sync().find(id);
    },
    async list() {
      return sync().list();
    },
    async update(event) {
      const repository = sync();
      const result = await repository.update(event);
      writeEvents(storage, key, await repository.list());
      return result;
    },
    async remove(id) {
      const repository = sync();
      const result = await repository.remove(id);
      writeEvents(storage, key, await repository.list());
      return result;
    },
  });
}

function readEvents(storage, key, fallback = []) {
  const saved = storage.getItem(key);

  if (!saved) {
    writeEvents(storage, key, fallback);
    return fallback;
  }

  try {
    return JSON.parse(saved);
  } catch {
    writeEvents(storage, key, fallback);
    return fallback;
  }
}

function writeEvents(storage, key, events) {
  storage.setItem(key, JSON.stringify(events));
}

export function createEventSeed() {
  return [
    createEvent({
      id: "community-design-meetup",
      title: "Community Design Meetup",
      description: "A practical afternoon for sharing interface work and feedback.",
      startsAt: "2026-10-18T14:00:00+08:00",
      timeZone: "Asia/Manila",
      venue: "The Workshop, Makati",
      capacity: 80,
      status: "published",
    }),
    createEvent({
      id: "frontend-study-session",
      title: "Frontend Study Session",
      description: "A guided study session covering browser fundamentals.",
      startsAt: "2026-11-07T10:00:00+08:00",
      timeZone: "Asia/Manila",
      venue: "Online",
      capacity: 40,
      status: "draft",
    }),
  ];
}
