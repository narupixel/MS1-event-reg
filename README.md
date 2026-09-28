# Event Registry

A browser-based event registration app for a small event company. One event
manager signs in to a private workspace to create events and manage
registrations, and each attendee registers through a private invite link that
opens only their own event.

**Live page:** <https://narupixel.github.io/MS1-event-reg/>

## Features

**Manager workspace (login required)**

- Sign in on the login page. Every manager page redirects to the login page
  until the manager signs in, and the sidebar has a **Log out** button.
- Create, view, edit, publish, close, and remove events.
- Copy a private **attendee link** from any published event's detail page.
- Review registrations, cancel them, and remove canceled records.

**Attendee access (invite link only)**

- The attendee link opens only the invited event, with a **Register** button.
- Attendees enter their name and email, review their details, confirm, and
  receive a registration reference.
- There is no public event list. A missing link shows "Invitation link
  required", and a link to a draft, closed, full, past, or unknown event shows
  "Event unavailable".

**Across the app**

- Validation for event details, attendee details, capacity, and event status.
- Confirmation dialogs before destructive actions, plus brief toast messages.
- Events and registrations are saved in the browser with `localStorage`, so
  they remain after a refresh. Registrations made from an invite link appear on
  the manager's Registrations page, including in another open tab.
- Responsive layout for phone, tablet, and desktop, with automatic light and
  dark themes.

## Scope

- **One manager per event registry.** The app has a single manager account.
  Multiple managers and per-manager event ownership are outside the current
  scope.
- **Frontend only.** There is no backend server or database.

## Demo login

- Username: `agent`
- Password: `1234`

These credentials are defined in `frontend/src/shared/auth.js` and are for the
demo only. Because they are in the browser code, this login separates the
manager and attendee experiences but is not real security. Secure,
server-side authentication is planned for a future backend.

## Demo workflow

1. Open the live page and sign in with the demo login.
2. Select **New event**, fill in the details, set the status to **Published**,
   and save.
3. Open the event with **View details** and select **Copy link** under
   **Attendee link**.
4. Paste the link into a **new tab in the same browser**. Only that event's
   registration page appears.
5. Register an attendee, review the details, and confirm.
6. Return to the manager tab and open **Registrations** to see the new record
   and updated availability.

To reset to the sample events, clear this site's Local Storage in the browser's
developer tools (Application → Local Storage) and refresh the page.

## Known limitations

- Data is saved in **one browser on one device**. An invite link opened on a
  different device, or in a private or incognito window, will not find events
  created elsewhere. Sharing data across devices requires a backend.
- The app does not send email, process payments, or send attendee information
  to a server.

## Run locally

The app uses native JavaScript modules, so it must be opened through a local
HTTP server rather than directly from the file system. No packages or database
are needed.

From the repository root:

```bash
cd frontend
python -m http.server 8000
```

Then open <http://localhost:8000/> and sign in. Any static file server with
`frontend/` as its document root also works.

## Deployment

Every push to `main` deploys the `frontend/` folder to GitHub Pages through
`.github/workflows/deploy-pages.yml`. The workflow can also be run manually
from the **Actions** tab.

## Main routes

| Route | Who can open it | Purpose |
| --- | --- | --- |
| `#login` | Anyone | Manager sign-in |
| `#events` | Manager | Event list and event creation |
| `#detail` | Manager | Event details, status controls, and attendee link |
| `#editor` | Manager | Create or edit an event |
| `#registrations` | Manager | Review, cancel, and remove registrations |
| `#register/<event id>` | Anyone with the link | Invited event page |
| `#form/<event id>` | Anyone with the link | Attendee details and review |
| `#confirmation` | Attendee after registering | Registration confirmation and reference |

## Workflows and CRUD ownership

- Manager: Log in → Events → Create or edit → Publish → Copy attendee link
- Attendee: Attendee link → Register → Enter details → Review → Confirmation
- Registration management: Registrations → Cancel → Remove canceled record

| Operation | Events | Registrations |
| --- | --- | --- |
| Create | `events/service.js` | `registrations/service.js` |
| Read | `events/service.js` | `registrations/service.js` |
| Update | `events/service.js` | `registrations/service.js` |
| Delete | `events/service.js` | `registrations/service.js` |

Within each feature, `model.js` validates records, `service.js` applies
user-facing rules, and `store.js` stores records in `localStorage`. The usual
flow is: screen input → service rules → model validation → store update →
screen render.

## Tests

Run the Node test suite from the repository root:

```bash
node --test frontend/tests/*.test.js
```

The tests cover event and registration rules, CRUD behavior, availability,
removal protection, and route mapping. Node.js is required only for the tests,
not for running the app.

## Project structure

```text
.github/
`-- workflows/
    `-- deploy-pages.yml
frontend/
|-- assets/
|   `-- logo.png
|-- index.html
|-- tests/
|   |-- events.test.js
|   |-- registrations.test.js
|   `-- routes.test.js
`-- src/
    |-- main.js
    |-- events/
    |-- registrations/
    |-- shared/
    `-- styles/
```

- `frontend/index.html` contains the application shell and page markup.
- `frontend/src/main.js` creates the stores, connects the features, and starts
  routing, login, and shared interface helpers.
- `frontend/src/events/` owns event validation, CRUD operations, sample data,
  the manager event screens, and the attendee invite page (`browse.js`).
- `frontend/src/registrations/` owns attendee validation, registration CRUD,
  and the registration screens.
- `frontend/src/shared/` contains login (`auth.js`), routing, the page shell,
  and DOM, formatting, and feedback helpers.
- `frontend/src/styles/` contains design tokens, layout, form, login, feature,
  and feedback styles.

## Design principles

- Adaptive monochrome visual system with clear states and comfortable targets.
- Semantic structure, visible keyboard focus, and reduced-motion support.
- Compact manager navigation that becomes horizontal on smaller screens.
- Manager and attendee experiences are kept separate: the manager uses a
  sidebar workspace, and attendees see only a simple header and their event.

## Team

Jhon Andrew Sia, Joanna Rose Ignacio, Ibrahim Lagyal, Joe Marie Zabala, and
Dianna Cathlene De Leon (MO-IT161, H3101 Group 28).

## Repository

- [Live page](https://narupixel.github.io/MS1-event-reg/)
- [Issues](https://github.com/narupixel/MS1-event-reg/issues)
