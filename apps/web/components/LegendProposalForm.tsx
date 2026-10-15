"use client";

import { EXPLOIT_CATEGORIES, EXPLOIT_CATEGORY_LABELS, LEGEND_LIMITS } from "@vxv/server/domain/legend";
import { useActionState, useState } from "react";
import { proposeExploit } from "@/app/actions/legend";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { Field, Options } from "./Field";

/** The longest side of a capture once made smaller, and its JPEG quality: a few hundred KB each. */
const MAX_SIDE = 1600;
const QUALITY = 0.85;

/** A capture made smaller by the browser before it travels. */
async function smaller(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("capture"))), "image/jpeg", QUALITY);
  });
}

/** A member proposes an exploit for the Hall of Fame: the evening, told, and its captures. */
export function LegendProposalForm({
  raidNights,
  today,
}: {
  raidNights: readonly { id: string; label: string }[];
  today: string;
}) {
  const [state, action, pending] = useActionState(proposeExploit, IDLE);
  const [captures, setCaptures] = useState<Blob[]>([]);
  const [reading, setReading] = useState(false);
  return (
    <form
      action={(form) => {
        form.delete("files");
        for (const [index, capture] of captures.entries()) {
          form.append("images", capture, `capture-${String(index + 1)}.jpg`);
        }
        action(form);
      }}
      className="mt-6 max-w-2xl space-y-5"
    >
      <Field label="Titre du tableau">
        <input
          name="title"
          required
          maxLength={LEGEND_LIMITS.title}
          placeholder="Ragnaros tombe : premier clear"
          className="field"
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Date">
          <input type="date" name="occurredOn" required max={today} className="field" />
        </Field>
        <Field label="Heure (facultative)">
          <input type="time" name="occurredTime" className="field" />
        </Field>
        <Field label="Type">
          <select name="category" required className="field">
            <Options
              options={EXPLOIT_CATEGORIES.map((category) => [category, EXPLOIT_CATEGORY_LABELS[category]] as const)}
            />
          </select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Lieu (facultatif)">
          <input name="place" maxLength={LEGEND_LIMITS.place} placeholder="Cœur du Magma" className="field" />
        </Field>
        <Field label="Soirée de raid (facultative : ses présents seront ceux du tableau)">
          <select name="eventId" className="field" defaultValue="">
            <option value="">Aucune</option>
            <Options options={raidNights.map((night) => [night.id, night.label] as const)} />
          </select>
        </Field>
      </div>
      <Field label="Le récit">
        <textarea name="story" required maxLength={LEGEND_LIMITS.story} rows={6} className="field" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <Field label="La phrase de la soirée (facultative)">
          <input
            name="quote"
            maxLength={LEGEND_LIMITS.quote}
            placeholder="NE BOUGEZ PLUS. Personne ne bouge."
            className="field"
          />
        </Field>
        <Field label="Dite par">
          <input name="quoteBy" maxLength={LEGEND_LIMITS.quoteBy} className="field" />
        </Field>
      </div>
      <Field label={`Quelques chiffres, un par ligne (${String(LEGEND_LIMITS.stats)} au plus)`}>
        <textarea name="stats" rows={3} placeholder={"9e essai\n7 soirées · 63 wipes"} className="field" />
      </Field>
      <Field label={`Captures d'écran (${String(LEGEND_LIMITS.images)} au plus, la première fait le tableau)`}>
        <input
          type="file"
          name="files"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="field"
          onChange={(event) => {
            const files = [...(event.currentTarget.files ?? [])].slice(0, LEGEND_LIMITS.images);
            setReading(true);
            void Promise.all(files.map(smaller))
              .then(setCaptures)
              .finally(() => {
                setReading(false);
              });
          }}
        />
      </Field>
      {captures.length > 0 && <p className="text-sm text-muted">{captures.length} capture(s) prête(s).</p>}
      <button type="submit" disabled={pending || reading} className="button-gold">
        {pending ? "Envoi…" : "Proposer l'exploit"}
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
