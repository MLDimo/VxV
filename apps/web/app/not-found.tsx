import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-zinc-400">Cette page n&apos;existe pas, ou plus.</p>
      <Link href="/" className="mt-6 inline-block text-indigo-300 underline">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
