import { createElement } from "../shared/dom.js";
import { formatSchedule } from "../shared/format.js";

function createRow(term, description) {
  const row = createElement("div", "registration-summary-row");

  row.append(
    createElement("dt", "registration-summary-term", term),
    createElement("dd", "registration-summary-value", description),
  );

  return row;
}

export function createRegistrationSummary({ event, registration }) {
  const summary = createElement("dl", "registration-summary");

  summary.append(
    createRow("Event", event.title),
    createRow("Schedule", formatSchedule(event.startsAt)),
    createRow("Venue", event.venue),
    createRow("Attendee", registration.attendeeName),
    createRow("Email", registration.email),
  );

  if (registration.reference) {
    summary.append(createRow("Reference", registration.reference));
  }

  return summary;
}
