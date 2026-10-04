import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";
import { startGuild } from "../guild.ts";

const GUILD = ["Ðéjà Vu", "Thom Leboss", "Eole Hermes"];

/** Records the messages of a kind received by a player: { sender, payload }. */
const LISTEN = (kind: string) => `
  local _, ns = ...
  Received = {}
  ns.Comm.On("${kind}", function(payload, sender, channel)
      Received[#Received + 1] = { sender = sender, payload = payload, channel = channel }
  end)
`;

describe("Serializer", () => {
  const roundTrip = (value: string) => {
    const { core } = startCore();
    return core.run(`local _, ns = ... return { ns.Serializer.Decode(ns.Serializer.Encode(${value})) }`);
  };

  it("brings back strings with accents and separators, numbers, booleans and nested tables", () => {
    expect(
      roundTrip(
        '{ name = "Ðéjà Vu", note = "a:b;s3:c\\031", level = 60, ratio = 0.1, ok = true, no = false, list = { 1, { 2 } } }',
      ),
    ).toEqual([
      { name: "Ðéjà Vu", note: "a:b;s3:c\u001f", level: 60, ratio: 0.1, ok: true, no: false, list: [1, [2]] },
    ]);
  });

  it("refuses damaged or foreign text without any Lua error", () => {
    const { core } = startCore();
    const decode = (text: string) =>
      core.run(`local _, ns = ...
        local value, problem = ns.Serializer.Decode(${JSON.stringify(text)})
        return { value = value, problem = problem }`);
    for (const text of ["", "s99:court", "n12", "tT", "x", "TT", "t".repeat(40)]) {
      expect(decode(text)).toEqual({ problem: expect.any(String) });
    }
  });
});

describe("communication between the guild's addons", () => {
  it("delivers data sent by one player to every connected member, the sender included once", () => {
    const guild = startGuild(GUILD);
    for (const player of guild.players) {
      player.core.run(LISTEN("note"));
    }
    guild
      .player("Ðéjà Vu")
      .core.run('local _, ns = ... ns.Comm.Broadcast("note", { text = "Raid ce soir", count = 3 })');
    guild.deliver();
    for (const player of guild.players) {
      expect(player.client("return Received")).toEqual([
        { sender: "Ðéjà Vu", payload: { text: "Raid ce soir", count: 3 }, channel: "GUILD" },
      ]);
    }
  });

  it("cuts large data into pieces of 255 bytes at most, put back together intact", () => {
    const guild = startGuild(GUILD.slice(0, 2));
    guild.player("Thom Leboss").core.run(LISTEN("big"));
    guild.player("Ðéjà Vu").core.run('local _, ns = ... ns.Comm.Broadcast("big", { text = string.rep("Ðéjà ", 600) })');
    guild.deliver();
    // More than 10 pieces: the rest leaves at one per second.
    guild.player("Ðéjà Vu").client("AdvanceTime(30)");
    guild.deliver();
    // "Ðéjà " takes 8 bytes in UTF-8: 600 of them make 4800 bytes, whatever the pieces cut.
    expect(guild.player("Thom Leboss").client("return #Received[1].payload.text")).toBe(4800);
    expect(guild.player("Ðéjà Vu").client("return #OversizedMessages")).toBe(0);
  });

  it("does not hand a raid message twice to its sender, whom the raid sends it back to", () => {
    const guild = startGuild(GUILD);
    guild.player("Ðéjà Vu").core.run(LISTEN("loot"));
    guild.player("Ðéjà Vu").core.run('local _, ns = ... ns.Comm.Broadcast("loot", { item = 1 }, "RAID")');
    guild.deliver();
    expect(guild.player("Ðéjà Vu").client("return #Received")).toBe(1);
  });

  it("ignores messages of another protocol version, damaged or secret, without any error", () => {
    const { core, client, errors } = startCore();
    core.run(LISTEN("note"));
    client(`
      Fire("CHAT_MSG_ADDON", "VXV", "2\\031x1\\03101\\0311\\031note\\031T", "GUILD", "Thom Leboss")
      Fire("CHAT_MSG_ADDON", "VXV", "n'importe quoi", "GUILD", "Thom Leboss")
      Fire("CHAT_MSG_ADDON", "VXV", "1\\031x2\\03101\\0311\\031note\\031s99:abime", "GUILD", "Thom Leboss")
      Fire("CHAT_MSG_ADDON", "VXV", SECRET, "GUILD", "Thom Leboss")
      Fire("CHAT_MSG_ADDON", "AutreAddon", "1\\031x3\\03101\\0311\\031note\\031T", "GUILD", "Thom Leboss")
    `);
    expect(client("return #Received")).toBe(0);
    expect(errors()).toEqual([]);
  });
});

