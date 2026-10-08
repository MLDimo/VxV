/**
 * In-memory stand-in for the part of Discord's REST API the bot uses, for the tests.
 * Like Discord, it refuses to rename the server owner, and knows no member who left the server.
 */
export interface FakeDiscordReply {
  status: number;
  body?: unknown;
}

interface Role {
  id: string;
  name: string;
  managed: boolean;
  /** Discord's default: 0, no colour. */
  color: number;
}

/** A message the bot published in a channel, as last edited. */
export interface FakeMessage {
  id: string;
  channelId: string;
  body: Record<string, unknown>;
}

const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const MISSING_PERMISSIONS = { message: "Missing Permissions", code: 50013 };
const UNKNOWN_MESSAGE = { message: "Unknown Message", code: 10008 };
const UNKNOWN_MEMBER = { message: "Unknown Member", code: 10007 };

type Handler = (params: string[], body: unknown) => FakeDiscordReply;

export function createFakeDiscord({ ownerId }: { ownerId?: string } = {}) {
  const roles: Role[] = [];
  const memberRoles = new Map<string, Set<string>>();
  const nicknames = new Map<string, string>();
  const messages = new Map<string, FakeMessage>();
  const departed = new Set<string>();
  const requests: { method: string; path: string; body: unknown }[] = [];
  let lastId = 0;
  const newId = () => String((lastId += 1));
  const rolesOf = (userId: string) => memberRoles.get(userId) ?? new Set<string>();
  const ok = (body?: unknown): FakeDiscordReply => ({ status: body === undefined ? HTTP_NO_CONTENT : HTTP_OK, body });
  const everyone = (guildId: string): Role => ({ id: guildId, name: "@everyone", managed: false, color: 0 });
  function addRole(name: string, managed = false, color = 0): Role {
    const role = { id: newId(), name, managed, color };
    roles.push(role);
    return role;
  }

  const routes: [method: string, path: RegExp, handler: Handler][] = [
    // Like Discord, @everyone has the server's id.
    ["GET", /^\/guilds\/([^/]+)\/roles$/, ([guildId = ""]) => ok([everyone(guildId), ...roles])],
    [
      "POST",
      /^\/guilds\/[^/]+\/roles$/,
      (_, body) => {
        const { name, color } = body as { name: string; color?: number };
        return ok(addRole(name, false, color));
      },
    ],
    [
      "PATCH",
      /^\/guilds\/[^/]+\/roles\/([^/]+)$/,
      ([roleId = ""], body) => {
        const role = roles.find((candidate) => candidate.id === roleId);
        if (role === undefined) {
          return { status: HTTP_NOT_FOUND, body: { message: "Unknown Role", code: 10011 } };
        }
        role.color = (body as { color: number }).color;
        return ok(role);
      },
    ],
    [
      "GET",
      /^\/guilds\/[^/]+\/members\/([^/]+)$/,
      ([userId = ""]) =>
        departed.has(userId)
          ? { status: HTTP_NOT_FOUND, body: UNKNOWN_MEMBER }
          : ok({ user: { id: userId }, roles: [...rolesOf(userId)] }),
    ],
    [
      "PATCH",
      /^\/guilds\/[^/]+\/members\/([^/]+)$/,
      ([userId = ""], body) => {
        if (userId === ownerId) {
          return { status: HTTP_FORBIDDEN, body: MISSING_PERMISSIONS };
        }
        nicknames.set(userId, (body as { nick: string }).nick);
        return ok({});
      },
    ],
    [
      "PUT",
      /^\/guilds\/[^/]+\/members\/([^/]+)\/roles\/([^/]+)$/,
      ([userId = "", roleId = ""]) => {
        memberRoles.set(userId, rolesOf(userId).add(roleId));
        return ok();
      },
    ],
    [
      "DELETE",
      /^\/guilds\/[^/]+\/members\/([^/]+)\/roles\/([^/]+)$/,
      ([userId = "", roleId = ""]) => {
        rolesOf(userId).delete(roleId);
        return ok();
      },
    ],
    [
      "POST",
      /^\/channels\/([^/]+)\/messages$/,
      ([channelId = ""], body) => {
        const message = { id: newId(), channelId, body: body as Record<string, unknown> };
        messages.set(message.id, message);
        return ok({ id: message.id, channel_id: channelId });
      },
    ],
    [
      "PATCH",
      /^\/channels\/([^/]+)\/messages\/([^/]+)$/,
      ([channelId = "", messageId = ""], body) => {
        const message = messages.get(messageId);
        if (message?.channelId !== channelId) {
          return { status: HTTP_NOT_FOUND, body: UNKNOWN_MESSAGE };
        }
        message.body = body as Record<string, unknown>;
        return ok({ id: messageId, channel_id: channelId });
      },
    ],
  ];

  function handle(method: string, path: string, body: unknown): FakeDiscordReply {
    requests.push({ method, path, body });
    for (const [routeMethod, pattern, handler] of routes) {
      const match = routeMethod === method ? pattern.exec(path) : null;
      if (match !== null) {
        return handler(match.slice(1), body);
      }
    }
    return { status: HTTP_NOT_FOUND, body: { message: `Unknown route ${method} ${path}` } };
  }

  return {
    handle,
    requests,
    /** Same contract as fetch, for the REST client under test. */
    async fetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
      const url = new URL(input instanceof Request ? input.url : input);
      const body = typeof init.body === "string" ? (JSON.parse(init.body) as unknown) : undefined;
      const reply = handle(init.method ?? "GET", url.pathname.replace(/^\/api\/v10/, ""), body);
      return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), { status: reply.status });
    },
    nicknameOf: (userId: string) => nicknames.get(userId),
    /** A role created on the server by hand, or given by Discord to a bot (managed); returns its id. */
    addRole: (name: string, managed = false) => addRole(name, managed).id,
    /** The user leaves the guild's server. */
    leave: (userId: string) => departed.add(userId),
    roleNamesOf: (userId: string) => roles.filter((role) => rolesOf(userId).has(role.id)).map((role) => role.name),
    /** The colour of the server's role of this name, 0 for none. */
    roleColorOf: (roleName: string) => roles.find((role) => role.name === roleName)?.color,
    /** Messages published by the bot, in publication order. */
    messages: () => [...messages.values()],
  };
}

export type FakeDiscord = ReturnType<typeof createFakeDiscord>;
