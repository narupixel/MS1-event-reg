export function createRegistrationMemory(initialRegistrations = []) {
  const registrations = new Map(
    initialRegistrations.map((registration, index) => [
      registration.id ?? `initial-${index}`,
      registration,
    ]),
  );

  return Object.freeze({
    async create(registration) {
      if (registrations.has(registration.id)) {
        throw new Error("A registration with this ID already exists.");
      }

      registrations.set(registration.id, registration);
      return registration;
    },

    async countAllByEvent(eventId) {
      return Array.from(registrations.values()).filter(
        (registration) => registration.eventId === eventId,
      ).length;
    },

    async countByEvent(eventId) {
      return Array.from(registrations.values()).filter(
        (registration) =>
          registration.eventId === eventId && registration.status !== "canceled",
      ).length;
    },

    async find(id) {
      return registrations.get(id) ?? null;
    },

    async list() {
      return Array.from(registrations.values());
    },

    async update(registration) {
      if (!registrations.has(registration.id)) {
        throw new Error("The registration could not be found.");
      }

      registrations.set(registration.id, registration);
      return registration;
    },

    async remove(id) {
      const registration = registrations.get(id);

      if (!registration) {
        throw new Error("The registration could not be found.");
      }

      registrations.delete(id);
      return registration;
    },
  });
}

export function createRegistrationStorage(storage, key) {
  function sync() {
    return createRegistrationMemory(readRegistrations(storage, key));
  }

  return Object.freeze({
    async create(registration) {
      const repository = sync();
      const result = await repository.create(registration);
      writeRegistrations(storage, key, await repository.list());
      return result;
    },
    async countAllByEvent(eventId) {
      return sync().countAllByEvent(eventId);
    },
    async countByEvent(eventId) {
      return sync().countByEvent(eventId);
    },
    async find(id) {
      return sync().find(id);
    },
    async list() {
      return sync().list();
    },
    async update(registration) {
      const repository = sync();
      const result = await repository.update(registration);
      writeRegistrations(storage, key, await repository.list());
      return result;
    },
    async remove(id) {
      const repository = sync();
      const result = await repository.remove(id);
      writeRegistrations(storage, key, await repository.list());
      return result;
    },
  });
}

function readRegistrations(storage, key) {
  const saved = storage.getItem(key);

  if (!saved) {
    writeRegistrations(storage, key, []);
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch {
    writeRegistrations(storage, key, []);
    return [];
  }
}

function writeRegistrations(storage, key, registrations) {
  storage.setItem(key, JSON.stringify(registrations));
}
