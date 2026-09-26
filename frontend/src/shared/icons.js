const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const ICONS = Object.freeze({
  close: [
    {
      tag: "path",
      attributes: {
        d: "m6 6 12 12M18 6 6 18",
      },
    },
  ],
  events: [
    {
      tag: "path",
      attributes: {
        d: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
      },
    },
  ],
  registrations: [
    {
      tag: "path",
      attributes: {
        d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM16 11l2 2 4-4",
      },
    },
  ],
});

function createSvgElement({ tag, attributes }) {
  const element = document.createElementNS(SVG_NAMESPACE, tag);

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });

  return element;
}

export function createIcon(name) {
  const definition = ICONS[name];

  if (!definition) {
    throw new Error(`Unknown icon: ${name}`);
  }

  const icon = document.createElementNS(SVG_NAMESPACE, "svg");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.append(...definition.map(createSvgElement));

  return icon;
}
