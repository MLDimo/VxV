"use client";

import {
  EXPLOIT_CATEGORIES,
  EXPLOIT_FILTER_LABELS,
  EXPLOIT_RARITY_LABELS,
  type ExploitCategory,
  type ExploitRarity,
} from "@vxv/server/domain/legend";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import styles from "./LegendCorridor.module.css";
import { roman } from "./roman";

export interface CorridorPaintingData {
  id: string;
  title: string;
  /** « 3 sept. 2026 ». */
  date: string;
  rarity: ExploitRarity;
  category: ExploitCategory;
  imageUrl: string | undefined;
  /** Whether the member was there. */
  mine: boolean;
}

export interface CorridorChapterData {
  id: string;
  /** « IV ». */
  numeral: string;
  title: string;
  period: string;
  paintings: CorridorPaintingData[];
}

/** How far a click on an arrow moves the corridor. */
const STEP = 520;

/** Each type's picture on a painting without its capture (the mockup's icons). */
const ICONS: Record<ExploitCategory, ReactNode> = {
  guilde: <path d="M6 21V3h12l-3 4 3 4H6" />,
  culte: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14c1 2 2.5 3 4 3s3-1 4-3M8 9h2M14 9h2" />
    </>
  ),
  exploit: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />,
  pvp: <path d="M4 4l11 11M15 15l-2 2M15 15l2-2M20 4 9 15M9 15l2 2M9 15l-2-2M5 19l3-3M19 19l-3-3" />,
  raid: (
    <>
      <path d="M3 18 5 7l4 4 3-6 3 6 4-4 2 11Z" />
      <path d="M3 21h18" />
    </>
  ),
};

const QUALITY_COLORS: Record<ExploitRarity, string> = {
  rare: "var(--color-quality-rare)",
  epic: "var(--color-quality-epic)",
  legendary: "var(--color-quality-legendary)",
};

function Torch() {
  return (
    <div className={styles.torch} aria-hidden="true">
      <span className={styles.halo} />
      {/* eslint-disable-next-line @next/next/no-img-element -- a pixel-art sprite, served as is */}
      <img src="/images/hall-of-fame/torche.png" alt="" />
    </div>
  );
}

function Painting({ painting }: { painting: CorridorPaintingData }) {
  return (
    <div className={styles.bay} id={`tableau-${painting.id}`}>
      <Torch />
      <div className={styles.wallzone}>
        <Link
          href={`/hall-of-fame/${painting.id}`}
          className={`${styles.painting} ${styles[painting.rarity]}`}
          aria-label={`Ouvrir le tableau : ${painting.title}, ${painting.date}`}
        >
          <svg className={styles.wire} viewBox="0 0 120 40" aria-hidden="true">
            <path d="M8 40 60 6 112 40" fill="none" stroke="var(--color-muted)" strokeWidth="2" />
            <rect
              x="55"
              y="0"
              width="10"
              height="10"
              fill="var(--color-brass)"
              stroke="var(--color-ink)"
              strokeWidth="2"
            />
          </svg>
          {painting.imageUrl === undefined ? (
            <span className={styles.placeholder}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="square"
                aria-hidden="true"
              >
                {ICONS[painting.category]}
              </svg>
              <span>Pas encore de capture</span>
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- a member's capture, served by the website
            <img className={styles.capture} src={painting.imageUrl} alt="" />
          )}
          {painting.mine && <span className={styles.mine}>J&apos;y étais</span>}
        </Link>
      </div>
      <div className={styles.label}>
        <div className={`${styles.plaque} ${styles[painting.rarity]}`}>
          <span className={styles.gem} />
          <small>
            {painting.date} · {EXPLOIT_RARITY_LABELS[painting.rarity]}
          </small>
          <b>{painting.title}</b>
        </div>
      </div>
    </div>
  );
}

function Door({ chapter }: { chapter: CorridorChapterData }) {
  return (
    <div className={styles.bay} id={`chapitre-${chapter.id}`}>
      <Torch />
      {/* eslint-disable-next-line @next/next/no-img-element -- a pixel-art sprite, served as is */}
      <img className={styles.door} src="/images/hall-of-fame/porte.png" alt="" />
      <span className={styles.doorNumber} aria-hidden="true">
        {chapter.numeral}
      </span>
      <div className={styles.doorPlaque}>
        <small>Chapitre {chapter.numeral}</small>
        <b>{chapter.title}</b>
        <span>{chapter.period}</span>
      </div>
    </div>
  );
}

/**
 * The Hall of Fame's corridor (mockup HallOfFame): its filters, the corridor to walk from left to right, chapter after
 * chapter, each painting framed by its rarity, and the plan of the corridor.
 */
