local _, ns = ...

local NONE = ""

--- An empty field of the format is nil.
local function optional(value)
    return value ~= NONE and value or nil
end

--- The PvP as the website exports it (contract VXV-PVP-2, packages/server/src/domain/addonPvp.ts), brought by the
--- player's companion or passed on by an officer's addon (the core's site data): the PvP events to come and their
--- sign-ups, the duelists, the duels, the Elo ranking and the duels' records, and the answers to the changes made in
--- game.
ns.PvpData = VXV.SiteData({
    name = "pvp",
    header = "VXV-PVP-2",
    New = function()
        return { outings = {}, outingById = {}, players = {}, duels = {}, duelById = {}, ranking = {}, records = {},
            results = {} }
    end,
    lines = {
        -- E;event id;start;title;who may sign up
        E = { 4, function(data, f)
            local outing = { id = f[1], startsAt = tonumber(f[2]), title = f[3], audience = f[4], signups = {} }
            data.outings[#data.outings + 1] = outing
            data.outingById[outing.id] = outing
            return outing.startsAt ~= nil
        end },
        -- S;event id;character;class;role;status;spec
        S = { 6, function(data, f)
            local outing = data.outingById[f[1]]
            if outing == nil then
                return false
            end
            outing.signups[#outing.signups + 1] = { name = f[2], class = f[3], role = f[4], status = f[5],
                spec = f[6] }
            return true
        end },
        -- U;member id;name;class, empty without main;portrait, empty without one
        U = { 4, function(data, f)
            data.players[f[1]] = { name = f[2], class = optional(f[3]), avatar = optional(f[4]) }
            return true
        end },
        -- D;duel id;status;time;place;challenger;opponent;winner;bet id
        D = { 8, function(data, f)
            local duel = { id = f[1], status = f[2], scheduledAt = tonumber(f[3]), place = f[4], challengerId = f[5],
                opponentId = f[6], winnerId = optional(f[7]), betId = optional(f[8]) }
            data.duels[#data.duels + 1] = duel
            data.duelById[duel.id] = duel
            return duel.scheduledAt ~= nil
        end },
        -- R;rank;member id;Elo;won;played
        R = { 5, function(data, f)
            local entry = { rank = tonumber(f[1]), memberId = f[2], rating = tonumber(f[3]), won = tonumber(f[4]),
                played = tonumber(f[5]) }
            data.ranking[#data.ranking + 1] = entry
            return entry.rank ~= nil and entry.rating ~= nil and entry.won ~= nil and entry.played ~= nil
        end },
        -- K;label;value as written;member id (the duels' records)
        K = { 3, function(data, f)
            data.records[#data.records + 1] = { label = f[1], value = f[2], memberId = f[3] }
            return true
        end },
        -- C;change id;1 when done;message
        C = { 3, function(data, f)
            data.results[f[1]] = { accepted = f[2] == "1", message = f[3] }
            return true
        end },
    },
})
