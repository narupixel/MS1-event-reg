import {
  createEventRecord,
  createEventMemory,
  createEventSeed,
  createEventStorage,
  initializeDetail,
  initializeEditor,
  initializeEvents,
  initializePublicEvents,
  readEvent,
  readEvents,
  readOpenEvents,
  removeEventRecord,
  updateEventRecord,
} from "./events/index.js";
import {
  cancelRegistrationRecord,
  createRegistrationRecord,
  createRegistrationStorage,
  initializeConfirmation,
  initializeRegistrationForm,
  initializeRegistrations,
  readRegistrations,
  removeRegistrationRecord,
} from "./registrations/index.js";
import { initializeModal } from "./shared/modal.js";
import { initializeRouter } from "./shared/router.js";
import { initializeShell } from "./shared/shell.js";
import { initializeToasts } from "./shared/toast.js";
import {
  AUTH_ROUTE,
  clearAuthentication,
  initializeLogin,
  isAuthenticated,
} from "./shared/auth.js";

initializeShell();

initializeLogin({
  onLogin: () => {
    window.location.hash = "events";
  },
});

document.querySelector("[data-logout]")?.addEventListener("click", () => {
  clearAuthentication();
  window.location.hash = AUTH_ROUTE;
});

const modal = initializeModal();
const toasts = initializeToasts();

const EVENTS_STORAGE_KEY = "event-registry-events";
const REGISTRATIONS_STORAGE_KEY = "event-registry-registrations";
const eventRepository = createEventStorage(
  window.localStorage,
  EVENTS_STORAGE_KEY,
  createEventSeed(),
);
const registrationRepository = createRegistrationStorage(
  window.localStorage,
  REGISTRATIONS_STORAGE_KEY,
);

let eventsView;
let detailView;
let publicView;
let registrationsView;
let confirmationView;

async function refreshEventViews() {
  await Promise.all([eventsView?.render(), publicView?.render()]);
}

const editor = initializeEditor({
  saveEvent: ({ id, attributes }) =>
    id
      ? updateEventRecord({
          id,
          attributes,
          eventRepository,
          registrationRepository,
        })
      : createEventRecord({
          attributes,
          eventRepository,
          createId: () => crypto.randomUUID(),
        }),
  onSaved: async (event, action) => {
    window.location.hash = "events";
    await refreshEventViews();
    toasts.show(`${event.title} ${action}.`);
  },
  confirmDiscard: () =>
    modal.ask({
      heading: "Discard changes?",
      description: "Your unsaved event changes will be lost.",
      confirmLabel: "Discard changes",
      destructive: true,
    }),
});

eventsView = initializeEvents({
  loadEvents: () => readEvents({ eventRepository, registrationRepository }),
  onView: async (event) => {
    await detailView.open(event.id);
    window.location.hash = "detail";
  },
  onEdit: (event) => {
    editor.open(event);
    window.location.hash = "editor";
  },
});

detailView = initializeDetail({
  loadEvent: (id) =>
    readEvent({ id, eventRepository, registrationRepository }),
  updateEvent: ({ id, attributes }) =>
    updateEventRecord({
      id,
      attributes,
      eventRepository,
      registrationRepository,
    }),
  removeEvent: (id) =>
    removeEventRecord({ id, eventRepository, registrationRepository }),
  confirmRemoval: (event) =>
    modal.ask({
      heading: `Remove ${event.title}?`,
      description:
        "This event will be permanently removed. This cannot be undone.",
      confirmLabel: "Remove event",
      destructive: true,
    }),
  onEdit: (event) => {
    editor.open(event);
    window.location.hash = "editor";
  },
  onChanged: refreshEventViews,
  onRemoved: async (event) => {
    window.location.hash = "events";
    await refreshEventViews();
    toasts.show(`${event.title} removed.`);
  },
  showToast: (message) => toasts.show(message),
});

const registrationForm = initializeRegistrationForm({
  submitRegistration: ({ eventId, attributes }) =>
    createRegistrationRecord({
      eventId,
      attributes,
      eventRepository,
      registrationRepository,
      createId: () => crypto.randomUUID(),
    }),
  confirmDiscard: () =>
    modal.ask({
      heading: "Leave registration?",
      description: "The attendee information you entered will be discarded.",
      confirmLabel: "Discard information",
      destructive: true,
    }),
  onConfirmed: async ({ event, registration }) => {
    await refreshEventViews();
    await registrationsView.render();
    confirmationView.open({ event, registration });
    window.location.hash = "confirmation";
  },
});

function openRegistration(event) {
  registrationForm.open(event);
  window.location.hash = `form/${encodeURIComponent(event.id)}`;
}

publicView = initializePublicEvents({
  loadEvent: (id) =>
    readEvent({ id, eventRepository, registrationRepository }),
  onRegister: openRegistration,
});

confirmationView = initializeConfirmation({
  onRegisterAgain: async (eventId) => {
    const events = await readOpenEvents({
      eventRepository,
      registrationRepository,
    });
    const event = events.find((candidate) => candidate.id === eventId);

    if (event) {
      openRegistration(event);
      return;
    }

    await publicView.render();
    window.location.hash = `register/${encodeURIComponent(eventId)}`;
    toasts.show("That event is no longer available for registration.");
  },
});

registrationsView = initializeRegistrations({
  loadRegistrations: () =>
    readRegistrations({ eventRepository, registrationRepository }),
  cancelRegistration: (id) =>
    cancelRegistrationRecord({ id, registrationRepository }),
  removeRegistration: (id) =>
    removeRegistrationRecord({ id, registrationRepository }),
  confirmCancel: (registration) =>
    modal.ask({
      heading: `Cancel ${registration.attendeeName}'s registration?`,
      description: "Their place will become available to another attendee.",
      confirmLabel: "Cancel registration",
      destructive: true,
    }),
  confirmRemove: (registration) =>
    modal.ask({
      heading: `Remove ${registration.attendeeName}'s record?`,
      description: "The canceled registration record will be permanently removed.",
      confirmLabel: "Remove record",
      destructive: true,
    }),
  onChanged: refreshEventViews,
  showToast: (message) => toasts.show(message),
});

window.addEventListener("storage", ({ key }) => {
  if (![EVENTS_STORAGE_KEY, REGISTRATIONS_STORAGE_KEY].includes(key)) {
    return;
  }

  void Promise.all([
    eventsView?.render(),
    publicView?.render(),
    registrationsView?.render(),
  ]);
});

document.querySelector("[data-new-event]")?.addEventListener("click", () => {
  editor.open();
  window.location.hash = "editor";
});

initializeRouter({ isAuthenticated });