export function LegendCorridor({ chapters, memberName }: { chapters: CorridorChapterData[]; memberName: string }) {
  const corridor = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<ExploitCategory | "all">("all");
  const [mine, setMine] = useState(false);
  const [progress, setProgress] = useState(0);
  const visible = chapters
    .map((chapter) => ({
      ...chapter,
      paintings: chapter.paintings.filter(
        (painting) => (filter === "all" || painting.category === filter) && (!mine || painting.mine),
      ),
    }))
    .filter((chapter) => chapter.paintings.length > 0);
  const next = chapters.length + 1;
  const scroll = (left: number) => corridor.current?.scrollBy({ left, behavior: "smooth" });
  const onScroll = () => {
    const element = corridor.current;
    const max = element ? element.scrollWidth - element.clientWidth : 0;
    setProgress(element && max > 0 ? element.scrollLeft / max : 0);
  };
  return (
    <>
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-2 px-5 pb-6">
        <div role="group" aria-label="Filtrer par type" className="flex flex-wrap gap-2">
          {(["all", ...EXPLOIT_CATEGORIES] as const).map((category) => (
            <button
              key={category}
              type="button"
              className={styles.chip}
              aria-pressed={filter === category}
              onClick={() => {
                setFilter(category);
              }}
            >
              {category === "all" ? "Tout" : EXPLOIT_FILTER_LABELS[category]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`${styles.chip} ${styles.mineChip} ml-auto`}
          aria-pressed={mine}
          onClick={() => {
            setMine(!mine);
          }}
        >
          Mes exploits · {memberName}
        </button>
      </div>
      <section className={styles.wrap} aria-label="Le couloir des exploits, à parcourir de gauche à droite">
        <button
          type="button"
          className={styles.arrow}
          style={{ left: 16 }}
          aria-label="Tableaux précédents"
          onClick={() => scroll(-STEP)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 4 7 12l8 8" fill="none" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="square" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.arrow}
          style={{ right: 16 }}
          aria-label="Tableaux suivants"
          onClick={() => scroll(STEP)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 4 8 8-8 8" fill="none" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="square" />
          </svg>
        </button>
        <div ref={corridor} className={styles.corridor} onScroll={onScroll} tabIndex={0}>
          <div className={styles.hall}>
            <div className={styles.bay}>
              <Torch />
              {/* eslint-disable-next-line @next/next/no-img-element -- a pixel-art sprite, served as is */}
              <img className={styles.banner} src="/images/hall-of-fame/banniere.png" alt="" />
              <div className={styles.bannerText}>
                {/* eslint-disable-next-line @next/next/no-img-element -- the guild's emblem */}
                <img src="/images/emblem.jpg" alt="" />
                <b>
                  La légende
                  <br />
                  de VXV
                </b>
                <span>Entre, et souviens-toi.</span>
              </div>
              <span className={styles.ahead}>Avance →</span>
            </div>
            {visible.map((chapter) => (
              <ChapterBays key={chapter.id} chapter={chapter} />
            ))}
            <div className={styles.bay}>
              <Torch />
              <div className={styles.wallzone}>
                <div className={styles.free}>
                  <b>Cet emplacement est libre</b>
                  <span>Le prochain tableau, c&apos;est peut-être ta soirée.</span>
                </div>
              </div>
              <div className={styles.label}>
                <div className={`${styles.plaque} ${styles.woodPlaque}`}>
                  <small>Chapitre {roman(next)}</small>
                  <b>À écrire</b>
                </div>
              </div>
            </div>
            <div className={`${styles.bay} ${styles.closed}`} aria-hidden="true">
              <Torch />
              {/* eslint-disable-next-line @next/next/no-img-element -- a pixel-art sprite, served as is */}
              <img className={styles.door} src="/images/hall-of-fame/porte.png" alt="" />
              <span className={styles.doorNumber}>{roman(next)}</span>
              <div className={styles.doorPlaque}>
                <b>Fermé pour l&apos;instant</b>
                <span>La suite s&apos;écrit en jeu</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <nav aria-label="Plan du couloir" className="mx-auto max-w-[1360px] px-5 pt-6 pb-10">
        <div className="mb-2.5 flex items-center gap-3">
          <span className="font-pixel text-base text-parchment">Plan du couloir</span>
          <span className="text-xs text-muted">Clique un chapitre pour t&apos;y rendre</span>
        </div>
        <div className={styles.map}>
          {visible.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              className={styles.segment}
              style={{ flex: 1 + chapter.paintings.length }}
              onClick={() =>
                document
                  .getElementById(`chapitre-${chapter.id}`)
                  ?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
              }
            >
              <span className="text-sakura-light">{chapter.numeral}</span>
              <span className={styles.segmentTitle}>{chapter.title}</span>
              <span className="ml-auto flex gap-1.5">
                {chapter.paintings.map((painting) => (
                  <span
                    key={painting.id}
                    className={styles.dot}
                    style={{ background: QUALITY_COLORS[painting.rarity] }}
                  />
                ))}
              </span>
            </button>
          ))}
          <span
            aria-hidden="true"
            className={styles.marker}
            style={{ left: `${String(Math.round(progress * 1000) / 10)}%` }}
          />
        </div>
        <div className="mt-3.5 flex flex-wrap gap-x-4.5 gap-y-2 text-xs text-lavender">
          {(["rare", "epic", "legendary"] as const).map((rarity) => (
            <span key={rarity} className="inline-flex items-center gap-1.5">
              <span className={styles.dot} style={{ background: QUALITY_COLORS[rarity] }} />
              {EXPLOIT_RARITY_LABELS[rarity]}
              {rarity === "legendary" && " · grand tableau"}
            </span>
          ))}
        </div>
      </nav>
    </>
  );
}

function ChapterBays({ chapter }: { chapter: CorridorChapterData }) {
  return (
    <>
      <Door chapter={chapter} />
      {chapter.paintings.map((painting) => (
        <Painting key={painting.id} painting={painting} />
      ))}
    </>
  );
}
