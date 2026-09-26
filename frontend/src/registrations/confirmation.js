import { createRegistrationSummary } from "./summary.js";

export function initializeConfirmation({ onRegisterAgain }) {
  const view = document.querySelector('[data-view="confirmation"]');
  const summary = view?.querySelector("[data-confirmation-summary]");
  const registerAgain = view?.querySelector("[data-register-again]");
  let currentEventId = null;

  function open({ event, registration }) {
    view.dataset.ready = "true";
    currentEventId = event.id;
    const reference = registration.id.slice(0, 8).toUpperCase();

    summary.replaceChildren(
      createRegistrationSummary({
        event,
        registration: { ...registration, reference },
      }),
    );
  }

  if (!view || !summary || !registerAgain) {
    return Object.freeze({ open() {} });
  }

  registerAgain.addEventListener("click", () => {
    if (currentEventId) {
      onRegisterAgain(currentEventId);
    }
  });

  return Object.freeze({ open });
}
