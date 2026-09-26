import { createElement } from "../shared/dom.js";
import { formatCreated } from "../shared/format.js";

function createStatus(status) {
  const label = createElement(
    "span",
    `registration-status registration-status-${status}`,
    status[0].toUpperCase() + status.slice(1),
  );

  label.prepend(createElement("span", "status-mark"));
  return label;
}

function createRegistrationItem(registration, actions) {
  const item = createElement("li", "registration-item");
  const body = createElement("article", "registration-item-content");
  const identity = createElement("div", "registration-identity");
  const details = createElement("div", "registration-item-details");
  const created = createElement(
    "time",
    "registration-created",
    `Registered ${formatCreated(registration.createdAt)}`,
  );
  const controls = createElement("div", "registration-item-actions");

  created.dateTime = registration.createdAt;
  identity.append(
    createElement("h2", "registration-name", registration.attendeeName),
    createElement("p", "registration-email", registration.email),
  );
  details.append(
    createElement("p", "registration-event", registration.eventTitle),
    created,
  );

  if (registration.status === "confirmed") {
    const cancel = createElement(
      "button",
      "button button-secondary button-small",
      "Cancel registration",
    );

    cancel.type = "button";
    cancel.addEventListener("click", () => actions.cancel(registration, cancel));
    controls.append(cancel);
  } else {
    const remove = createElement(
      "button",
      "button button-secondary button-small",
      "Remove record",
    );

    remove.type = "button";
    remove.addEventListener("click", () => actions.remove(registration, remove));
    controls.append(remove);
  }

  body.append(identity, details, createStatus(registration.status), controls);
  item.append(body);

  return item;
}

export function initializeRegistrations({
  loadRegistrations,
  cancelRegistration,
  removeRegistration,
  confirmCancel,
  confirmRemove,
  onChanged,
  showToast,
}) {
  const region = document.querySelector("[data-registrations-region]");
  const list = region?.querySelector("[data-registrations-list]");
  const empty = region?.querySelector("[data-registrations-empty]");

  async function render() {
    if (!region || !list || !empty) {
      return;
    }

    region.setAttribute("aria-busy", "true");

    try {
      const registrations = await loadRegistrations();
      const actions = {
        async cancel(registration, button) {
          const confirmed = await confirmCancel(registration);
          if (!confirmed) {
            return;
          }

          button.disabled = true;
          button.textContent = "Canceling...";

          try {
            await cancelRegistration(registration.id);
            await onChanged();
            showToast(`${registration.attendeeName}'s registration canceled.`);
            await render();
          } catch {
            button.disabled = false;
            button.textContent = "Cancel registration";
            showToast("The registration could not be canceled.");
          }
        },
        async remove(registration, button) {
          const confirmed = await confirmRemove(registration);
          if (!confirmed) {
            return;
          }

          button.disabled = true;
          button.textContent = "Removing...";

          try {
            await removeRegistration(registration.id);
            await onChanged();
            showToast(`${registration.attendeeName}'s record removed.`);
            await render();
          } catch {
            button.disabled = false;
            button.textContent = "Remove record";
            showToast("The registration record could not be removed.");
          }
        },
      };

      list.replaceChildren(
        ...registrations.map((registration) =>
          createRegistrationItem(registration, actions),
        ),
      );
      list.hidden = registrations.length === 0;
      empty.hidden = registrations.length > 0;
    } catch {
      list.hidden = true;
      empty.hidden = false;
      empty.querySelector("h2").textContent = "Registrations unavailable";
      empty.querySelector("p").textContent =
        "Refresh the page to try loading registrations again.";
    } finally {
      region.setAttribute("aria-busy", "false");
    }
  }

  render();

  return Object.freeze({ render });
}
