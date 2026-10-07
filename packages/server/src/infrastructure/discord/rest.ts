const DISCORD_API_URL = "https://discord.com/api/v10";

const HTTP_NO_CONTENT = 204;

export class DiscordApiError extends Error {
  constructor(
    readonly status: number,
    request: string,
    body: string,
  ) {
    super(`Discord refused ${request} (${status}): ${body}`);
    this.name = "DiscordApiError";
  }
}

export interface DiscordRestOptions {
  token: string;
  /** Another address in the end-to-end tests, which stand in for Discord. */
  apiUrl?: string;
}

/** Calls Discord's REST API as the bot. The reason, if any, appears in the server's audit log. */
export function createDiscordRest({ token, apiUrl = DISCORD_API_URL }: DiscordRestOptions) {
  return async function request<Result = void>(
    method: string,
    path: string,
    { body, reason }: { body?: unknown; reason?: string } = {},
  ): Promise<Result> {
    const headers: Record<string, string> = { Authorization: `Bot ${token}` };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (reason !== undefined) {
      headers["X-Audit-Log-Reason"] = encodeURIComponent(reason);
    }
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new DiscordApiError(response.status, `${method} ${path}`, await response.text());
    }
    return (response.status === HTTP_NO_CONTENT ? undefined : await response.json()) as Result;
  };
}

export type DiscordRest = ReturnType<typeof createDiscordRest>;
