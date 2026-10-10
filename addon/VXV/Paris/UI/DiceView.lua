local ns = select(2, ...).Paris

--- What Le Dé Pipé shows (§7.2), as rows for the core's lists: the open bets on the table with their odds and the
--- player's stake, the player's bets and the guild's cash. Built from the data alone.
local DiceView = {}
ns.DiceView = DiceView

local Bets, Book, Gold, Changes = ns.Bets, ns.Book, VXV.Gold, ns.Changes

local DATE = "%d/%m %H:%M"
local EXAMPLE_STAKE = 10
local NO_DATA = "Aucune donnée des paris : un officier les envoie à la guilde, ou ton compagnon VXV les apporte."
local NO_BET = "Aucun pari ouvert : les officiers les lancent ici, sur le site ou sur Discord."
local OPENING = "En attente du site : pari « %s »"
local UNLINKED = "Ce personnage n'est lié à aucun membre sur le site : lie-le avec /vxv_main ou /vxv_reroll."
-- Where a stake stands with the treasurer (domain/bets.ts).
local STANDINGS = {
    toPay = "à payer", paid = "payée", debt = "dette", toCollect = "gain à récupérer", collected = "gain versé",
    settled = "réglée",
}

local row = VXV.RowList.Row

--- The head of the screen: subtitle, and the badges of the player's debt and of the organisation's share.
function DiceView.Header(data, memberId)
    local debt = Bets.Debt(data, memberId)
    return {
        subtitle = data == nil and NO_DATA or ("Données du " .. date(DATE, data.exportedAt)),
        badges = {
            debt > 0 and { text = "Dette : " .. Gold.Format(debt), color = "loss" }
                or { text = "Dette : aucune", color = "gain" },
            { text = Book.ORGANISATION_PERCENT .. " % pour la caisse", color = "gold" },
        },
    }
end

--- The player's stake on the bet as it stands: waiting for the website, known by it, or none.
local function myStake(bet, memberId, book)
    local pending, stake, answer = Changes.Pending(bet.id), Bets.StakeOf(bet, memberId), Changes.Answer(bet.id)
    local rows = {}
    if pending ~= nil then
        rows[#rows + 1] = row("line", pending.kind == "withdraw" and "Retrait de ta mise en attente du site"
            or ("En attente du site : %s sur « %s »"):format(Gold.Format(pending.amount),
                Bets.ChoiceLabel(bet, pending.choiceId)))
    elseif stake ~= nil then
        local gain = Book.Gain(book, stake.choiceId, stake.amount)
        rows[#rows + 1] = row("line", ("Ma mise : %s sur « %s » · %s · gain possible %s"):format(
            Gold.Format(stake.amount), Bets.ChoiceLabel(bet, stake.choiceId), STANDINGS[stake.standing] or "",
            Gold.Format(gain)))
    else
        rows[#rows + 1] = row("line", "Pas de mise")
    end
    if answer ~= nil and not answer.accepted and pending == nil then
        rows[#rows + 1] = row("line", VXV.Theme.Colored("Refusée : " .. answer.message, "loss"))
    end
    return rows
end

--- A bet on the table: when it closes and its pool, each choice's share and odds, the player's stake.
function DiceView.Bet(bet, memberId)
    local book = Book.Of(bet)
    local rows = {
        row("title", bet.title, { tooltip = { title = bet.title, lines = { "Clic : miser" } } }),
        row("line", ("Ferme le %s · cagnotte %s · %s"):format(date(DATE, bet.closesAt), Gold.Format(book.pool),
            VXV.Count(book.bettors, "parieur"))),
    }
    for _, entry in ipairs(book.choices) do
        rows[#rows + 1] = row("line", ("%s · %s · %s · %s"):format(entry.choice.label, Gold.Share(entry.share),
            Gold.Format(entry.total), Gold.Odds(entry.odds)), { tooltip = {
            title = entry.choice.label,
            lines = { VXV.Count(entry.bettors, "parieur"), ("Gain pour %s : %s"):format(Gold.Format(EXAMPLE_STAKE),
                Gold.Format(Book.Gain(book, entry.choice.id, EXAMPLE_STAKE))) },
        } })
    end
    for _, extra in ipairs(myStake(bet, memberId, book)) do
        rows[#rows + 1] = extra
    end
    return rows
end

--- Le Dé Pipé's table: the bets the player opened, waiting for the website, then every open bet, closing soonest
--- first; or why there is none. A bet's title opens the stake.
function DiceView.Table(data, memberId, now, onStake)
    local rows = {}
    for _, opening in ipairs(Changes.Openings()) do
        rows[#rows + 1] = row("line", OPENING:format(opening.title))
    end
    local open = data ~= nil and Bets.Open(data, now) or {}
    if #open == 0 then
        rows[#rows + 1] = row("line", data == nil and NO_DATA or NO_BET)
    end
    for _, bet in ipairs(open) do
        for index, entry in ipairs(DiceView.Bet(bet, memberId)) do
            if index == 1 then
                entry.onClick = function()
                    onStake(bet.id)
                end
            end
            rows[#rows + 1] = entry
        end
    end
    return rows
end

--- "Mes paris": the player's stake on each bet, latest bets first, with where it stands.
function DiceView.MyStakes(data, memberId)
    if data == nil then
        return {}
    end
    if memberId == nil then
        return { row("line", UNLINKED) }
    end
    local rows = {}
    for _, bet in ipairs(data.bets) do
        local stake = Bets.StakeOf(bet, memberId)
        if stake ~= nil then
            local result = stake.standing == "toCollect" and (" · " .. Gold.Format(stake.gain)) or ""
            rows[#rows + 1] = row("line", ("%s : %s sur « %s » · %s%s"):format(bet.title, Gold.Format(stake.amount),
                Bets.ChoiceLabel(bet, stake.choiceId), STANDINGS[stake.standing] or "", result))
        end
    end
    if #rows == 0 then
        rows[1] = row("line", "Aucune mise pour l'instant.")
    end
    return rows
end

--- The guild's cash (P11.9) as lines of text: its balance, the month's entries and exits, the latest movements.
--- Also shown on the Journal's left page (the Raid part), which gets them through the bus ("cash.updated").
function DiceView.CashLines(data)
    if data == nil then
        return {}
    end
    local cash = data.cash
    local lines = {
        "Solde : " .. Gold.Format(cash.balance),
        ("Ce mois : %s, %s"):format(Gold.Signed(cash.entries), Gold.Signed(cash.exits)),
    }
    for _, movement in ipairs(cash.movements) do
        lines[#lines + 1] = ("%s · %s · %s"):format(date(DATE, movement.at), movement.label,
            Gold.Signed(movement.amount))
    end
    return lines
end

--- The guild's cash as rows: the balance as their header.
function DiceView.Cash(data)
    local rows = {}
    for index, text in ipairs(DiceView.CashLines(data)) do
        rows[#rows + 1] = row(index == 1 and "header" or "line", text)
    end
    return rows
end

--- The Taverne's card: the bet closing soonest, or how bets come.
function DiceView.Card(data, now)
    local bet = Bets.Open(data, now)[1]
    if bet == nil then
        return { title = "Aucun pari ouvert", action = "Entrer",
            lines = { "Les officiers lancent les paris sur le site et sur Discord." } }
    end
    local book = Book.Of(bet)
    return {
        title = bet.title,
        lines = { ("Cagnotte %s · %s"):format(Gold.Format(book.pool), VXV.Count(book.bettors, "parieur")),
            "Ferme le " .. date(DATE, bet.closesAt) },
        action = "Entrer",
    }
end
