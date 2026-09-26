export const REGISTRATION_STATUSES = Object.freeze(["confirmed", "canceled"]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class RegistrationValidationError extends Error {
  constructor(errors) {
    super("The registration is invalid.");
    this.name = "RegistrationValidationError";
    this.errors = errors;
  }
}

export function isEmailAddress(value) {
  return EMAIL_PATTERN.test(String(value ?? "").trim());
}

export function validateRegistration(registration) {
  const errors = {};

  if (!registration.id) {
    errors.id = "A registration ID is required.";
  }

  if (!registration.eventId) {
    errors.eventId = "An event is required.";
  }

  if (!registration.attendeeName) {
    errors.attendeeName = "Your name is required.";
  } else if (registration.attendeeName.length > 100) {
    errors.attendeeName = "Your name must be 100 characters or fewer.";
  }

  if (registration.email.length > 254) {
    errors.email = "Your email must be 254 characters or fewer.";
  } else if (!isEmailAddress(registration.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!REGISTRATION_STATUSES.includes(registration.status)) {
    errors.status = "The registration status is not supported.";
  }

  if (Number.isNaN(Date.parse(registration.createdAt))) {
    errors.createdAt = "A valid creation time is required.";
  }

  return errors;
}

export function createRegistration(attributes) {
  const registration = {
    id: String(attributes.id ?? "").trim(),
    eventId: String(attributes.eventId ?? "").trim(),
    attendeeName: String(attributes.attendeeName ?? "").trim(),
    email: String(attributes.email ?? "").trim().toLowerCase(),
    status: String(attributes.status ?? "confirmed").trim().toLowerCase(),
    createdAt: String(attributes.createdAt ?? "").trim(),
  };
  const errors = validateRegistration(registration);

  if (Object.keys(errors).length > 0) {
    throw new RegistrationValidationError(errors);
  }

  return Object.freeze(registration);
}
