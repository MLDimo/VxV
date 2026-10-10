local ns = select(2, ...).PvP

--- The duels' results the game writes in the system channel (« Ðéjà Vu a vaincu Thom Leboss en duel. »), read with its
--- own formats: a won duel, or one an opponent fled. Phase 0 did not measure them on WoW Forever: absent formats
--- leave the result to the loser's concession. When the player plays a duel of the PvP data, the result goes to the
--- website as a change; the other player's addon sends it too, and the website keeps the first.
local DuelResults = {}
ns.DuelResults = DuelResults

local Changes, PvpData = ns.Changes, ns.PvpData

-- Both formats name the winner first (%1$s) and the loser second (%2$s), whatever their order in the sentence.
local FORMATS = { "DUEL_WINNER_KNOCKOUT", "DUEL_WINNER_RETREAT" }
local WINNER, LOSER = 1, 2
local MAGIC = "[%^%$%(%)%%%.%[%]%*%+%-%?]"

--- A Lua pattern capturing each string of a Blizzard format ("%1$s a vaincu %2$s en duel."), and the argument each
--- capture is, in order.
local function patternOf(format)
    local parts, order, position = { "^" }, {}, 1
    while true do
        local from, to, index = format:find("%%(%d*)%$?s", position)
        if from == nil then
            break
        end
        parts[#parts + 1] = format:sub(position, from - 1):gsub(MAGIC, "%%%0")
        parts[#parts + 1] = "(.+)"
        order[#order + 1] = tonumber(index) or #order + 1
        position = to + 1
    end
    parts[#parts + 1] = format:sub(position):gsub(MAGIC, "%%%0")
    parts[#parts + 1] = "$"
    return table.concat(parts), order
end

--- { winner, loser } ("Prénom Nom") of a system message, or nil when it is no duel's result the client can read.
function DuelResults.Parse(text)
    if type(text) ~= "string" or VXV.IsSecret(text) then
        return nil
    end
    for _, name in ipairs(FORMATS) do
        local format = VXV.Compat.Resolve(name)
        if type(format) == "string" then
            local pattern, order = patternOf(format)
            local captures, names = { text:match(pattern) }, {}
            for index, argument in ipairs(order) do
                names[argument] = captures[index]
            end
            if names[WINNER] ~= nil and names[LOSER] ~= nil then
                return { winner = names[WINNER], loser = names[LOSER] }
            end
        end
    end
    return nil
end

--- The duel to come between the members of these characters, which the player plays; nil without.
function DuelResults.DuelOf(data, result)
    local me = VXV.MemberOf(data)
    local winner, loser = VXV.MemberOf(data, result.winner), VXV.MemberOf(data, result.loser)
    for _, duel in ipairs(data and data.duels or {}) do
        local players = { [duel.challengerId] = true, [duel.opponentId] = true }
        if duel.status == "scheduled" and players[me] and players[winner] and players[loser] and winner ~= loser then
            return duel
        end
    end
    return nil
end

VXV.OnEvent("CHAT_MSG_SYSTEM", function(text)
    local result = DuelResults.Parse(text)
    local duel = result and DuelResults.DuelOf(PvpData.Current(), result)
    if duel ~= nil and Changes.Pending("duelResult", duel.id) == nil then
        Changes.Submit({ kind = "duelResult", duelId = duel.id, winner = result.winner, loser = result.loser })
    end
end)
