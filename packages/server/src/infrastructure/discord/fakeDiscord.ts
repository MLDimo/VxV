/**
 * In-memory stand-in for the part of Discord's REST API the bot uses, for the tests.
 * Like Discord, it refuses to rename the server owner.
 */
export interface FakeDiscordReply {
  status: number;
  body?: unknown;
}

interface Role {
  id: string;
  name: string;
}

const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const MISSING_PERMISSIONS = { message: "Missing Permissions", code: 50013 };

export function createFakeDiscord({ ownerId }: { ownerId?: string } = {}) {
  const roles: Role[] = [];
  const memberRoles = new Map<string, Set<string>>();
  const nicknames = new Map<string, string>();
  const requests: { method: string; path: string; body: unknown }[] = [];
  let lastId = 0;
  const newId = () => String((lastId += 1));
  const rolesOfMember = (userId: string) => memberRoles.get(userId) ?? new Set<string>();

  function handle(method: string, path: string, body: unknown): FakeDiscordReply {
    requests.push({ method, path, body });
    const [, , , resource, userId, , roleId] = path.split("/");
    const route = `${method} ${resource}${userId === undefined ? "" : "/:id"}${roleId === undefined ? "" : "/roles/:id"}`;
    switch (route) {
      case "GET roles":
        return { status: HTTP_OK, body: roles };
      case "POST roles": {
        const role = { id: newId(), name: (body as { name: string }).name };
        roles.push(role);
        return { status: HTTP_OK, body: role };
      }
      case "GET members/:id":
        return { status: HTTP_OK, body: { user: { id: userId }, roles: [...rolesOfMember(userId ?? "")] } };
      case "PATCH members/:id":
        if (userId === ownerId) {
          return { status: HTTP_FORBIDDEN, body: MISSING_PERMISSIONS };
        }
        nicknames.set(userId ?? "", (body as { nick: string }).nick);
        return { status: HTTP_OK, body: {} };
      case "PUT members/:id/roles/:id":
        memberRoles.set(userId ?? "", rolesOfMember(userId ?? "").add(roleId ?? ""));
        return { status: HTTP_NO_CONTENT };
      case "DELETE members/:id/roles/:id":
        rolesOfMember(userId ?? "").delete(roleId ?? "");
        return { status: HTTP_NO_CONTENT };
      default:
        return { status: HTTP_NOT_FOUND, body: { message: `Unknown route ${method} ${path}` } };
    }
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
    roleNamesOf: (userId: string) =>
      roles.filter((role) => rolesOfMember(userId).has(role.id)).map((role) => role.name),
  };
}

export type FakeDiscord = ReturnType<typeof createFakeDiscord>;
