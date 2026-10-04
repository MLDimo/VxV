import { describe, expect, it } from "vitest";
import { startCore } from "../core.ts";

const SPLIT = (text: string, maxBytes: number) =>
  `local _, ns = ... return ns.GroupChat.Split(${JSON.stringify(text)}, ${maxBytes})`;

describe("announcements in the group's channel", () => {
  it("cuts a long text between words, and never inside an accented character", () => {
    const { core } = startCore();
    expect(core.run(SPLIT("Ðéjà Vu gagne la Tête", 12))).toEqual(["Ðéjà Vu", "gagne la", "Tête"]);
    // "é" and "à" take two bytes each: a cut at byte 2 would fall inside them.
    expect(core.run(SPLIT("Déjà", 3))).toEqual(["Dé", "jà"]);
    expect(core.run(SPLIT("Déjà", 2))).toEqual(["D", "é", "j", "à"]);
    expect(core.run(SPLIT("court", 255))).toEqual(["court"]);
  });

  it("writes in the raid channel, the party's, or nowhere outside a group", () => {
    const { client } = startCore();
    const say = (text: string) => client(`VXV.SayToGroup(${JSON.stringify(text)})`);
    say("seul");
    client('Group.members = { "Thom Leboss" }');
    say("en groupe");
    client("Group.raid = true");
    say("en raid");
    expect(client("return ChatSent")).toEqual([
      { text: "[VXV] en groupe", channel: "PARTY" },
      { text: "[VXV] en raid", channel: "RAID" },
    ]);
  });

  it("holds the announcements during a boss encounter, and writes them right after", () => {
    const { client, errors } = startCore();
    client('Group.members = { "Thom Leboss" } Group.raid = true');
    client('Fire("ENCOUNTER_START", 1, "Onyxia", 9, 40)');
    client('VXV.SayToGroup("pendant le boss")');
    expect(client("return #ChatSent")).toBe(0);
    client('Fire("ENCOUNTER_END", 1, "Onyxia", 9, 40, 1)');
    expect(client("return ChatSent")).toEqual([{ text: "[VXV] pendant le boss", channel: "RAID" }]);
    expect(errors()).toEqual([]);
  });
});
