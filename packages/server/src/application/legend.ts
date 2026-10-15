import type { LegendChapterRecord, LegendExploitRecord } from "../domain/journal.ts";
import { eventTitle } from "../domain/labels.ts";
import {
  EXPLOIT_RARITY_LABELS,
  isRarity,
  LEGEND_LIMITS,
  proposalRefusal,
  type ExploitImage,
  type ExploitPlacement,
  type ExploitProposal,
} from "../domain/legend.ts";
import type { Member } from "../domain/members.ts";
import { canManageRaids } from "../domain/permissions.ts";
import { ForbiddenError, ValidationError } from "./errors.ts";
import { checkOfficerAction } from "./officerActions.ts";
import type { Clock, LegendChapter, Repositories, StoredExploit, UnitOfWork } from "./ports.ts";

const UNKNOWN = "Ce tableau n'existe pas.";
const NOT_WAITING = "Cette proposition n'attend plus d'officier.";
/** How far back a proposal may name its raid night. */
const RAID_NIGHTS_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A member as the Hall of Fame shows them: by their main character, in its class color. */
export interface LegendPerson {
  memberId: string;
  name: string;
  characterClass: string | undefined;
}

/** A painting of the corridor. */
export interface CorridorPainting {
  exploit: StoredExploit;
  /** Its first capture, the painting itself. */
  imageId: string | undefined;
  /** Whether the member was there: said so, or present at its raid night. */
  mine: boolean;
}

export interface CorridorChapter {
  chapter: LegendChapter;
  paintings: CorridorPainting[];
}

/** The corridor: its chapters with their paintings, in order, and its figures. */
export interface Corridor {
  chapters: CorridorChapter[];
  paintings: number;
  /** The members present in at least one painting. */
  members: number;
}

/** A painting opened, with all it tells. */
export interface ExploitView {
  exploit: StoredExploit;
  chapter: LegendChapter | undefined;
  imageIds: string[];
  /** Who was there: present at its raid night, or who said so. */
  people: LegendPerson[];
  /** Whether the member said « J'y étais ». */
  declared: boolean;
  mvp: LegendPerson | undefined;
  proposedBy: LegendPerson;
  comments: { person: LegendPerson; body: string; writtenAt: Date }[];
  /** The raid night it happened during, named. */
  raidNight: string | undefined;
}

/** A proposal waiting for an officer, or one of the member's own. */
export interface ProposalView {
  exploit: StoredExploit;
  proposedBy: LegendPerson;
  imageIds: string[];
}

/** The people of the website, by member id. */
async function peopleOf(repositories: Repositories): Promise<(memberId: string) => LegendPerson> {
  const looks = new Map((await repositories.members.listLooks()).map((look) => [look.memberId, look]));
  return (memberId) => {
    const look = looks.get(memberId);
    return { memberId, name: look?.name ?? "", characterClass: look?.characterClass };
  };
}

/** Who was at each exploit: the members present at its raid night, and those who said so. */
async function presentAt(repositories: Repositories, exploits: readonly StoredExploit[]) {
  const eventIds = [...new Set(exploits.flatMap((exploit) => exploit.eventId ?? []))];
  const raid = await repositories.legend.listRaidPresences(eventIds);
  const declared = await repositories.legend.listPresences();
  return (exploit: StoredExploit) =>
    new Set([
      ...raid.filter((presence) => presence.eventId === exploit.eventId).map((presence) => presence.memberId),
      ...declared.filter((presence) => presence.exploitId === exploit.id).map((presence) => presence.memberId),
    ]);
}

function canSee(member: Member, exploit: StoredExploit): boolean {
  return exploit.status === "published" || exploit.proposedBy === member.id || canManageRaids(member.roles);
}

