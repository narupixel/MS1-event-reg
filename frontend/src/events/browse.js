import { createElement } from "../shared/dom.js";
import { formatSchedule } from "../shared/format.js";

function createPublicEvent(event, onRegister) {
  const item = createElement("li", "public-event");
  const article = createElement("article", "public-event-content");
  const body = createElement("div", "public-event-body");
  const title = createElement("h2", "public-event-title", event.title);
  const eventTime = createElement(
    "time",
    "public-event-schedule",
    formatSchedule(event.startsAt),
  );
  const availability = createElement(
    "p",
    "public-event-availability",
    `${event.remainingCapacity} ${event.remainingCapacity === 1 ? "place" : "places"} available`,
  );
  const register = createElement(
    "button",
    "button button-primary",
    "Register",
  );

  eventTime.dateTime = event.startsAt;
  register.type = "button";
  register.addEventListener("click", () => onRegister(event));
  body.append(
    title,
    eventTime,
    createElement("p", "public-event-venue", event.venue),
    createElement("p", "public-event-description", event.description),
  );
  article.append(body, availability, register);
  item.append(article);

  return item;
}

function getSharedEventId() {
  const [, eventId] = window.location.hash.slice(1).split("/");

  if (!eventId) {
    return null;
  }

  try {
    return decodeURIComponent(eventId);
  } catch {
    return null;
  }
}

function isOpenEvent(event) {
  return (
    event?.status === "published" &&
    Date.parse(event.startsAt) > Date.now() &&
    event.remainingCapacity > 0
  );
}

export function initializePublicEvents({ loadEvent, onRegister }) {
  const region = document.querySelector("[data-public-region]");
  const list = region?.querySelector("[data-public-list]");
  const empty = region?.querySelector("[data-public-empty]");

  async function render() {
    if (!region || !list || !empty) {
      return;
    }

    region.setAttribute("aria-busy", "true");

    try {
      const eventId = getSharedEventId();
      const event = eventId ? await loadEvent(eventId) : null;
      const events = isOpenEvent(event) ? [event] : [];

      list.replaceChildren(
        ...events.map((event) => createPublicEvent(event, onRegister)),
      );
      list.hidden = events.length === 0;
      empty.hidden = events.length > 0;
      empty.querySelector("h2").textContent = eventId
        ? "Event unavailable"
        : "Invitation link required";
      empty.querySelector("p").textContent = eventId
        ? "This event is closed, full, or no longer available."
        : "Ask the event manager for the link to your event.";
    } catch {
      list.hidden = true;
      empty.hidden = false;
      empty.querySelector("h2").textContent = "Events unavailable";
      empty.querySelector("p").textContent =
        "Refresh the page to try loading open events again.";
    } finally {
      region.setAttribute("aria-busy", "false");
    }
  }

  render();

  return Object.freeze({ render });
}
