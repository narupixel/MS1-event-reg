import { createElement } from "./dom.js";
import { createIcon } from "./icons.js";

const DEFAULT_DURATION = 4_000;
const MAX_VISIBLE_TOASTS = 3;

function createToast(message, remove) {
  const toast = createElement("div", "toast");
  const text = createElement("p", "toast-message", message);
  const close = createElement("button", "toast-close");

  toast.setAttribute("role", "status");
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss notification");
  close.append(createIcon("close"));
  close.addEventListener("click", remove);
  toast.append(text, close);

  return toast;
}

export function initializeToasts() {
  const region = createElement("div", "toast-region");

  region.setAttribute("aria-label", "Notifications");
  region.setAttribute("aria-live", "polite");
  document.body.append(region);

  function show(message, { duration = DEFAULT_DURATION } = {}) {
    let timeout;
    let toast;

    const remove = () => {
      window.clearTimeout(timeout);
      toast?.remove();
    };

    toast = createToast(message, remove);
    region.append(toast);

    while (region.children.length > MAX_VISIBLE_TOASTS) {
      region.firstElementChild.remove();
    }

    timeout = window.setTimeout(remove, duration);

    toast.addEventListener("mouseenter", () => window.clearTimeout(timeout));
    toast.addEventListener("mouseleave", () => {
      timeout = window.setTimeout(remove, duration);
    });
    toast.addEventListener("focusin", () => window.clearTimeout(timeout));
    toast.addEventListener("focusout", () => {
      timeout = window.setTimeout(remove, duration);
    });

    return Object.freeze({ dismiss: remove });
  }

  return Object.freeze({ show });
}
