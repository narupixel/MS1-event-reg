import { createElement } from "../shared/dom.js";
import { formatSchedule } from "../shared/format.js";
import { isEmailAddress } from "./model.js";
import { createRegistrationSummary } from "./summary.js";

function getError(form, name) {
  return form.querySelector(`[data-registration-error-for="${name}"]`);
}

function clearErrors(form) {
  Array.from(form.elements).forEach((control) => {
    if (!control.name) {
      return;
    }

    control.removeAttribute("aria-invalid");
    const error = getError(form, control.name);

    if (error) {
      error.textContent = "";
      error.hidden = true;
    }
  });
}

function validate(form) {
  let firstInvalid = null;

  Array.from(form.elements).forEach((control) => {
    if (!control.name || control.checkValidity()) {
      return;
    }

    const error = getError(form, control.name);
    control.setAttribute("aria-invalid", "true");

    if (error) {
      error.textContent = control.validationMessage;
      error.hidden = false;
    }

    firstInvalid ??= control;
  });

  const attendeeName = form.elements.attendeeName;
  const email = form.elements.email;

  if (attendeeName.value.trim() === "") {
    attendeeName.setAttribute("aria-invalid", "true");
    const error = getError(form, attendeeName.name);
    error.textContent = "Enter your full name.";
    error.hidden = false;
    firstInvalid ??= attendeeName;
  }

  if (email.value && !isEmailAddress(email.value)) {
    email.setAttribute("aria-invalid", "true");
    const error = getError(form, email.name);
    error.textContent = "Enter a valid email address.";
    error.hidden = false;
    firstInvalid ??= email;
  }

  return firstInvalid;
}

function readAttendee(form) {
  const data = new FormData(form);

  return {
    attendeeName: String(data.get("attendeeName") ?? "").trim(),
    email: String(data.get("email") ?? "").trim().toLowerCase(),
  };
}

function createContext(event) {
  const context = createElement("aside", "registration-context");
  const eventTime = createElement(
    "time",
    "registration-context-schedule",
    formatSchedule(event.startsAt),
  );

  eventTime.dateTime = event.startsAt;
  context.append(
    createElement("p", "eyebrow", "Your event"),
    createElement("h2", "registration-context-title", event.title),
    eventTime,
    createElement("p", "registration-context-venue", event.venue),
    createElement(
      "p",
      "registration-context-availability",
      `${event.remainingCapacity} places available`,
    ),
  );

  return context;
}

export function initializeRegistrationForm({
  submitRegistration,
  confirmDiscard,
  onConfirmed,
}) {
  const view = document.querySelector('[data-view="form"]');
  const heading = view?.querySelector("[data-registration-title]");
  const description = view?.querySelector("[data-registration-description]");
  const context = view?.querySelector("[data-registration-context]");
  const formStage = view?.querySelector("[data-registration-form-stage]");
  const form = view?.querySelector("[data-registration-form]");
  const reviewStage = view?.querySelector("[data-registration-review]");
  const reviewSummary = view?.querySelector("[data-registration-summary]");
  const reviewError = view?.querySelector("[data-registration-review-error]");
  const edit = view?.querySelector("[data-registration-edit]");
  const confirm = view?.querySelector("[data-registration-confirm]");
  let currentEvent = null;
  let attendee = null;
  let dirty = false;

  function showForm() {
    formStage.hidden = false;
    reviewStage.hidden = true;
    heading.textContent = "Register for an event";
    description.textContent = "Enter the attendee details for one place.";
  }

  function showReview() {
    formStage.hidden = true;
    reviewStage.hidden = false;
    heading.textContent = "Review registration";
    description.textContent = "Confirm these details before submitting.";
    reviewSummary.replaceChildren(
      createRegistrationSummary({ event: currentEvent, registration: attendee }),
    );
    reviewError.hidden = true;
    reviewStage.focus();
  }

  function open(event) {
    view.dataset.ready = "true";
    currentEvent = event;
    attendee = null;
    dirty = false;
    form.reset();
    clearErrors(form);
    context.replaceChildren(createContext(event));
    showForm();
  }

  if (
    !view ||
    !heading ||
    !description ||
    !context ||
    !formStage ||
    !form ||
    !reviewStage ||
    !reviewSummary ||
    !reviewError ||
    !edit ||
    !confirm
  ) {
    return Object.freeze({ open() {} });
  }

  form.addEventListener("input", (event) => {
    dirty = true;

    if (event.target.name) {
      event.target.removeAttribute("aria-invalid");
      const error = getError(form, event.target.name);

      if (error) {
        error.hidden = true;
      }
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors(form);

    const firstInvalid = validate(form);
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    attendee = readAttendee(form);
    showReview();
  });

  edit.addEventListener("click", () => {
    showForm();
    form.elements.attendeeName.focus();
  });

  confirm.addEventListener("click", async () => {
    confirm.disabled = true;
    confirm.textContent = "Confirming...";
    reviewError.hidden = true;

    try {
      const registration = await submitRegistration({
        eventId: currentEvent.id,
        attributes: attendee,
      });

      dirty = false;
      form.reset();
      await onConfirmed({ event: currentEvent, registration });
    } catch (error) {
      reviewError.textContent =
        error?.message ?? "The registration could not be completed. Please try again.";
      reviewError.hidden = false;
    } finally {
      confirm.disabled = false;
      confirm.textContent = "Confirm registration";
    }
  });

  document.addEventListener("click", async (event) => {
    const link = event.target.closest('a[href^="#"]');

    if (!link || !dirty || view.hidden) {
      return;
    }

    event.preventDefault();
    const shouldLeave = await confirmDiscard();

    if (shouldLeave) {
      dirty = false;
      form.reset();
      window.location.hash = link.hash;
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (dirty) {
      event.preventDefault();
    }
  });

  return Object.freeze({ open });
}
