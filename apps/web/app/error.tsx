"use client";

/** Unexpected failures (database unreachable, bug): a French message instead of Next's default page. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
      <p className="mt-2 text-zinc-400">Merci de réessayer. Si le problème continue, prévenez un officier.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
      >
        Réessayer
      </button>
    </main>
  );
}
