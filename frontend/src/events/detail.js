import { createElement } from "../shared/dom.js";
import { createEventStatus } from "../shared/status.js";

const schedule = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

function createFact(term, description) {
  const group = createElement("div", "detail-fact");

  group.append(
    createElement("dt", "detail-term", term),
    createElement("dd", "detail-value", description),
  );

  return group;
}

function getLifecycle(event) {
  if (event.status === "draft") {
    return {
      label: "Publish event",
      pendingLabel: "Publishing...",
      status: "published",
      success: "published",
    };
  }

  if (event.status === "published") {
    return {
      label: "Close registration",
      pendingLabel: "Closing...",
      status: "closed",
      success: "closed",
    };
  }

  return null;
}

function getActionDescription(event) {
  if (event.status === "draft") {
    return "Publish this event when its schedule and attendee details are ready.";
  }

  if (event.status === "published") {
    return "Registration is open. Close it when you no longer want new attendees.";
  }

  return "Registration is closed. Event details can still be edited.";
}

function getErrorMessage(error) {
  if (error?.errors) {
    return Object.values(error.errors)[0];
  }

  return error?.message ?? "The event could not be updated. Please try again.";
}

function getAttendeeLink(eventId) {
  const url = new URL(window.location.href);
  url.hash = `register/${encodeURIComponent(eventId)}`;
  return url.href;
}

