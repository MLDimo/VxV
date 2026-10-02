/** Errors whose message can be shown as is to the user (in French). */
export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message = "Cette action est réservée aux officiers.") {
    super(message);
  }
}

export class ValidationError extends ApplicationError {}
