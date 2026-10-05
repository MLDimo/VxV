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
      <label htmlFor={fieldId} className="block text-sm text-lavender">
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
        className="field font-mono text-xs"
      />
      <button type="button" onClick={() => void copy()} className="button-pixel">
        Copier
      </button>
      {copied && (
        <p role="status" className="text-sm text-gain">
          Copié : en jeu, tape /vxv importer puis colle avec Ctrl+V.
        </p>
      )}
    </div>
  );
}
