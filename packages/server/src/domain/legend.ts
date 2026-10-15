/**
 * The Hall of Fame (owner's request of 15 October): the guild's legend, a corridor of paintings, each the memory of an
 * evening (an exploit), in chapters the officers make. A member proposes an exploit; an officer publishes it in a
 * chapter with its rarity, or refuses it.
 */

export const EXPLOIT_CATEGORIES = ["guilde", "culte", "exploit", "pvp", "raid"] as const;
export type ExploitCategory = (typeof EXPLOIT_CATEGORIES)[number];

export const EXPLOIT_CATEGORY_LABELS: Record<ExploitCategory, string> = {
  guilde: "Vie de guilde",
  culte: "Moment culte",
  exploit: "Exploit",
  pvp: "Sortie PvP",
  raid: "Raid",
};

/** The filters of the corridor, in the plural. */
export const EXPLOIT_FILTER_LABELS: Record<ExploitCategory, string> = {
  guilde: "Vie de guilde",
  culte: "Moments cultes",
  exploit: "Exploits",
  pvp: "PvP",
  raid: "Raids",
};

/** The rarity of a painting, the game's item qualities: a legendary one hangs bigger, in a golden frame. */
export const EXPLOIT_RARITIES = ["rare", "epic", "legendary"] as const;
export type ExploitRarity = (typeof EXPLOIT_RARITIES)[number];

export const EXPLOIT_RARITY_LABELS: Record<ExploitRarity, string> = {
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
};

export const LEGEND_LIMITS = {
  title: 80,
  place: 60,
  story: 1500,
  quote: 160,
  quoteBy: 40,
  stat: 40,
  stats: 4,
  chapterTitle: 60,
  chapterPeriod: 40,
  mvpWhy: 160,
  loot: 80,
  comment: 500,
  images: 4,
  /** Bytes of a capture, once the browser made it smaller. */
  imageBytes: 1_572_864,
} as const;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

export type ExploitStatus = "proposed" | "published" | "refused";

/** What a member proposes: the evening, told. */
export interface ExploitProposal {
  title: string;
  /** The day, "YYYY-MM-DD". */
  occurredOn: string;
  /** The hour, "HH:MM", or empty. */
  occurredTime: string;
  place: string;
  category: ExploitCategory;
  story: string;
  quote: string;
  quoteBy: string;
  /** Up to four short figures: « 9e essai », « 63 wipes ». */
  stats: string[];
  /** The raid night it happened during, if any. */
  eventId: string | undefined;
}

/** Where an officer hangs a proposal once published. */
export interface ExploitPlacement {
  chapterId: string;
  rarity: ExploitRarity;
  /** The evening's MVP, a member, and why; or none. */
  mvpId: string | undefined;
  mvpWhy: string;
  /** The notable loot, as written. */
  loot: string;
}

/** A capture sent with a proposal. */
export interface ExploitImage {
  contentType: string;
  bytes: Uint8Array;
}

function isCategory(value: string): value is ExploitCategory {
  return (EXPLOIT_CATEGORIES as readonly string[]).includes(value);
}

export function isRarity(value: string): value is ExploitRarity {
  return (EXPLOIT_RARITIES as readonly string[]).includes(value);
}

const DAY = /^\d{4}-\d{2}-\d{2}$/u;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/u;

/** Why a proposal cannot be kept, or undefined: its fields and captures within the limits. */
export function proposalRefusal(
  proposal: ExploitProposal,
  images: readonly ExploitImage[],
  today: string,
): string | undefined {
  const tooLong = (value: string, limit: number) => value.length > limit;
  if (proposal.title.trim() === "" || tooLong(proposal.title, LEGEND_LIMITS.title)) {
    return `Un titre de ${String(LEGEND_LIMITS.title)} caractères au plus.`;
  }
  if (!DAY.test(proposal.occurredOn) || Number.isNaN(Date.parse(proposal.occurredOn)) || proposal.occurredOn > today) {
    return "Une date passée, au format du calendrier.";
  }
  if (proposal.occurredTime !== "" && !TIME.test(proposal.occurredTime)) {
    return "Une heure au format 21:30.";
  }
  if (!isCategory(proposal.category)) {
    return "Choisis le type du tableau.";
  }
  if (proposal.story.trim() === "" || tooLong(proposal.story, LEGEND_LIMITS.story)) {
    return `Le récit, de ${String(LEGEND_LIMITS.story)} caractères au plus.`;
  }
  if (
    tooLong(proposal.place, LEGEND_LIMITS.place) ||
    tooLong(proposal.quote, LEGEND_LIMITS.quote) ||
    tooLong(proposal.quoteBy, LEGEND_LIMITS.quoteBy)
  ) {
    return "Le lieu, la phrase ou son auteur sont trop longs.";
  }
  if (proposal.stats.length > LEGEND_LIMITS.stats || proposal.stats.some((stat) => tooLong(stat, LEGEND_LIMITS.stat))) {
    return `${String(LEGEND_LIMITS.stats)} chiffres au plus, de ${String(LEGEND_LIMITS.stat)} caractères chacun.`;
  }
  if (images.length > LEGEND_LIMITS.images) {
    return `${String(LEGEND_LIMITS.images)} captures au plus.`;
  }
  if (
    images.some(
      (image) =>
        !(IMAGE_TYPES as readonly string[]).includes(image.contentType) ||
        image.bytes.length === 0 ||
        image.bytes.length > LEGEND_LIMITS.imageBytes,
    )
  ) {
    return "Des captures JPEG, PNG ou WebP de 1,5 Mo au plus.";
  }
  return undefined;
}

/** The figures a member wrote, one per line: trimmed, the empty ones left aside. */
export function statsOf(lines: string): string[] {
  return lines
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}
