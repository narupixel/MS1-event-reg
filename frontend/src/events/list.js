import { createElement } from "../shared/dom.js";
import { createEventStatus } from "../shared/status.js";

const dateParts = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});

const schedule = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

function createDateBlock(event) {
  const block = createElement("time", "event-date");
  const parts = dateParts.formatToParts(new Date(event.startsAt));
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  block.dateTime = event.startsAt;
  block.setAttribute("aria-label", schedule.format(new Date(event.startsAt)));
  block.append(
    createElement("span", "event-month", month),
    createElement("span", "event-day", day),
  );

  return block;
}

function createEventItem(event, onView, onEdit) {
  const item = createElement("li", "event-item");
  const body = createElement("article", "event-body");
  const title = createElement("h2", "event-title", event.title);
  const scheduleLine = createElement("p", "event-meta");
  const eventTime = createElement(
    "time",
    "event-schedule",
    schedule.format(new Date(event.startsAt)),
  );
  const venue = createElement("span", "event-venue", event.venue);
  const summary = createElement("div", "event-summary");
  const capacity = createElement(
    "p",
    "event-capacity",
    `${event.registrationCount} of ${event.capacity} registered`,
  );
  const availability = createElement(
    "p",
    "event-availability",
    `${event.remainingCapacity} places available`,
  );
  const actions = createElement("div", "event-actions");
  const view = createElement(
    "button",
    "button button-secondary button-small",
    "View details",
  );
  const edit = createElement(
    "button",
    "button button-secondary button-small",
    "Edit",
  );

  eventTime.dateTime = event.startsAt;
  view.type = "button";
  view.addEventListener("click", () => onView(event));
  edit.type = "button";
  edit.addEventListener("click", () => onEdit(event));
  scheduleLine.append(eventTime, venue);
  body.append(title, scheduleLine);
  actions.append(view, edit);
  summary.append(createEventStatus(event.status), capacity, availability, actions);
  item.append(createDateBlock(event), body, summary);

  return item;
}

function showError(region, emptyState) {
  emptyState.hidden = false;
  emptyState.querySelector("h2").textContent = "Events unavailable";
  emptyState.querySelector("p").textContent =
    "Refresh the page to try again.";
  region.setAttribute("data-state", "error");
}

export function initializeEvents({ loadEvents, onView, onEdit }) {
  const region = document.querySelector("[data-events-region]");
  const list = region?.querySelector("[data-events-list]");
  const emptyState = region?.querySelector("[data-events-empty]");

  async function render() {
    region.setAttribute("aria-busy", "true");

    try {
      const events = await loadEvents();

      list.replaceChildren(
        ...events.map((event) => createEventItem(event, onView, onEdit)),
      );
      list.hidden = events.length === 0;
      emptyState.hidden = events.length > 0;
      region.setAttribute("data-state", events.length > 0 ? "populated" : "empty");
    } catch {
      list.hidden = true;
      showError(region, emptyState);
    } finally {
      region.setAttribute("aria-busy", "false");
    }
  }

  if (!region || !list || !emptyState) {
    return Object.freeze({ async render() {} });
  }

  render();

  return Object.freeze({ render });
}
