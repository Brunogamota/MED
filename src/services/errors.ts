/** Errors that map onto HTTP status codes at the API boundary. */

export class NotFoundError extends Error {
  constructor(message = 'Recurso nao encontrado') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
