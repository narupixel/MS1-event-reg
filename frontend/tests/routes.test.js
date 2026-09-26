import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DEFAULT_ROUTE,
  getNavigationRoute,
  getShellMode,
  MANAGER_ROUTE_IDS,
  NAVIGATION_GROUPS,
  PUBLIC_ROUTE_IDS,
  renderShell,
  ROUTE_IDS,
} from "../src/shared/shell.js";
import { resolveRoute } from "../src/shared/router.js";

const markup = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("navigation routes are unique and include the default route", () => {
  assert.equal(new Set(ROUTE_IDS).size, ROUTE_IDS.length);
  assert.equal(ROUTE_IDS.includes(DEFAULT_ROUTE), true);
  assert.equal(ROUTE_IDS.includes("login"), true);
  assert.equal(ROUTE_IDS.includes("editor"), true);
  assert.equal(ROUTE_IDS.includes("detail"), true);
  assert.equal(ROUTE_IDS.includes("form"), true);
  assert.equal(ROUTE_IDS.includes("confirmation"), true);
  assert.equal(getNavigationRoute("editor"), "events");
  assert.equal(getNavigationRoute("detail"), "events");
  assert.equal(getNavigationRoute("form"), "register");
  assert.equal(getNavigationRoute("confirmation"), "register");
});

test("manager and public routes use separate application shells", () => {
  MANAGER_ROUTE_IDS.forEach((route) => {
    assert.equal(getShellMode(route), "manager");
  });
  PUBLIC_ROUTE_IDS.forEach((route) => {
    assert.equal(getShellMode(route), "public");
  });
  assert.equal(getShellMode("login"), "auth");
});

test("route resolution handles unknown and uninitialized views", () => {
  assert.equal(resolveRoute("unknown"), DEFAULT_ROUTE);
  assert.equal(resolveRoute("events"), "events");
  assert.equal(resolveRoute("form", false), "register");
  assert.equal(resolveRoute("confirmation", false), "register");
  assert.equal(resolveRoute("editor", false), "events");
  assert.equal(resolveRoute("events", true, false), "login");
  assert.equal(resolveRoute("login", true, true), DEFAULT_ROUTE);
  assert.equal(resolveRoute("register", true, false), "register");
});

test("the document provides separate manager and public shell hooks", () => {
  assert.match(markup, /data-app-shell data-mode="manager"/);
  assert.match(markup, /data-public-header hidden/);
  assert.match(markup, /href="#register">\s*Preview attendee page/);
});

test("renderShell hides and restores the manager navigation", () => {
  const originalDocument = globalThis.document;
  const shell = { dataset: {} };
  const sidebar = { hidden: false };
  const publicHeader = { hidden: true };
  const elements = new Map([
    ["[data-app-shell]", shell],
    ["[data-sidebar]", sidebar],
    ["[data-public-header]", publicHeader],
  ]);

  globalThis.document = {
    querySelector: (selector) => elements.get(selector) ?? null,
  };

  try {
    renderShell("register");
    assert.equal(shell.dataset.mode, "public");
    assert.equal(sidebar.hidden, true);
    assert.equal(publicHeader.hidden, false);

    renderShell("events");
    assert.equal(shell.dataset.mode, "manager");
    assert.equal(sidebar.hidden, false);
    assert.equal(publicHeader.hidden, true);
  } finally {
    globalThis.document = originalDocument;
  }
});

test("every navigation route provides its label and icon", () => {
  const navigationRoutes = NAVIGATION_GROUPS.flatMap((group) => group.routes);

  assert.deepEqual(
    navigationRoutes.map((route) => route.id),
    ["events", "registrations"],
  );
  navigationRoutes.forEach((route) => {
    assert.ok(route.label);
    assert.ok(route.icon);
  });
});
