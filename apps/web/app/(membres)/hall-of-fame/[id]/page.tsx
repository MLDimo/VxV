import type { LegendPerson } from "@vxv/server";
import { EXPLOIT_CATEGORY_LABELS, EXPLOIT_RARITY_LABELS } from "@vxv/server/domain/legend";
import { formatDateTime } from "@vxv/server/domain/labels";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setLegendPresence } from "@/app/actions/legend";
import { CharacterName } from "@/components/CharacterName";
import { classColor } from "@/components/characterClasses";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LegendCommentForm } from "@/components/LegendCommentForm";
import { LegendGallery } from "@/components/LegendGallery";
import { legendDay, legendHour } from "@/components/legendDates";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

const QUALITY = {
  rare: "var(--color-quality-rare)",
  epic: "var(--color-quality-epic)",
  legendary: "var(--color-quality-legendary)",
};

/** A member in their class color, with their initial on a square of it. */
function Person({ person }: { person: LegendPerson }) {
  const color = classColor(person.characterClass ?? "");
  return (
    <span className="inline-flex items-center gap-1.5 bg-night-window py-0.5 pr-2 pl-0.5 text-sm font-bold shadow-[inset_0_0_0_1px_var(--color-line)]">
      <span
        className="inline-flex size-5.5 items-center justify-center font-pixel text-xs text-banner-ink shadow-[0_0_0_2px_var(--color-ink)]"
        style={{ background: color }}
      >
        {person.name.slice(0, 1)}
      </span>
      <CharacterName name={person.name} characterClass={person.characterClass ?? ""} />
    </span>
  );
}

