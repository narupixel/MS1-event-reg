import {
  DEFAULT_ROUTE,
  getNavigationRoute,
  MANAGER_ROUTE_IDS,
  PUBLIC_ROUTE_IDS,
  renderShell,
  ROUTE_IDS,
} from "./shell.js";
import { AUTH_ROUTE } from "./auth.js";

export function resolveRoute(requestedRoute, isReady = true, isAuthenticated = true) {
  if (
    !isAuthenticated &&
    (requestedRoute === AUTH_ROUTE ||
      MANAGER_ROUTE_IDS.includes(requestedRoute) ||
      !PUBLIC_ROUTE_IDS.includes(requestedRoute))
  ) {
    return AUTH_ROUTE;
  }

  if (requestedRoute === AUTH_ROUTE) {
    return DEFAULT_ROUTE;
  }

  if (!ROUTE_IDS.includes(requestedRoute)) {
    return DEFAULT_ROUTE;
  }

  return isReady ? requestedRoute : getNavigationRoute(requestedRoute);
}

function getRoute(isAuthenticated) {
  const requestedRoute = window.location.hash.slice(1).split("/")[0];
  const isReady =
    !ROUTE_IDS.includes(requestedRoute) ||
    document.querySelector(`[data-view="${requestedRoute}"]`)?.dataset.ready !==
      "false";

  return resolveRoute(requestedRoute, isReady, isAuthenticated());
}

function renderRoute(route) {
  const navigationRoute = getNavigationRoute(route);

  renderShell(route);

  document.querySelectorAll("[data-view]").forEach((view) => {
    view.hidden = view.dataset.view !== route;
  });

  document.querySelectorAll("[data-route]").forEach((link) => {
    if (link.dataset.route === navigationRoute) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const heading = document.querySelector(`[data-view="${route}"] h1`);
  document.title = `${heading.textContent} | Event Registry`;
}

export function initializeRouter({ isAuthenticated = () => true } = {}) {
  const renderCurrentRoute = () => renderRoute(getRoute(isAuthenticated));

  window.addEventListener("hashchange", renderCurrentRoute);
  renderCurrentRoute();
}
