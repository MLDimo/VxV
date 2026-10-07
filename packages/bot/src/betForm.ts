import type { Bet, Stake } from "@vxv/server";
import { potentialGain } from "@vxv/server/domain/bets";
import { formatGold, formatOdds } from "@vxv/server/domain/labels";
import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
  type APIInteractionResponse,
  type APIMessageComponentGuildInteraction,
  type APIModalInteractionResponseCallbackData,
  type APIModalSubmitGuildInteraction,
} from "discord-api-types/v10";
import type { BotContext } from "./commands.ts";
import { actingMember } from "./members.ts";
import { submittedValues } from "./modalValues.ts";
import { ephemeral } from "./responses.ts";

/** The stake form of a bet, read back when the member sends it. */
export const BET_FORM_PREFIX = "bet-form:";

const FIELDS = { choice: "choice", amount: "amount" } as const;
/** Discord's limits for a modal title and a text input. */
const MAX_TITLE_LENGTH = 45;
const MAX_AMOUNT_LENGTH = 9;
const UNKNOWN_BET = "Ce pari n'existe plus.";
const LATE_MESSAGE = " Le message du pari sera mis à jour à la prochaine mise.";

/** One modal holds the stake: the choice and the amount, filled with the member's current stake. */
function betForm(bet: Bet, current: Stake | undefined): APIModalInteractionResponseCallbackData {
  return {
    custom_id: `${BET_FORM_PREFIX}${bet.id}`,
    title: `Miser · ${bet.title}`.slice(0, MAX_TITLE_LENGTH),
    components: [
      {
        type: ComponentType.Label,
        label: "Choix",
        component: {
          type: ComponentType.StringSelect,
          custom_id: FIELDS.choice,
          options: bet.choices.map((choice) => ({
            label: choice.label,
            value: choice.id,
            default: choice.id === current?.choiceId,
          })),
        },
      },
      {
        type: ComponentType.Label,
        label: "Mise en pièces d'or (1 po au moins)",
        component: {
          type: ComponentType.TextInput,
          custom_id: FIELDS.amount,
          style: TextInputStyle.Short,
          max_length: MAX_AMOUNT_LENGTH,
          ...(current === undefined ? {} : { value: String(current.amount) }),
        },
      },
    ],
  };
}

/** The "Miser" button: opens the stake form. */
export async function openBetForm(
  interaction: APIMessageComponentGuildInteraction,
  { app }: BotContext,
  betId: string,
): Promise<APIInteractionResponse> {
  const found = await app.bets.find(betId);
  if (found === undefined) {
    return ephemeral(UNKNOWN_BET);
  }
  if (!found.open) {
    return ephemeral("Ce pari est fermé.");
  }
  const member = await actingMember(interaction, app);
  return {
    type: InteractionResponseType.Modal,
    data: betForm(
      found.bet,
      found.stakes.find((stake) => stake.memberId === member.id),
    ),
  };
}

/** The form sent: the stake is saved as on the website, and the bet's message follows. */
export async function submitBetForm(
  interaction: APIModalSubmitGuildInteraction,
  { app }: BotContext,
  betId: string,
): Promise<APIInteractionResponse> {
  const values = submittedValues(interaction.data.components);
  const member = await actingMember(interaction, app);
  const choiceId = values.get(FIELDS.choice) ?? "";
  const amount = Number((values.get(FIELDS.amount) ?? "").trim());
  const { bet, book } = await app.bets.stake(member, betId, choiceId, amount);
  const announced = await app.betAnnouncements.announceQuietly(betId);
  const label = bet.choices.find((choice) => choice.id === choiceId)?.label ?? "";
  const odds = book.choices.find((entry) => entry.choice.id === choiceId)?.odds;
  return ephemeral(
    `Ta mise : ${formatGold(amount)} sur « ${label} » → gain possible ${formatGold(potentialGain(book, choiceId, amount))} ` +
      `(${formatOdds(odds)} pour l'instant : les cotes bougent jusqu'à la fermeture). ` +
      `À payer au trésorier ; modifiable tant qu'elle n'est pas payée.${announced ? "" : LATE_MESSAGE}`,
  );
}

/** The "Retirer ma mise" button. */
export async function withdrawStake(
  interaction: APIMessageComponentGuildInteraction,
  { app }: BotContext,
  betId: string,
): Promise<APIInteractionResponse> {
  const member = await actingMember(interaction, app);
  await app.bets.withdraw(member, betId);
  const announced = await app.betAnnouncements.announceQuietly(betId);
  return ephemeral(`Mise retirée.${announced ? "" : LATE_MESSAGE}`);
}
