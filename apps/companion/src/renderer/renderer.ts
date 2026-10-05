import type { CompanionState } from "../application/companion.ts";
import type { CompanionBridge } from "../main/bridge.ts";

declare global {
  interface Window {
    vxv: CompanionBridge;
  }
}

const { vxv } = window;
const app = document.getElementById("app") as HTMLElement;

type Child = Node | string;

/** An element with its attributes and children; texts are never read as HTML. */
function element(tag: string, attributes: Record<string, string> = {}, ...children: Child[]): HTMLElement {
  const created = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    created.setAttribute(name, value);
  }
  created.append(...children);
  return created;
}

function button(kind: "pixel" | "wood" | "link", text: string, onClick: () => Promise<void>): HTMLElement {
  const created = element("button", { type: "button", class: kind === "link" ? "link" : `button-${kind}` }, text);
  created.addEventListener("click", () => void onClick());
  return created;
}

function panel(title: string, ...children: Child[]): HTMLElement {
  return element("section", { class: "panel" }, element("h2", {}, title), ...children);
}

const OFFICER_ROLES = new Set(["officer", "gm"]);

function accountPanel(state: CompanionState): HTMLElement {
  if (state.linking) {
    return panel(
      "Compte",
      element("p", { class: "lavender" }, "Confirme la liaison dans ton navigateur, sur le site VXV…"),
      element("div", { class: "actions" }, button("wood", "Annuler", vxv.cancelLink)),
    );
  }
  if (state.account === undefined) {
    return panel(
      "Compte",
      element(
        "p",
        { class: "lavender" },
        "Relie le compagnon à ton compte Discord : il agira en ton nom auprès du site de la guilde.",
      ),
      element("div", { class: "actions" }, button("pixel", "Relier mon compte", vxv.link)),
    );
  }
  const officer = state.account.roles.some((role) => OFFICER_ROLES.has(role));
  return panel(
    "Compte",
    element("p", {}, "Relié à ", element("strong", {}, state.account.name), officer ? " · officier" : ""),
    element("div", { class: "actions" }, button("wood", "Délier", vxv.unlink)),
  );
}

/** "_classic_beta_" and the folder holding it, whatever the system's separator. */
function splitFolder(path: string): [name: string, parent: string] {
  const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return [path.slice(cut + 1), path.slice(0, cut)];
}

function gamePanel(state: CompanionState): HTMLElement {
  if (state.installations.length === 0) {
    return panel(
      "World of Warcraft",
      element(
        "p",
        { class: "lavender" },
        "Le jeu avec l'addon VXV est introuvable. Installe l'addon, puis indique le dossier du jeu.",
      ),
      element("div", { class: "actions" }, button("wood", "Choisir le dossier", vxv.chooseGameFolder)),
    );
  }
  const versions = state.installations.map((path) => {
    const [name, parent] = splitFolder(path);
    return element("li", {}, element("strong", {}, name), element("div", { class: "path muted" }, parent));
  });
  return panel(
    "World of Warcraft",
    element("p", { class: "lavender" }, "Addon VXV trouvé :"),
    element("ul", { class: "installations" }, ...versions),
    element("div", { class: "actions" }, button("link", "Choisir un autre dossier", vxv.chooseGameFolder)),
  );
}

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const REFRESH_MS = 30 * 1000;

/** "à l'instant", "il y a 4 min", "il y a 2 h". */
function ago(at: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - at.getTime()) / 1000 / SECONDS_PER_MINUTE);
  if (minutes < 1) {
    return "à l'instant";
  }
  return minutes < MINUTES_PER_HOUR
    ? `il y a ${String(minutes)} min`
    : `il y a ${String(Math.floor(minutes / MINUTES_PER_HOUR))} h`;
}

const raidDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** Only once linked and the game found: when the data last went to the game, and which raid. */
function syncPanel(state: CompanionState): HTMLElement[] {
  if (state.account === undefined || state.installations.length === 0) {
    return [];
  }
  const { lastSync } = state;
  const lines: Child[] = [];
  if (lastSync === undefined) {
    lines.push(
      element("p", { class: "lavender" }, state.syncing ? "Synchronisation en cours…" : "Pas encore synchronisé."),
    );
  } else {
    lines.push(element("p", {}, `Dernière synchronisation ${ago(lastSync.at, new Date())}.`));
    lines.push(
      lastSync.raid === undefined
        ? element("p", { class: "lavender" }, "Aucun raid prévu pour le moment.")
        : element(
            "p",
            { class: "lavender" },
            "Prochain raid : ",
            element("strong", {}, lastSync.raid.title),
            `, ${raidDate.format(new Date(lastSync.raid.startsAt))}.`,
          ),
    );
    if (state.lastUpload !== undefined) {
      lines.push(
        element("p", {}, `Envoyé au site ${ago(state.lastUpload.at, new Date())} :`),
        element("ul", { class: "sent" }, ...state.lastUpload.messages.map((message) => element("li", {}, message))),
      );
    }
    if (lastSync.outdated.length > 0) {
      lines.push(
        element("p", { class: "loss" }, "Mets l'addon VXV à jour : cette version ne sait pas lire le compagnon."),
      );
    }
    lines.push(element("p", { class: "muted" }, "En jeu, tape /reload pour charger les nouvelles données."));
  }
  const sync = button("wood", state.syncing ? "Synchronisation…" : "Synchroniser maintenant", vxv.syncNow);
  sync.toggleAttribute("disabled", state.syncing);
  return [panel("Synchronisation", ...lines, element("div", { class: "actions" }, sync))];
}

function footer(state: CompanionState): HTMLElement {
  const checkbox = element("input", { type: "checkbox" }) as HTMLInputElement;
  checkbox.checked = state.settings.launchAtLogin;
  checkbox.addEventListener("change", () => void vxv.setLaunchAtLogin(checkbox.checked));
  return element(
    "footer",
    { class: "footer" },
    element("label", {}, checkbox, "Lancer avec l'ordinateur"),
    element("span", {}, `Version ${state.version} · `, button("link", "Ouvrir le site", vxv.openSite)),
  );
}

let shown: CompanionState | undefined;

/** A newer version of the companion: installed in one click (Windows), or downloaded (Mac). */
function updateBanner(state: CompanionState): HTMLElement[] {
  const { update } = state;
  if (update === undefined) {
    return [];
  }
  return [
    element(
      "div",
      { class: "update" },
      element("span", {}, `Nouvelle version ${update.version}${update.ready ? " prête" : ""}.`),
      button("pixel", update.ready ? "Redémarrer" : "Télécharger", vxv.update),
    ),
  ];
}

function render(state: CompanionState): void {
  shown = state;
  const notice = state.notice === undefined ? [] : [element("p", { class: "notice", role: "alert" }, state.notice)];
  app.replaceChildren(
    ...updateBanner(state),
    ...notice,
    accountPanel(state),
    gamePanel(state),
    ...syncPanel(state),
    footer(state),
  );
}

vxv.onState(render);
void vxv.state().then(render);
// "il y a 4 min" moves on by itself.
setInterval(() => {
  if (shown !== undefined) {
    render(shown);
  }
}, REFRESH_MS);
