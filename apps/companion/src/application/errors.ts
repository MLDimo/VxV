/** The website could not be reached, or refused the request; the message can be shown as is (French). */
export class SiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiteError";
  }
}

/** The website no longer accepts the companion's token: the member must link the companion again. */
export class UnlinkedError extends SiteError {
  constructor(message = "Le compagnon n'est plus relié à ton compte : relie-le de nouveau.") {
    super(message);
    this.name = "UnlinkedError";
  }
}