/** A painting opened (mockup HallOfFame): its captures, its story, who was there, its MVP, and the memories. */
export default async function ExploitPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const view = await getApplication().legend.exploit(member, (await params).id);
  if (view === undefined) {
    notFound();
  }
  const { exploit } = view;
  const quality = exploit.rarity === undefined ? "var(--color-copper)" : QUALITY[exploit.rarity];
  const published = exploit.status === "published";
  return (
    <div className="bg-night/85 px-4 py-10">
      <article
        className="relative mx-auto max-w-245 bg-card"
        style={{ boxShadow: `0 0 0 3px var(--color-ink), 0 0 0 7px ${quality}, 0 0 0 10px var(--color-ink)` }}
      >
        <Link
          href={published ? `/hall-of-fame#tableau-${exploit.id}` : "/hall-of-fame"}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-10 flex size-11 items-center justify-center bg-wood shadow-[0_0_0_3px_var(--color-ink),0_0_0_5px_var(--color-copper)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5l14 14M19 5 5 19" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="square" />
          </svg>
        </Link>
        <LegendGallery
          title={exploit.title}
          imageUrls={view.imageIds.map((imageId) => `/api/hall-of-fame/images/${imageId}`)}
        />
        <div className="flex flex-wrap gap-8 px-[clamp(18px,4vw,36px)] pt-6.5 pb-8">
          <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
              {exploit.rarity !== undefined && (
                <span className="px-2 py-0.5 text-banner-ink" style={{ background: quality }}>
                  {EXPLOIT_RARITY_LABELS[exploit.rarity]}
                </span>
              )}
              <span className="tracking-[0.08em] text-old-paper uppercase">
                {EXPLOIT_CATEGORY_LABELS[exploit.category]}
              </span>
              {view.chapter !== undefined && <span className="text-muted">· {view.chapter.title}</span>}
              {!published && <span className="text-loss">· proposition, pas encore au mur</span>}
            </div>
            <h1 className="font-pixel text-[clamp(28px,4vw,38px)] leading-tight font-bold text-ivory">
              {exploit.title}
            </h1>
            <div className="flex flex-wrap gap-x-4.5 gap-y-1.5 text-sm text-lavender">
              <span>
                <b className="text-gold">{legendDay(exploit.occurredOn)}</b>
                {exploit.occurredTime !== "" && ` · ${legendHour(exploit.occurredTime)}`}
              </span>
              {exploit.place !== "" && <span>{exploit.place}</span>}
              {view.raidNight !== undefined && <span>Soirée {view.raidNight}</span>}
            </div>
            <p className="leading-relaxed whitespace-pre-line text-lavender">{exploit.story}</p>
            {exploit.quote !== "" && (
              <div className="bg-wood-night px-4.5 py-4 shadow-[0_0_0_2px_var(--color-ink),inset_0_0_0_1px_var(--color-beam)]">
                <span className="block text-[11px] font-extrabold tracking-[0.16em] text-old-paper uppercase">
                  La phrase de la soirée
                </span>
                <p className="mt-1.5 font-pixel text-[22px] text-gold">« {exploit.quote} »</p>
                {exploit.quoteBy !== "" && <span className="text-sm text-muted">— {exploit.quoteBy}</span>}
              </div>
            )}
            {exploit.stats.length > 0 && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
                {exploit.stats.map((stat) => (
                  <div
                    key={stat}
                    className="bg-ink/70 p-3 text-sm font-bold text-lavender shadow-[inset_0_0_0_1px_var(--color-line)]"
                  >
                    {stat}
                  </div>
                ))}
              </div>
            )}
            {published && (
              <section aria-label="Commentaires" className="mt-1.5 flex flex-col gap-2.5">
                <h2 className="font-pixel text-lg text-parchment">Commentaires ({view.comments.length})</h2>
                {view.comments.map((comment) => (
                  <p
                    key={`${comment.person.memberId}-${comment.writtenAt.toISOString()}`}
                    className="text-sm text-lavender"
                  >
                    <CharacterName name={comment.person.name} characterClass={comment.person.characterClass ?? ""} /> ·{" "}
                    {comment.body}
                    <span className="ml-2 text-xs text-muted">{formatDateTime(comment.writtenAt)}</span>
                  </p>
                ))}
                <LegendCommentForm exploitId={exploit.id} />
              </section>
            )}
          </div>
          <aside className="flex flex-[1_1_260px] flex-col gap-4.5">
            {published && (
              <ConfirmButton
                action={setLegendPresence}
                fields={{ exploitId: exploit.id, present: view.declared ? "false" : "true" }}
                label={view.declared ? "J'y étais ✓" : "J'y étais"}
              />
            )}
            {view.mvp !== undefined && (
              <div className="bg-gold/10 p-3.5 shadow-[0_0_0_2px_var(--color-ink),inset_0_0_0_2px_var(--color-gold)]">
                <span className="block text-[11px] font-extrabold tracking-[0.16em] text-gold uppercase">
                  MVP de la soirée
                </span>
                <b className="mt-1 block font-pixel text-xl">
                  <CharacterName name={view.mvp.name} characterClass={view.mvp.characterClass ?? ""} />
                </b>
                {exploit.mvpWhy !== "" && <span className="text-sm text-lavender">{exploit.mvpWhy}</span>}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="font-pixel text-lg text-parchment">Présents · {view.people.length}</span>
              <div className="flex flex-wrap gap-1.5">
                {view.people.map((person) => (
                  <Person key={person.memberId} person={person} />
                ))}
              </div>
              {view.people.length === 0 && <span className="text-sm text-muted">Personne pour l&apos;instant.</span>}
            </div>
            {exploit.loot !== "" && (
              <div className="flex flex-col gap-1">
                <span className="font-pixel text-lg text-parchment">Butin notable</span>
                <span className="text-sm font-bold text-quality-legendary">{exploit.loot}</span>
              </div>
            )}
            <span className="text-xs text-muted">
              Proposé par{" "}
              <CharacterName name={view.proposedBy.name} characterClass={view.proposedBy.characterClass ?? ""} />
            </span>
          </aside>
        </div>
      </article>
    </div>
  );
}
