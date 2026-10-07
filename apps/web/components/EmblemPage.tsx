import Image from "next/image";
import type { ReactNode } from "react";

/** A page outside the tavern (sign-in, companion link): the guild's emblem, the page's plaque, and its refusal. */
export function EmblemPage({ title, error, children }: { title: string; error?: string; children?: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <Image
        src="/images/emblem.jpg"
        alt=""
        width={120}
        height={120}
        priority
        className="image-pixelated size-30 object-cover shadow-[0_0_0_2px_var(--color-ink),0_0_0_4px_var(--color-amethyst)]"
      />
      <h1 className="plaque mt-10 text-3xl">{title}</h1>
      {error && <p className="mt-6 bg-loss/14 px-4 py-3 text-loss">{error}</p>}
      {children}
    </main>
  );
}
