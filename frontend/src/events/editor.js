const DOMAIN_FIELD_MAP = Object.freeze({ startsAt: "date" });
const STATUS_HELP = Object.freeze({
  draft: "Drafts stay in the manager workspace.",
  published: "Published events are visible to attendees and accept registrations.",
  closed: "Closed events remain visible to managers but stop accepting registrations.",
});

function getError(form, name) {
  return form.querySelector(`[data-error-for="${name}"]`);
}

function clearControlError(form, control) {
  control.removeAttribute("aria-invalid");

  const error = getError(form, control.name);
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
}

function setControlError(form, name, message) {
  const control = form.elements.namedItem(name);
  const error = getError(form, name);

  if (!control || !error) {
    return null;
  }

  control.setAttribute("aria-invalid", "true");
  error.textContent = message;
  error.hidden = false;

  return control;
}

function clearErrors(form, formError) {
  Array.from(form.elements).forEach((control) => {
    if (control.name) {
      clearControlError(form, control);
    }
  });
  formError.textContent = "";
  formError.hidden = true;
}

function validateControls(form) {
  let firstInvalid = null;

  Array.from(form.elements).forEach((control) => {
    if (!control.name || control.checkValidity()) {
      return;
    }

    const invalidControl = setControlError(
      form,
      control.name,
      control.validationMessage,
    );
    firstInvalid ??= invalidControl;
  });

  return firstInvalid;
}

function readAttributes(form) {
  const data = new FormData(form);
  const date = data.get("date");
  const time = data.get("time");

  return {
    title: data.get("title"),
    description: data.get("description"),
    startsAt: date && time ? `${date}T${time}:00+08:00` : "",
    timeZone: "Asia/Manila",
    venue: data.get("venue"),
    capacity: data.get("capacity"),
    status: data.get("status"),
  };
}

function writeEvent(form, event) {
  form.elements.title.value = event?.title ?? "";
  form.elements.description.value = event?.description ?? "";
  form.elements.date.value = event?.startsAt.slice(0, 10) ?? "";
  form.elements.time.value = event?.startsAt.slice(11, 16) ?? "";
  form.elements.venue.value = event?.venue ?? "";
  form.elements.capacity.value = event?.capacity ?? "";
  form.elements.status.value = event?.status ?? "draft";
}

function updateStatusHelp(form, statusHelp) {
  statusHelp.textContent = STATUS_HELP[form.elements.status.value];
}

export function initializeEditor({ saveEvent, onSaved, confirmDiscard }) {
  const form = document.querySelector("[data-event-form]");
  const view = form?.closest("[data-view]");
  const heading = document.querySelector("[data-editor-title]");
  const description = document.querySelector("[data-editor-description]");
  const submit = form?.querySelector("[data-editor-submit]");
  const formError = form?.querySelector("[data-form-error]");
  const statusHelp = form?.querySelector("#event-status-help");

  if (
    !form ||
    !view ||
    !heading ||
    !description ||
    !submit ||
    !formError ||
    !statusHelp
  ) {
    return Object.freeze({ open() {} });
  }

  let editingId = null;
  let dirty = false;

  function open(event = null) {
    editingId = event?.id ?? null;
    heading.textContent = editingId ? "Edit event" : "Create event";
    description.textContent = editingId
      ? "Update the event details and save when everything is accurate."
      : "Add the details attendees need before opening registration.";
    submit.textContent = editingId ? "Save changes" : "Create event";
    form.reset();
    writeEvent(form, event);
    updateStatusHelp(form, statusHelp);
    clearErrors(form, formError);
    dirty = false;
  }

  form.addEventListener("input", (event) => {
    dirty = true;

    if (event.target.name === "status") {
      updateStatusHelp(form, statusHelp);
    }

    if (event.target.name) {
      clearControlError(form, event.target);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(form, formError);

    const firstInvalid = validateControls(form);
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = "Saving...";

    try {
      const action = editingId ? "updated" : "created";
      const savedEvent = await saveEvent({
        id: editingId,
        attributes: readAttributes(form),
      });

      dirty = false;
      form.reset();
      await onSaved(savedEvent, action);
    } catch (error) {
      if (error?.errors) {
        let firstDomainError = null;

        Object.entries(error.errors).forEach(([domainName, message]) => {
          const controlName = DOMAIN_FIELD_MAP[domainName] ?? domainName;
          const invalidControl = setControlError(form, controlName, message);
          firstDomainError ??= invalidControl;
        });

        firstDomainError?.focus();
      } else {
        formError.textContent = "The event could not be saved. Please try again.";
        formError.hidden = false;
      }
    } finally {
      submit.disabled = false;
      submit.textContent = editingId ? "Save changes" : "Create event";
    }
  });

  document.addEventListener("click", async (event) => {
    const link = event.target.closest('a[href^="#"]');

    if (!link || !dirty || view.hidden) {
      return;
    }

    event.preventDefault();

    const shouldLeave = await confirmDiscard();
    if (!shouldLeave) {
      return;
    }

    dirty = false;
    form.reset();
    clearErrors(form, formError);
    window.location.hash = link.hash;
  });

  window.addEventListener("beforeunload", (event) => {
    if (!dirty) {
      return;
    }

    event.preventDefault();
  });

  open();

  return Object.freeze({ open });
}
