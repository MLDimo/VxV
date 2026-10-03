import { createServer } from "node:http";
import { createFakeDiscord } from "@vxv/server/testing";
import { FAKE_DISCORD_PORT } from "./environment";

/**
 * Discord's REST API for the end-to-end tests, in memory. The tests read what the bot did
 * at /state/<Discord user id> (nickname and role names) and /messages (messages published, in order).
 */
const API_PREFIX = "/api/v10";
const discord = createFakeDiscord();

createServer((request, response) => {
  const chunks: Buffer[] = [];
  request.on("data", (chunk: Buffer) => chunks.push(chunk));
  request.on("end", () => {
    const path = request.url ?? "/";
    response.setHeader("Content-Type", "application/json");
    if (path === "/messages") {
      response.end(JSON.stringify(discord.messages()));
      return;
    }
    if (path.startsWith("/state/")) {
      const userId = path.slice("/state/".length);
      response.end(JSON.stringify({ nickname: discord.nicknameOf(userId), roles: discord.roleNamesOf(userId) }));
      return;
    }
    const text = Buffer.concat(chunks).toString();
    const reply = discord.handle(
      request.method ?? "GET",
      path.replace(API_PREFIX, ""),
      text ? JSON.parse(text) : undefined,
    );
    response.statusCode = reply.status;
    response.end(reply.body === undefined ? undefined : JSON.stringify(reply.body));
  });
}).listen(FAKE_DISCORD_PORT);
