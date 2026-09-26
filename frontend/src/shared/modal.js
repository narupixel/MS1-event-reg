import { createElement } from "./dom.js";

function createModalElement() {
  const dialog = createElement("dialog", "modal");
  const surface = createElement("div", "modal-surface");
  const content = createElement("div", "modal-content");
  const title = createElement("h2", "modal-title");
  const message = createElement("p", "modal-message");
  const actions = createElement("div", "modal-actions");
  const cancel = createElement(
    "button",
    "button button-secondary",
    "Cancel",
  );
  const confirm = createElement(
    "button",
    "button button-primary",
    "Confirm",
  );

  title.id = "app-modal-title";
  message.id = "app-modal-message";
  dialog.setAttribute("aria-labelledby", title.id);
  dialog.setAttribute("aria-describedby", message.id);
  cancel.type = "button";
  confirm.type = "button";
  cancel.dataset.modalCancel = "";
  confirm.dataset.modalConfirm = "";

  content.append(title, message);
  actions.append(cancel, confirm);
  surface.append(content, actions);
  dialog.append(surface);

  return { dialog, title, message, cancel, confirm };
}

export function initializeModal() {
  const elements = createModalElement();
  const { dialog, title, message, cancel, confirm } = elements;

  document.body.append(dialog);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close("cancel");
    }
  });

  cancel.addEventListener("click", () => dialog.close("cancel"));
  confirm.addEventListener("click", () => dialog.close("confirm"));

  function ask({
    heading,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = false,
  }) {
    if (dialog.open) {
      dialog.close("cancel");
    }

    title.textContent = heading;
    message.textContent = description;
    confirm.textContent = confirmLabel;
    cancel.textContent = cancelLabel;
    confirm.classList.toggle("button-destructive", destructive);
    dialog.returnValue = "cancel";
    dialog.showModal();

    return new Promise((resolve) => {
      dialog.addEventListener(
        "close",
        () => resolve(dialog.returnValue === "confirm"),
        { once: true },
      );
    });
  }

  return Object.freeze({ ask });
}
