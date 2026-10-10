local ns = select(2, ...).Paris

--- Changes made in game on the bets (P11.8): a stake placed, moved or taken back, and a bet an officer opens (owner's
--- decision of 7 October). Each waits for the website ("en attente") until the bets' data bring back what became of
--- it; the core sends it to the website (VXV.PendingChanges). A change: { kind = "stake", betId, choiceId, amount },
--- { kind = "withdraw", betId } or { kind = "bet", title, choices, date, time, reason }.
local Changes = {}
ns.Changes = Changes

local BetsData = ns.BetsData

local FIELDS = {
    stake = { betId = "string", choiceId = "string", amount = "number" },
    withdraw = { betId = "string" },
    bet = { title = "string", choices = "strings", date = "string", time = "string", reason = "string" },
}

local answers = {}
local changes = VXV.PendingChanges({
    message = "paris.change",
    fields = FIELDS,
    canRelay = function()
        return BetsData.IsOfficer(VXV.PlayerName())
    end,
    changed = function()
        VXV.Emit("paris.changes")
    end,
})

--- Takes the module's saved data at start-up: the changes still waiting, and the last answer on each bet.
function Changes.Restore(data)
    changes.Restore(data)
    data.answers = type(data.answers) == "table" and data.answers or {}
    answers = data.answers
end

--- The player's change on the bet waiting for the website, the newest one; nil without.
function Changes.Pending(betId)
    local found
    for _, change in pairs(changes.Pending()) do
        if change.betId == betId and (found == nil or change.at > found.at) then
            found = change
        end
    end
    return found
end

--- The website's last answer to the player's stake on the bet: { accepted, message }, or nil.
function Changes.Answer(betId)
    return answers[betId]
end

--- The player stakes this amount on the choice, or moves their stake: true when recorded.
function Changes.Place(betId, choiceId, amount)
    return changes.Submit({ kind = "stake", betId = betId, choiceId = choiceId, amount = amount }) ~= nil
end

--- The player takes their stake back: true when recorded.
function Changes.Withdraw(betId)
    return changes.Submit({ kind = "withdraw", betId = betId }) ~= nil
end

--- An officer opens a bet: its question, its choices, its closing (date and time as on Discord's /vxv_pari) and the
--- reason the journal keeps. True when recorded; the website checks the rights.
function Changes.Open(bet)
    return changes.Submit({ kind = "bet", title = bet.title, choices = bet.choices, date = bet.date, time = bet.time,
        reason = bet.reason }) ~= nil
end

--- The bets the player opened, waiting for the website, oldest first.
function Changes.Openings()
    local openings = {}
    for _, change in pairs(changes.Pending()) do
        if change.kind == "bet" then
            openings[#openings + 1] = change
        end
    end
    table.sort(openings, function(left, right)
        return left.at < right.at
    end)
    return openings
end

-- The bets' data bring the website's answers: no outbox keeps those changes, and the player learns a refusal.
VXV.On("paris.updated", function(data)
    for id, result in pairs(data.results) do
        local change = changes.Settle(id, result)
        if change ~= nil and change.betId ~= nil then
            answers[change.betId] = { accepted = result.accepted, message = result.message }
        end
    end
    VXV.Emit("paris.changes")
end)