export function initializeDetail({
  loadEvent,
  updateEvent,
  removeEvent,
  confirmRemoval,
  onEdit,
  onChanged,
  onRemoved,
  showToast,
}) {
  const region = document.querySelector("[data-detail-region]");
  const heading = document.querySelector("[data-detail-title]");
  const description = document.querySelector("[data-detail-description]");
  let currentEvent = null;

  function showUnavailable() {
    const state = createElement("div", "empty-state detail-empty");

    state.append(
      createElement("h2", "", "Event unavailable"),
      createElement("p", "", "Return to Events and choose an available event."),
    );
    region.replaceChildren(state);
    region.setAttribute("aria-busy", "false");
  }

  async function renderActions(event) {
    const section = createElement("section", "detail-actions");
    const heading = createElement("h2", "detail-section-title", "Manage event");
    const description = createElement(
      "p",
      "detail-section-copy",
      getActionDescription(event),
    );
    const error = createElement("p", "detail-action-error");
    const controls = createElement("div", "detail-controls");
    const edit = createElement("button", "button button-secondary", "Edit details");
    const lifecycle = getLifecycle(event);

    error.hidden = true;
    error.setAttribute("role", "alert");
    edit.type = "button";
    edit.addEventListener("click", () => onEdit(currentEvent));
    controls.append(edit);

    if (lifecycle) {
      const lifecycleButton = createElement(
        "button",
        "button button-primary",
        lifecycle.label,
      );

      lifecycleButton.type = "button";
      lifecycleButton.addEventListener("click", async () => {
        lifecycleButton.disabled = true;
        lifecycleButton.textContent = lifecycle.pendingLabel;
        error.hidden = true;

        try {
          const updatedEvent = await updateEvent({
            id: event.id,
            attributes: { ...event, status: lifecycle.status },
          });

          await onChanged();
          showToast(`${updatedEvent.title} ${lifecycle.success}.`);
          await render();
        } catch (actionError) {
          error.textContent = getErrorMessage(actionError);
          error.hidden = false;
          lifecycleButton.disabled = false;
          lifecycleButton.textContent = lifecycle.label;
        }
      });
      controls.prepend(lifecycleButton);
    }

    const remove = createElement(
      "button",
      "button button-secondary",
      "Remove event",
    );
    const removalNote = createElement("p", "detail-removal-note");

    remove.type = "button";

    if (event.registrationRecordCount > 0) {
      remove.disabled = true;
      removalNote.textContent =
        "This event has registration records. Remove them before removing the event.";
    } else {
      removalNote.textContent = "Removing an event cannot be undone.";
      remove.addEventListener("click", async () => {
        const confirmed = await confirmRemoval(event);

        if (!confirmed) {
          return;
        }

        remove.disabled = true;
        remove.textContent = "Removing...";
        error.hidden = true;

        try {
          await removeEvent(event.id);
          await onRemoved(event);
        } catch (actionError) {
          error.textContent = getErrorMessage(actionError);
          error.hidden = false;
          remove.disabled = false;
          remove.textContent = "Remove event";
        }
      });
    }

    controls.append(remove);

    if (event.status === "published") {
      const sharing = createElement("div", "detail-sharing");
      const sharingHeading = createElement(
        "h3",
        "detail-sharing-title",
        "Attendee link",
      );
      const sharingCopy = createElement(
        "p",
        "detail-sharing-copy",
        "Share this link so attendees can register for this event only.",
      );
      const sharingControls = createElement("div", "detail-sharing-controls");
      const link = createElement("input", "detail-sharing-link");
      const copy = createElement("button", "button button-secondary", "Copy link");

      link.type = "text";
      link.readOnly = true;
      link.value = getAttendeeLink(event.id);
      link.setAttribute("aria-label", "Attendee registration link");
      copy.type = "button";
      copy.addEventListener("click", async () => {
        await navigator.clipboard.writeText(link.value);
        copy.textContent = "Copied";
        showToast("Attendee link copied.");
        window.setTimeout(() => {
          copy.textContent = "Copy link";
        }, 1600);
      });
      sharingControls.append(link, copy);
      sharing.append(sharingHeading, sharingCopy, sharingControls);
      section.append(sharing);
    }

    section.prepend(heading, description, error, controls, removalNote);

    return section;
  }

  async function render() {
    if (!currentEvent?.id) {
      showUnavailable();
      return;
    }

    region.setAttribute("aria-busy", "true");

    try {
      const event = await loadEvent(currentEvent.id);

      if (!event) {
        currentEvent = null;
        showUnavailable();
        return;
      }

      currentEvent = event;
      heading.textContent = event.title;
      description.textContent =
        "Review event information and manage its availability.";

      const layout = createElement("div", "detail-layout");
      const information = createElement("article", "detail-information");
      const overview = createElement("div", "detail-overview");
      const eventTime = createElement(
        "time",
        "detail-schedule",
        schedule.format(new Date(event.startsAt)),
      );
      const facts = createElement("dl", "detail-facts");
      const registrations = createElement("section", "registration-preview");
      const registrationHeading = createElement("div", "registration-heading");
      const registrationMeta = createElement("div", "registration-heading-meta");

      eventTime.dateTime = event.startsAt;
      overview.append(
        createEventStatus(event.status),
        eventTime,
        createElement("p", "detail-venue", event.venue),
        createElement("p", "detail-description", event.description),
      );
      facts.append(
        createFact("Capacity", String(event.capacity)),
        createFact("Registered", String(event.registrationCount)),
        createFact("Available", String(event.remainingCapacity)),
        createFact("Time zone", event.timeZone),
      );
      registrationMeta.append(
        createElement(
          "span",
          "registration-count",
          `${event.registrationCount} active`,
        ),
      );

      if (event.registrationRecordCount > 0) {
        const manage = createElement(
          "a",
          "registration-manage-link",
          "Manage registrations",
        );

        manage.href = "#registrations";
        registrationMeta.append(manage);
      }

      registrationHeading.append(
        createElement("h2", "detail-section-title", "Registrations"),
        registrationMeta,
      );
      registrations.append(
        registrationHeading,
        createElement(
          "p",
          "registration-empty",
          event.registrationRecordCount > 0
            ? "Registration details will appear in the management view."
            : "No one has registered for this event yet.",
        ),
      );
      information.append(overview, facts, registrations);
      layout.append(information, await renderActions(event));
      region.replaceChildren(layout);
    } catch {
      showUnavailable();
    } finally {
      region.setAttribute("aria-busy", "false");
    }
  }

  async function open(id) {
    currentEvent = { id };
    await render();
  }

  if (!region || !heading || !description) {
    return Object.freeze({ async open() {} });
  }

  showUnavailable();

  return Object.freeze({ open });
}
