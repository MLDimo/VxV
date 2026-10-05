"use client";

/** Unexpected failures (database unreachable, bug): a French message instead of Next's default page. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-pixel text-[30px] leading-none font-bold text-ivory">Une erreur est survenue</h1>
      <p className="mt-2 text-muted">Merci de réessayer. Si le problème continue, prévenez un officier.</p>
      <button type="button" onClick={reset} className="button-pixel mt-6">
        Réessayer
      </button>
    </main>
  );
}
