const schedule = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

const created = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export function formatSchedule(value) {
  return schedule.format(new Date(value));
}

export function formatCreated(value) {
  return created.format(new Date(value));
}
