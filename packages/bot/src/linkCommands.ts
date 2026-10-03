import { fullName, identityFromDiscordUser, type Character, type Member } from "@vxv/server";
import { classLabel } from "@vxv/server/domain/characterClasses";
import { normalizeForSearch, searchCharacters } from "@vxv/server/domain/characterSearch";
import {
  ApplicationCommandOptionType,
  InteractionResponseType,
  type APIApplicationCommandAutocompleteGuildInteraction,
  type APIChatInputApplicationCommandGuildInteraction,
} from "discord-api-types/v10";
import { stringOption, type BotContext, type SlashCommand } from "./commands.ts";
import { ephemeral } from "./responses.ts";

const CHARACTER_OPTION = "personnage";
/** Discord shows at most 25 suggestions. */
const MAX_SUGGESTIONS = 25;

const NOT_FOUND =
  "Personnage introuvable dans la liste de guilde. Tape son prénom et choisis-le dans la liste proposée. " +
  "S'il n'y figure pas, un officier doit importer la liste de guilde à jour depuis le jeu.";

type GuildInteraction =
  APIChatInputApplicationCommandGuildInteraction | APIApplicationCommandAutocompleteGuildInteraction;

function memberOf(interaction: GuildInteraction, { app }: BotContext): Promise<Member> {
  return app.auth.identify(identityFromDiscordUser(interaction.member.user), interaction.member.roles);
}

/** The member's own characters, then the guild characters nobody has claimed yet. */
async function linkableCharacters({ app }: BotContext, member: Member): Promise<Character[]> {
  const [mine, available] = await Promise.all([app.characters.listMine(member), app.characters.listAvailable()]);
  return [...mine, ...available];
}

/** A suggestion picked in the list gives the character id; a name typed in full also matches. */
function findCharacter(characters: readonly Character[], value: string): Character | undefined {
  const typed = normalizeForSearch(value.trim());
  return (
    characters.find((character) => character.id === value) ??
    characters.find((character) => normalizeForSearch(fullName(character)) === typed)
  );
}

function linkCommand(
  name: string,
  description: string,
  asMain: boolean,
  done: (name: string) => string,
): Required<SlashCommand> {
  return {
    definition: {
      name,
      description,
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: CHARACTER_OPTION,
          description: "Prénom Nom du personnage",
          required: true,
          autocomplete: true,
        },
      ],
    },

    async run(interaction, context) {
      if (interaction.channel.id !== context.linkChannelId) {
        return ephemeral(`Les personnages se lient dans le salon <#${context.linkChannelId}>.`);
      }
      const member = await memberOf(interaction, context);
      const character = findCharacter(
        await linkableCharacters(context, member),
        stringOption(interaction, CHARACTER_OPTION),
      );
      if (character === undefined) {
        return ephemeral(NOT_FOUND);
      }
      await context.app.characters.link(member, character.id, asMain);
      const confirmation = done(fullName(character));
      return ephemeral(
        asMain ? `${confirmation} ${await context.app.discordProfiles.syncForMessage(member)}` : confirmation,
      );
    },

    async autocomplete(interaction, context) {
      const member = await memberOf(interaction, context);
      const candidates = (await linkableCharacters(context, member)).map((character) => ({
        id: character.id,
        name: fullName(character),
        characterClass: character.characterClass,
      }));
      const matches = searchCharacters(candidates, stringOption(interaction, CHARACTER_OPTION), MAX_SUGGESTIONS);
      return {
        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
        data: {
          choices: matches.map((match) => ({
            name: `${match.name} · ${classLabel(match.characterClass)}`,
            value: match.id,
          })),
        },
      };
    },
  };
}

/** /vxv_main: the member links their main character from Discord, as on the website. */
export const VXV_MAIN = linkCommand(
  "vxv_main",
  "Lier ton personnage principal",
  true,
  (name) => `${name} est maintenant ton personnage principal.`,
);

/** /vxv_reroll: the member links another of their characters. */
export const VXV_REROLL = linkCommand(
  "vxv_reroll",
  "Lier un reroll à ton compte",
  false,
  (name) => `${name} est lié à ton compte comme reroll.`,
);

export const LINK_COMMANDS: readonly SlashCommand[] = [VXV_MAIN, VXV_REROLL];
