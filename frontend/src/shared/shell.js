import { createElement } from "./dom.js";
import { createIcon } from "./icons.js";

export const DEFAULT_ROUTE = "events";

export const NAVIGATION_GROUPS = Object.freeze([
  Object.freeze({
    label: "Manage",
    routes: Object.freeze([
      Object.freeze({ id: "events", label: "Events", icon: "events" }),
      Object.freeze({
        id: "registrations",
        label: "Registrations",
        icon: "registrations",
      }),
    ]),
  }),
]);

export const MANAGER_ROUTE_IDS = Object.freeze([
  ...NAVIGATION_GROUPS.flatMap((group) =>
    group.routes.map((route) => route.id),
  ),
  "detail",
  "editor",
]);

export const PUBLIC_ROUTE_IDS = Object.freeze([
  "register",
  "form",
  "confirmation",
]);

export const ROUTE_IDS = Object.freeze([
  "login",
  ...MANAGER_ROUTE_IDS,
  ...PUBLIC_ROUTE_IDS,
]);

export function getNavigationRoute(route) {
  if (["detail", "editor"].includes(route)) {
    return "events";
  }

  return ["form", "confirmation"].includes(route) ? "register" : route;
}

export function getShellMode(route) {
  if (route === "login") {
    return "auth";
  }

  return PUBLIC_ROUTE_IDS.includes(route) ? "public" : "manager";
}

function createNavigationLink(route) {
  const link = createElement("a", "navigation-link");

  link.href = `#${route.id}`;
  link.dataset.route = route.id;
  link.append(createIcon(route.icon), createElement("span", "", route.label));

  return link;
}

function createNavigationGroup(group) {
  const container = createElement("div", "navigation-group");
  const label = createElement("p", "navigation-label", group.label);

  container.append(label, ...group.routes.map(createNavigationLink));
  return container;
}

function createNavigation() {
  const navigation = createElement("nav", "navigation");

  navigation.setAttribute("aria-label", "Primary navigation");
  navigation.append(...NAVIGATION_GROUPS.map(createNavigationGroup));

  return navigation;
}

function createBrand(href) {
  const brand = createElement("a", "brand");
  const mark = createElement("span", "brand-mark");

  brand.href = href;
  brand.setAttribute("aria-label", "Event Registry home");
  mark.setAttribute("aria-hidden", "true");
  brand.append(mark, createElement("span", "brand-name", "Event Registry"));

  return brand;
}

function createPublicHeader() {
  const inner = createElement("div", "public-header-inner");
  const managerLink = createElement(
    "a",
    "button button-secondary public-manager-link",
    "Manager workspace",
  );

  managerLink.href = "#events";
  inner.append(createBrand("#register"), managerLink);

  return inner;
}

export function initializeShell() {
  const sidebar = document.querySelector("[data-sidebar]");
  const publicHeader = document.querySelector("[data-public-header]");

  if (sidebar) {
    sidebar.replaceChildren(
      createBrand("#events"),
      createNavigation(),
      (() => {
        const logout = createElement(
          "button",
          "button button-secondary sidebar-logout",
          "Sign out",
        );
        logout.type = "button";
        logout.dataset.logout = "true";
        return logout;
      })(),
      createElement(
        "p",
        "environment-note",
        "Sample data - resets on refresh",
      ),
    );
  }

  publicHeader?.replaceChildren(createPublicHeader());
}

export function renderShell(route) {
  const shell = document.querySelector("[data-app-shell]");
  const sidebar = document.querySelector("[data-sidebar]");
  const publicHeader = document.querySelector("[data-public-header]");
  const mode = getShellMode(route);

  if (shell) {
    shell.dataset.mode = mode;
  }

  if (sidebar) {
    sidebar.hidden = mode !== "manager";
  }

  if (publicHeader) {
    publicHeader.hidden = mode !== "public";
  }
}
