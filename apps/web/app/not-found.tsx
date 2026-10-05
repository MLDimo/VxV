import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-pixel text-[30px] leading-none font-bold text-ivory">Page introuvable</h1>
      <p className="mt-2 text-muted">Cette page n&apos;existe pas, ou plus.</p>
      <Link href="/" className="mt-6 inline-block text-amethyst underline">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
