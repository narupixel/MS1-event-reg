export const AUTH_ROUTE = "login";
export const LOGIN_USERNAME = "agent";
export const LOGIN_PASSWORD = "1234";

const SESSION_KEY = "event-registry-authenticated";

export function isAuthenticated(storage = window.sessionStorage) {
  return storage.getItem(SESSION_KEY) === "true";
}

export function authenticate({ username, password, storage = window.sessionStorage }) {
  const valid = username === LOGIN_USERNAME && password === LOGIN_PASSWORD;

  if (valid) {
    storage.setItem(SESSION_KEY, "true");
  }

  return valid;
}

export function clearAuthentication(storage = window.sessionStorage) {
  storage.removeItem(SESSION_KEY);
}

export function initializeLogin({ onLogin }) {
  const form = document.querySelector("[data-login-form]");
  const error = document.querySelector("[data-login-error]");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const valid = authenticate({
      username: formData.get("username")?.trim(),
      password: formData.get("password"),
    });

    if (!valid) {
      if (error) {
        error.hidden = false;
      }
      form.querySelector("[name=\"password\"]")?.focus();
      return;
    }

    if (error) {
      error.hidden = true;
    }
    onLogin();
  });
}