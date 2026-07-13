/**
 * Custom error hierarchy used across Trailer Studio.
 * Modules should throw these instead of generic Error so callers can
 * `instanceof`-branch on failure kind (e.g. UI can show a validation
 * message differently than a storage failure).
 */

/** Thrown by stub functions whose real implementation lands in a later stage. */
export class NotImplementedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

/** Thrown when a data shape (Project, Clip, ...) fails validation. */
export class ValidationError extends Error {
  /**
   * @param {string} message
   * @param {string[]} [details] individual validation failure messages
   */
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/** Thrown when an imported AI JSON scenario does not match the expected schema. */
export class SchemaError extends Error {
  /**
   * @param {string} message
   * @param {string[]} [details]
   */
  constructor(message, details = []) {
    super(message);
    this.name = 'SchemaError';
    this.details = details;
  }
}

/** Thrown when an IndexedDB/localStorage operation fails. */
export class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}
