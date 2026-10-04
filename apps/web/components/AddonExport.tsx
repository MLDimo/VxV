"use client";

import { useId, useState } from "react";

const COPIED_MESSAGE_MS = 3000;

/** The event's text for the addon, ready to copy: an officer pastes it in game with /vxv importer. */
export function AddonExport({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const fieldId = useId();
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, COPIED_MESSAGE_MS);
  };
  return (
    <div className="mt-4 space-y-2">
      {/* The label stays outside the field: the event's text must not become part of its name. */}
      <label htmlFor={fieldId} className="block text-sm text-zinc-300">
        Données de l&apos;événement pour l&apos;addon
      </label>
      <textarea
        id={fieldId}
        readOnly
        value={text}
        rows={6}
        onFocus={(event) => {
          event.currentTarget.select();
        }}
        className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs"
      />
      <button
        type="button"
        onClick={() => void copy()}
        className="rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
      >
        Copier
      </button>
      {copied && (
        <p role="status" className="text-sm text-emerald-400">
          Copié : en jeu, tape /vxv importer puis colle avec Ctrl+V.
        </p>
      )}
    </div>
  );
}
