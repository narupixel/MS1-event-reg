import { createElement } from "./dom.js";

export function createEventStatus(status) {
  const label = createElement(
    "span",
    `event-status event-status-${status}`,
    status[0].toUpperCase() + status.slice(1),
  );

  label.prepend(createElement("span", "status-mark"));

  return label;
}
