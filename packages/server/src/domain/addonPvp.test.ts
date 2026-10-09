import { describe, expect, it } from "vitest";
import { formatAddonPvp } from "./addonPvp.ts";
import type { Character } from "./characters.ts";
import type { Duel } from "./duels.ts";

const officer: Character = {
  id: "c-officer",
  firstName: "Ðéjà",
  lastName: "Vu",
  characterClass: "ROGUE",
  memberId: "m-officer",
  isMain: true,
  inGuild: true,
};
const at = new Date("2026-12-10T20:00:00Z");
const duel: Duel = {
  id: "d1",
  challengerId: "m-officer",
  opponentId: "m-thom",
  scheduledAt: at,
  place: "Porte; d'Orgrimmar",
  createdAt: at,
  accepted: true,
  betId: "b1",
  winnerId: "m-officer",
  playedAt: at,
  cancelledAt: undefined,
  discordMessage: undefined,
};

describe("formatAddonPvp", () => {
  it("writes the outings and their sign-ups, the duelists, the duels, the ranking and the answers", () => {
    const text = formatAddonPvp({
      officers: [officer],
      characters: [officer],
      exportedAt: new Date("2026-12-01T12:00:00Z"),
      outings: [
        {
          event: {
            id: "e1",
            kind: "pvp",
            title: "Raid sur Astranaar",
            startsAt: at,
            softReservesPerPlayer: 0,
            raids: [],
            role: { id: "r1", name: "Raideur R1" },
            discordMessageId: undefined,
          },
          signups: [
            {
              eventId: "e1",
              memberId: "m-thom",
              characterId: "c-thom",
              characterName: "Thom Leboss",
              characterClass: "PRIEST",
              role: "healer",
              spec: "Sacré",
              status: "present",
              signedUpAt: new Date("2026-12-01T12:00:00Z"),
            },
          ],
        },
      ],
      players: [
        { memberId: "m-officer", name: "Ðéjà Vu", characterClass: "ROGUE", avatar: "mv_voleur_m" },
        { memberId: "m-thom", name: "Thom Leboss", characterClass: undefined, avatar: undefined },
      ],
      duels: [{ duel, status: "played" }],
      ranking: [
        { rank: 1, memberId: "m-officer", rating: 10, won: 1, played: 1 },
        { rank: 2, memberId: "m-thom", rating: -10, won: 0, played: 1 },
      ],
      records: [{ label: "Plus de victoires", value: "1 victoire", memberId: "m-officer" }],
      changes: [
        {
          id: "Thom Leboss#1#1",
          eventId: undefined,
          betId: undefined,
          duelId: "d1",
          missionId: undefined,
          author: "Thom Leboss",
          accepted: true,
          message: "Défi relevé.",
        },
      ],
    });
    expect(text.split("\n")).toEqual([
      "VXV-PVP-2",
      "P;1796126400",
      "O;Ðéjà Vu",
      "M;m-officer;Ðéjà Vu",
      "E;e1;1796932800;Raid sur Astranaar;Réservé à Raideur R1",
      "S;e1;Thom Leboss;PRIEST;healer;present;Sacré",
      "U;m-officer;Ðéjà Vu;ROGUE;mv_voleur_m",
      "U;m-thom;Thom Leboss;;",
      "D;d1;played;1796932800;Porte, d'Orgrimmar;m-officer;m-thom;m-officer;b1",
      "R;1;m-officer;10;1;1",
      "R;2;m-thom;-10;0;1",
      "K;Plus de victoires;1 victoire;m-officer",
      "C;Thom Leboss#1#1;1;Défi relevé.",
    ]);
  });
});
