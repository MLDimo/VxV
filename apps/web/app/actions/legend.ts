"use server";

import { isRarity, statsOf, type ExploitCategory } from "@vxv/server/domain/legend";
import type { ActionState } from "@/components/actionState";
import { getApplication } from "@/server/application";
import { formText, runCreateAction, runFormAction } from "@/server/formActions";
import { requireMember, requireOfficer } from "@/server/session";

const HALL = "/hall-of-fame";

/** The captures of the form, as the browser made them smaller. */
async function captures(form: FormData) {
  const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  const images = [];
  for (const file of files) {
    images.push({ contentType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) });
  }
  return images;
}

/** A member proposes an exploit for the Hall of Fame: it waits for an officer. */
export async function proposeExploit(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const images = await captures(form);
  return runFormAction(async () => {
    const eventId = formText(form, "eventId");
    await getApplication().legend.propose(
      member,
      {
        title: formText(form, "title").trim(),
        occurredOn: formText(form, "occurredOn"),
        occurredTime: formText(form, "occurredTime"),
        place: formText(form, "place").trim(),
        category: formText(form, "category") as ExploitCategory,
        story: formText(form, "story").trim(),
        quote: formText(form, "quote").trim(),
        quoteBy: formText(form, "quoteBy").trim(),
        stats: statsOf(formText(form, "stats")),
        eventId: eventId === "" ? undefined : eventId,
      },
      images,
    );
    return "Proposition envoyée : un officier la mettra au mur, ou te dira pourquoi pas.";
  }, [`${HALL}/proposer`, `${HALL}/propositions`]);
}

/** An officer hangs a proposal in a chapter, then sees it on the wall. */
export async function publishExploit(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  const exploitId = formText(form, "exploitId");
  return runCreateAction(async () => {
    const rarity = formText(form, "rarity");
    const mvpId = formText(form, "mvpId");
    await getApplication().legend.publish(
      officer,
      exploitId,
      {
        chapterId: formText(form, "chapterId"),
        rarity: isRarity(rarity) ? rarity : "rare",
        mvpId: mvpId === "" ? undefined : mvpId,
        mvpWhy: formText(form, "mvpWhy").trim(),
        loot: formText(form, "loot").trim(),
      },
      formText(form, "reason"),
    );
    return `${HALL}/${exploitId}`;
  }, [HALL, `${HALL}/propositions`, "/journal"]);
}

/** An officer refuses a proposal, the reason for its proposer and the journal. */
export async function refuseExploit(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runFormAction(async () => {
    await getApplication().legend.refuse(officer, formText(form, "exploitId"), formText(form, "reason"));
    return "Proposition refusée : son auteur lit ton motif.";
  }, [`${HALL}/propositions`, `${HALL}/proposer`, "/journal"]);
}

/** An officer opens a chapter of the corridor. */
export async function createLegendChapter(_previous: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  return runFormAction(async () => {
    await getApplication().legend.createChapter(
      officer,
      { title: formText(form, "title"), period: formText(form, "period") },
      formText(form, "reason"),
    );
    return "Chapitre ouvert.";
  }, [HALL, `${HALL}/propositions`, "/journal"]);
}

/** « J'y étais », or not any more. */
export async function setLegendPresence(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const exploitId = formText(form, "exploitId");
  return runFormAction(async () => {
    const present = formText(form, "present") === "true";
    await getApplication().legend.setPresence(member, exploitId, present);
    return present ? "Noté : tu y étais." : "Retiré des présents.";
  }, [HALL, `${HALL}/${exploitId}`]);
}

/** A memory left under a painting. */
export async function commentExploit(_previous: ActionState, form: FormData): Promise<ActionState> {
  const member = await requireMember();
  const exploitId = formText(form, "exploitId");
  return runFormAction(async () => {
    await getApplication().legend.comment(member, exploitId, formText(form, "body"));
    return "Souvenir ajouté.";
  }, [`${HALL}/${exploitId}`]);
}
