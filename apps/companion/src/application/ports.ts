/** The member the companion acts for, as the website names them. */
export interface Account {
  name: string;
  roles: string[];
}

/** The companion's request to be linked, opened in the browser. */
export interface LinkRequest {
  port: number;
  state: string;
  challenge: string;
}

/** The website's API for the companion. Failures are SiteError, a refused token UnlinkedError. */
export interface SitePort {
  /** The website's page where the member confirms the link. */
  linkPage(request: LinkRequest): string;
  /** Exchanges the link code, with the PKCE verifier, for the companion's token. */
  exchange(code: string, verifier: string): Promise<{ token: string; member: Account }>;
  /** Who the token acts for. */
  me(token: string): Promise<Account>;
  /** Asks the website to forget the token; never fails. */
  unlink(token: string): Promise<void>;
}

/** Listens on this computer only, for the browser coming back from the website's link page. */
export interface LoopbackListener {
  port: number;
  /** The query of the first return, such as code and etat. */
  returned: Promise<URLSearchParams>;
  close(): void;
}

/** The player's choices, kept between launches. */
export interface Settings {
  /** Chosen by the player when the game was not found in its usual places. */
  gameFolder: string | undefined;
  /** Started with the computer, hidden in the notification area: on by default. */
  launchAtLogin: boolean;
}

export interface SettingsStore {
  read(): Promise<Settings>;
  write(settings: Settings): Promise<void>;
}

/** The companion's token, kept secret between launches. */
export interface TokenStore {
  read(): Promise<string | undefined>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}
