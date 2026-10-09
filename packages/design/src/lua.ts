import { COMPACT_PLACES, PLACES, TAVERN, TAVERN_CARDS } from "./places.ts";
import { ADDON_SEASON_YEARS, SEASONS } from "./seasons.ts";
import { CLASS_COLORS, COLORS, UNKNOWN_CLASS_COLOR } from "./tokens.ts";

const CHANNEL = 255;

/** { r, g, b, a } between 0 and 1, as WoW's textures and font strings take them. */
function rgba(color: string): [number, number, number, number] {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (hex) {
    return [
      Number.parseInt(hex[1] ?? "0", 16) / CHANNEL,
      Number.parseInt(hex[2] ?? "0", 16) / CHANNEL,
      Number.parseInt(hex[3] ?? "0", 16) / CHANNEL,
      1,
    ];
  }
  const functional = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(color);
  if (functional) {
    return [
      Number(functional[1]) / CHANNEL,
      Number(functional[2]) / CHANNEL,
      Number(functional[3]) / CHANNEL,
      Number(functional[4]),
    ];
  }
  throw new Error(`unknown color ${color}`);
}

const number = (value: number) => String(Math.round(value * 1000) / 1000);
const luaString = (value: string) => JSON.stringify(value);
const list = (values: readonly (number | string)[]) =>
  `{ ${values.map((value) => (typeof value === "number" ? number(value) : luaString(value))).join(", ")} }`;
const key = (name: string) => (/^[a-z_][a-z0-9_]*$/i.test(name) ? name : `[${luaString(name)}]`);

/** The holidays of the years the addon knows, their days as YYYYMMDD numbers, as Lua's date("%Y%m%d") reads them. */
function seasonLines(): string[] {
  const days = (day: string) => day.replaceAll("-", "");
  const lines: string[] = [];
  for (let year = ADDON_SEASON_YEARS.first; year <= ADDON_SEASON_YEARS.last; year += 1) {
    for (const season of SEASONS) {
      const [first, last] = season.days(year);
      lines.push(`        { id = ${luaString(season.id)}, from = ${days(first)}, to = ${days(last)} },`);
    }
  }
  return lines;
}

/**
 * The tokens for the addon (VXV_Core/UI/Tokens.lua): colors as { r, g, b, a }, class colors as RRGGBB for the
 * |cff…|r codes, the tavern, its places, its cards and its holidays.
 */
export function renderLua(): string {
  const lines = [
    "-- Generated from packages/design/src/tokens.ts, places.ts and seasons.ts by npm run generate: do not edit.",
    "local _, ns = ...",
    "",
    "ns.Tokens = {",
    "    colors = {",
    ...Object.entries(COLORS).map(([name, value]) => `        ${key(name)} = ${list(rgba(value))},`),
    "    },",
    "    classColors = {",
    ...Object.entries(CLASS_COLORS).map(
      ([token, value]) => `        ${token} = ${luaString(value.slice(1).toLowerCase())},`,
    ),
    "    },",
    `    unknownClassColor = ${luaString(UNKNOWN_CLASS_COLOR.slice(1).toLowerCase())},`,
    `    tavern = { width = ${String(TAVERN.width)}, height = ${String(TAVERN.height)} },`,
    "    lights = {",
    ...TAVERN.lights.flatMap((light) => [
      `        { id = ${luaString(light.id)}, box = ${list(light.box)},`,
      `          color = ${list(rgba(light.color))}, animation = ${luaString(light.animation)} },`,
    ]),
    "    },",
    "    places = {",
    ...PLACES.flatMap((place) => [
      `        { id = ${luaString(place.id)}, name = ${luaString(place.name)}, short = ${luaString(place.short ?? place.name)},`,
      `          subtitle = ${luaString(place.subtitle)},`,
      `          spot = ${list(place.spot)}, plaque = ${luaString(place.plaque)}${place.kicker ? `, kicker = ${luaString(place.kicker)}` : ""},`,
      `          backdrop = { position = ${list(place.backdrop.position)}, zoom = ${number(place.backdrop.zoom)}, opacity = ${number(place.backdrop.opacity)} } },`,
    ]),
    "    },",
    `    compactPlaces = ${list(COMPACT_PLACES)},`,
    "    cards = {",
    ...TAVERN_CARDS.flatMap((card) => [
      `        { place = ${luaString(card.place)}, kicker = ${luaString(card.kicker)}${card.soon ? "," : " },"}`,
      ...(card.soon ? [`          soon = ${luaString(card.soon)} },`] : []),
    ]),
    "    },",
    "    seasons = {",
    ...seasonLines(),
    "    },",
    "}",
    "",
  ];
  return lines.join("\n");
}
