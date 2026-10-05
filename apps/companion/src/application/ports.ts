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

/** The next event, or the one being played, as the website gives it to the companion. */
export interface NextRaid {
  /** VXV-RAID text, as an officer would paste it in game. */
  text: string;
  title: string;
  /** ISO 8601. */
  startsAt: string;
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
  /** What the addon needs from the website. */
  download(token: string): Promise<{ raid: NextRaid | null }>;
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

/** The game's files the companion writes, in one version of the game. */
export interface GameFiles {
  /** Writes the inbox of VXV_Sync; false when the addon has no VXV_Sync yet (an older version). */
  writeInbox(installation: string, content: string): Promise<boolean>;
}