describe("send queue", () => {
  const sendMany = (count: number) => {
    const started = startCore({ inGuild: false });
    started.core.run(`local _, ns = ... for i = 1, ${count} do ns.Comm.Broadcast("note", { i = i }) end`);
    return started;
  };
  const sentCount = (client: (code: string) => unknown) => client("return #SentAddonMessages");

  it("sends 10 messages in a row, then one per second, as WoW Forever allows", () => {
    const { client } = sendMany(25);
    expect(sentCount(client)).toBe(10);
    client("AdvanceTime(5)");
    expect(sentCount(client)).toBe(15);
    client("AdvanceTime(10)");
    expect(sentCount(client)).toBe(25);
  });

  it("keeps a message the server throttles, and sends everything in order later", () => {
    const { core, client } = startCore({ inGuild: false });
    client("ServerCredit = 3");
    core.run('local _, ns = ... for i = 1, 6 do ns.Comm.Broadcast("note", { i = i }) end');
    expect(sentCount(client)).toBe(3);
    client("ServerCredit = nil AdvanceTime(10)");
    const order = core.run(`
      local _, ns = ...
      local order = {}
      for _, message in ipairs(SentAddonMessages) do
          order[#order + 1] = ns.Serializer.Decode(message.text:match("\\031([^\\031]*)$")).i
      end
      return order
    `);
    expect(order).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("waits during a boss encounter, and sends when it ends", () => {
    const { core, client } = startCore();
    const before = Number(sentCount(client));
    client("ChatLockdown = true");
    core.run('local _, ns = ... ns.Comm.Broadcast("note", { boss = true })');
    client("AdvanceTime(30)");
    expect(sentCount(client)).toBe(before);
    client('ChatLockdown = false Fire("ENCOUNTER_END", 3493, "Faldrim", 1, 5, 1)');
    expect(sentCount(client)).toBe(before + 1);
  });
});

describe("presence", () => {
  it("lets every member see who is connected with VXV", () => {
    const guild = startGuild(GUILD);
    guild.deliver();
    for (const player of guild.players) {
      expect(player.core.run("local _, ns = ... return ns.Presence.Online()")).toEqual([
        "Eole Hermes",
        "Thom Leboss",
        "Ðéjà Vu",
      ]);
    }
  });

  it("tells a member with an older version to update, once", () => {
    const guild = startGuild(GUILD, { beforeLogin: true });
    for (const player of guild.players) {
      const version = player.name === "Eole Hermes" ? "1.1.0" : "1.0.0";
      player.core.run(`local _, ns = ... ns.VERSION = "${version}"`);
      player.client('Fire("PLAYER_LOGIN")');
    }
    guild.deliver();
    const notices = (name: string) =>
      guild.player(name).client("return Printed") as unknown as string[] | Record<string, never>;
    expect(notices("Ðéjà Vu")).toEqual([expect.stringContaining("Une nouvelle version de VXV existe (1.1.0)")]);
    expect(notices("Eole Hermes")).toEqual({});
  });

  it.each([
    ["1.2.0", "1.1.9", true],
    ["1.0.0", "1.0.0-beta.1", true],
    ["1.0.0-beta.2", "1.0.0", false],
    ["0.0.0-dev.2", "0.0.0-dev.1", false],
    ["@project-version@", "1.0.0", false],
  ])("%s is newer than %s: %s", (other, mine, newer) => {
    const { core } = startCore();
    expect(core.run(`local _, ns = ... return ns.Presence.IsNewer("${other}", "${mine}")`)).toBe(newer);
  });
});

describe("/vxv ping", () => {
  it("gets an answer from every member connected with VXV", () => {
    const guild = startGuild(GUILD);
    guild.deliver();
    const sender = guild.player("Ðéjà Vu");
    sender.client('Printed = {} SlashCmdList.VXV("ping")');
    sender.client("AdvanceTime(0.2)");
    guild.deliver();
    expect(sender.client("return Printed")).toEqual([
      "|cff14b8a6VXV|r Ping envoyé à la guilde : chaque membre connecté avec VXV va répondre.",
      "|cff14b8a6VXV|r Thom Leboss a répondu (200 ms)",
      "|cff14b8a6VXV|r Eole Hermes a répondu (200 ms)",
    ]);
  });
});