/** The Hall of Fame (owner's request of 15 October): the guild's legend, its proposals and its chapters. */
export function createLegend({ unitOfWork, clock }: { unitOfWork: UnitOfWork; clock: Clock }) {
  async function requirePublished(repositories: Repositories, exploitId: string): Promise<StoredExploit> {
    const exploit = await repositories.legend.find(exploitId);
    if (exploit === undefined || exploit.status !== "published") {
      throw new ValidationError(UNKNOWN);
    }
    return exploit;
  }

  async function proposalViews(repositories: Repositories, exploits: StoredExploit[]): Promise<ProposalView[]> {
    const person = await peopleOf(repositories);
    const images = await repositories.legend.listImages(exploits.map((exploit) => exploit.id));
    return exploits.map((exploit) => ({
      exploit,
      proposedBy: person(exploit.proposedBy),
      imageIds: images.filter((image) => image.exploitId === exploit.id).map((image) => image.id),
    }));
  }

  return {
    /** The corridor of the published paintings, chapter after chapter, each marked when the member was there. */
    corridor(member: Member): Promise<Corridor> {
      return unitOfWork.run(async (repositories) => {
        const published = (await repositories.legend.list()).filter((exploit) => exploit.status === "published");
        const present = await presentAt(repositories, published);
        const images = await repositories.legend.listImages(published.map((exploit) => exploit.id));
        const members = new Set(published.flatMap((exploit) => [...present(exploit)]));
        const chapters = (await repositories.legend.listChapters()).map((chapter) => ({
          chapter,
          paintings: published
            .filter((exploit) => exploit.chapterId === chapter.id)
            .map((exploit) => ({
              exploit,
              imageId: images.find((image) => image.exploitId === exploit.id)?.id,
              mine: present(exploit).has(member.id),
            })),
        }));
        return { chapters, paintings: published.length, members: members.size };
      });
    },

    /** A painting opened: published, or the member's own proposal, or any for an officer. */
    exploit(member: Member, exploitId: string): Promise<ExploitView | undefined> {
      return unitOfWork.run(async (repositories) => {
        const exploit = await repositories.legend.find(exploitId);
        if (exploit === undefined || !canSee(member, exploit)) {
          return undefined;
        }
        const person = await peopleOf(repositories);
        const present = (await presentAt(repositories, [exploit]))(exploit);
        const declared = (await repositories.legend.listPresences()).some(
          (presence) => presence.exploitId === exploit.id && presence.memberId === member.id,
        );
        const event = exploit.eventId === undefined ? undefined : await repositories.events.findById(exploit.eventId);
        return {
          exploit,
          chapter: (await repositories.legend.listChapters()).find((chapter) => chapter.id === exploit.chapterId),
          imageIds: (await repositories.legend.listImages([exploit.id])).map((image) => image.id),
          people: [...present].map(person).sort((left, right) => left.name.localeCompare(right.name, "fr")),
          declared,
          mvp: exploit.mvpId === undefined ? undefined : person(exploit.mvpId),
          proposedBy: person(exploit.proposedBy),
          comments: (await repositories.legend.listComments(exploit.id)).map((comment) => ({
            person: person(comment.memberId),
            body: comment.body,
            writtenAt: comment.writtenAt,
          })),
          raidNight: event === undefined ? undefined : eventTitle(event),
        };
      });
    },

    /** A capture, for whoever may see its painting. */
    image(member: Member, imageId: string): Promise<{ contentType: string; bytes: Uint8Array } | undefined> {
      return unitOfWork.run(async (repositories) => {
        const image = await repositories.legend.findImage(imageId);
        const exploit = image && (await repositories.legend.find(image.exploitId));
        return image && exploit && canSee(member, exploit)
          ? { contentType: image.contentType, bytes: image.bytes }
          : undefined;
      });
    },

    /** A member proposes an exploit with its captures: it waits for an officer. Returns its id. */
    async propose(member: Member, proposal: ExploitProposal, images: readonly ExploitImage[]): Promise<string> {
      const now = clock();
      const refusal = proposalRefusal(proposal, images, now.toISOString().slice(0, 10));
      if (refusal !== undefined) {
        throw new ValidationError(refusal);
      }
      return unitOfWork.run(async (repositories) => {
        if (proposal.eventId !== undefined && (await repositories.events.findById(proposal.eventId)) === undefined) {
          throw new ValidationError("Cette soirée de raid n'existe pas.");
        }
        return repositories.legend.propose(proposal, images, member.id, now);
      });
    },

    /** The raid nights a proposal may name: those of the last months, the latest first. */
    raidNights(): Promise<{ id: string; title: string; startsAt: Date }[]> {
      const now = clock();
      return unitOfWork.run(async ({ events }) =>
        (await events.listStartingAfter(new Date(now.getTime() - RAID_NIGHTS_DAYS * DAY_MS), "raid"))
          .filter((event) => event.startsAt.getTime() <= now.getTime())
          .sort((left, right) => right.startsAt.getTime() - left.startsAt.getTime())
          .map((event) => ({ id: event.id, title: eventTitle(event), startsAt: event.startsAt })),
      );
    },

    /** The member's own proposals not published: waiting, or refused with the officer's reason. */
    myProposals(member: Member): Promise<ProposalView[]> {
      return unitOfWork.run(async (repositories) =>
        proposalViews(
          repositories,
          (await repositories.legend.list()).filter(
            (exploit) => exploit.proposedBy === member.id && exploit.status !== "published",
          ),
        ),
      );
    },

    /** The proposals waiting for an officer. */
    async proposals(officer: Member): Promise<ProposalView[]> {
      if (!canManageRaids(officer.roles)) {
        throw new ForbiddenError();
      }
      return unitOfWork.run(async (repositories) =>
        proposalViews(
          repositories,
          (await repositories.legend.list()).filter((exploit) => exploit.status === "proposed"),
        ),
      );
    },

    chapters(): Promise<LegendChapter[]> {
      return unitOfWork.run(({ legend }) => legend.listChapters());
    },

    /** An officer opens a chapter of the corridor, recorded in the journal with the reason. */
    async createChapter(officer: Member, chapter: { title: string; period: string }, reason: string): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      const title = chapter.title.trim();
      const period = chapter.period.trim();
      if (title === "" || title.length > LEGEND_LIMITS.chapterTitle || period.length > LEGEND_LIMITS.chapterPeriod) {
        throw new ValidationError(
          `Un titre de ${String(LEGEND_LIMITS.chapterTitle)} caractères au plus, une période de ${String(LEGEND_LIMITS.chapterPeriod)}.`,
        );
      }
      await unitOfWork.run(async ({ legend, journal }) => {
        const id = await legend.createChapter({ title, period }, officer.id, clock());
        const after: LegendChapterRecord = { title, period };
        await journal.record({
          actorId: officer.id,
          action: "legend.chapter",
          entity: "legend_chapter",
          entityId: id,
          before: null,
          after,
          reason: motive,
        });
      });
    },

    /** An officer hangs a proposal in a chapter with its rarity (and its MVP, its loot), recorded in the journal. */
    async publish(officer: Member, exploitId: string, placement: ExploitPlacement, reason: string): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      if (!isRarity(placement.rarity)) {
        throw new ValidationError("Choisis la rareté du tableau.");
      }
      if (placement.mvpWhy.length > LEGEND_LIMITS.mvpWhy || placement.loot.length > LEGEND_LIMITS.loot) {
        throw new ValidationError("La raison du MVP ou le butin sont trop longs.");
      }
      await unitOfWork.run(async ({ legend, members, journal }) => {
        const exploit = await legend.find(exploitId);
        if (exploit === undefined) {
          throw new ValidationError(UNKNOWN);
        }
        const chapter = (await legend.listChapters()).find((candidate) => candidate.id === placement.chapterId);
        if (chapter === undefined) {
          throw new ValidationError("Choisis le chapitre du tableau.");
        }
        if (placement.mvpId !== undefined && (await members.findById(placement.mvpId)) === undefined) {
          throw new ValidationError("Ce MVP n'est pas un membre.");
        }
        if (!(await legend.publish(exploit.id, placement, officer.id, clock()))) {
          throw new ValidationError(NOT_WAITING);
        }
        const after: LegendExploitRecord = {
          title: exploit.title,
          chapter: chapter.title,
          rarity: EXPLOIT_RARITY_LABELS[placement.rarity],
        };
        await journal.record({
          actorId: officer.id,
          action: "legend.publish",
          entity: "legend_exploit",
          entityId: exploit.id,
          before: null,
          after,
          reason: motive,
        });
      });
    },

    /** An officer refuses a proposal: its proposer reads why, and the journal keeps it. */
    async refuse(officer: Member, exploitId: string, reason: string): Promise<void> {
      const motive = checkOfficerAction(officer, reason);
      await unitOfWork.run(async ({ legend, journal }) => {
        const exploit = await legend.find(exploitId);
        if (exploit === undefined) {
          throw new ValidationError(UNKNOWN);
        }
        if (!(await legend.refuse(exploit.id, motive, officer.id, clock()))) {
          throw new ValidationError(NOT_WAITING);
        }
        const before: LegendExploitRecord = { title: exploit.title };
        await journal.record({
          actorId: officer.id,
          action: "legend.refuse",
          entity: "legend_exploit",
          entityId: exploit.id,
          before,
          after: null,
          reason: motive,
        });
      });
    },

    /** « J'y étais », or not any more. */
    setPresence(member: Member, exploitId: string, present: boolean): Promise<void> {
      return unitOfWork.run(async (repositories) => {
        const exploit = await requirePublished(repositories, exploitId);
        await repositories.legend.setPresence(exploit.id, member.id, present, clock());
      });
    },

    /** A memory left under a painting. */
    async comment(member: Member, exploitId: string, body: string): Promise<void> {
      const text = body.trim();
      if (text === "" || text.length > LEGEND_LIMITS.comment) {
        throw new ValidationError(`Un souvenir de ${String(LEGEND_LIMITS.comment)} caractères au plus.`);
      }
      return unitOfWork.run(async (repositories) => {
        const exploit = await requirePublished(repositories, exploitId);
        await repositories.legend.addComment(exploit.id, member.id, text, clock());
      });
    },
  };
}

export type Legend = ReturnType<typeof createLegend>;
