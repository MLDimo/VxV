import { ScreenHeader } from "@/components/ScreenHeader";

/** The public repository of the companion's releases: the installers of its latest version keep the same names. */
const LATEST = "https://github.com/MLDimo/vxv-compagnon/releases/latest/download";

/** The companion (P7): what it does, where to download it, and how to install it without a certificate. */
export default function CompanionPage() {
  return (
    <>
      <ScreenHeader
        kicker="Le lien entre le jeu et la taverne"
        kickerClassName="text-amethyst-light"
        title="Le compagnon"
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="panel">
          <h2 className="font-pixel text-lg text-ivory">Ce qu&apos;il fait</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-lavender">
            <li>Il apporte au jeu les inscrits et les SR du prochain raid : tape /reload pour les voir.</li>
            <li>
              Il envoie au site ce que tu fais en jeu (inscription, SR) et, pour un officier, la liste de guilde et les
              journaux de raid.
            </li>
            <li>
              Plus aucun copier-coller entre le jeu et le site. Facultatif pour les membres, indispensable aux
              officiers.
            </li>
          </ul>
        </section>
        <section className="panel">
          <h2 className="font-pixel text-lg text-ivory">Télécharger</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            <a href={`${LATEST}/VXV-Compagnon-Setup.exe`} className="button-pixel">
              Windows
            </a>
            <a href={`${LATEST}/VXV-Compagnon.dmg`} className="button-pixel">
              Mac
            </a>
          </div>
          <p className="mt-4 text-sm text-muted">
            Il se met ensuite à jour tout seul sous Windows ; sur Mac, il te prévient d&apos;une nouvelle version.
          </p>
        </section>
      </div>
      <section className="panel mt-6">
        <h2 className="font-pixel text-lg text-ivory">Installer</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-lavender">
          <li>
            Windows : si Windows protège ton ordinateur, clique sur « Informations complémentaires » puis « Exécuter
            quand même ». Le compagnon n&apos;a pas encore de certificat.
          </li>
          <li>
            Mac : ouvre le fichier, glisse VXV Compagnon dans Applications, puis lance-le. Si le Mac refuse de
            l&apos;ouvrir, va dans Réglages Système, Confidentialité et sécurité, et clique sur « Ouvrir quand même ».
          </li>
          <li>Dans le compagnon, clique sur « Relier mon compte » et confirme sur le site.</li>
          <li>Il trouve le jeu tout seul ; sinon, indique-lui le dossier de World of Warcraft.</li>
        </ol>
      </section>
    </>
  );
}
