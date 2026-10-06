local _, ns = ...

--- Stakes made in game (P11.8): placed, moved or taken back, each waits for the website ("en attente") until the
--- bets' data bring back what became of it; the core sends it to the website (VXV.PendingChanges). A change:
--- { kind = "stake", betId, choiceId, amount } or { kind = "withdraw", betId }.
local Stakes = {}
ns.Stakes = Stakes

local BetsData = ns.BetsData

local DONE = "Site VXV : %s"
local REFUSED = "Site VXV, mise refusée : %s"
local FIELDS = {
    stake = { betId = "string", choiceId = "string", amount = "number" },
    withdraw = { betId = "string" },
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

--- Takes the module's saved data at start-up: the stakes still waiting, and the last answer on each bet.
function Stakes.Restore(data)
    changes.Restore(data)
    data.answers = type(data.answers) == "table" and data.answers or {}
    answers = data.answers
end

--- The player's change on the bet waiting for the website, the newest one; nil without.
function Stakes.Pending(betId)
    local found
    for _, change in pairs(changes.Pending()) do
        if change.betId == betId and (found == nil or change.at > found.at) then
            found = change
        end
    end
    return found
end

--- The website's last answer to the player's stake on the bet: { accepted, message }, or nil.
function Stakes.Answer(betId)
    return answers[betId]
end

--- The player stakes this amount on the choice, or moves their stake: true when recorded.
function Stakes.Place(betId, choiceId, amount)
    return changes.Submit({ kind = "stake", betId = betId, choiceId = choiceId, amount = amount }) ~= nil
end

--- The player takes their stake back: true when recorded.
function Stakes.Withdraw(betId)
    return changes.Submit({ kind = "withdraw", betId = betId }) ~= nil
end

-- The bets' data bring the website's answers: the player learns them, and no outbox keeps those changes.
VXV.On("paris.updated", function(data)
    for id, result in pairs(data.results) do
        local change = changes.Settle(id)
        if change ~= nil then
            answers[change.betId] = { accepted = result.accepted, message = result.message }
            VXV.Print((result.accepted and DONE or REFUSED):format(result.message))
        end
    end
    VXV.Emit("paris.changes")
end)
