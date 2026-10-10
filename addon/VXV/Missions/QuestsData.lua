local ns = select(2, ...).Missions

local function class(token)
    return token ~= "" and token or nil
end

--- The missions as the website exports them (contract VXV-QUETES-2, packages/server/src/domain/addonMissions.ts),
--- brought by the player's companion or passed on by an officer's addon (the core's site data), with the answers to
--- the quests published in game.
ns.QuestsData = VXV.SiteData({
    name = "quetes",
    header = "VXV-QUETES-2",
    New = function()
        return { missions = {}, byId = {}, hallOfFame = {}, results = {} }
    end,
    lines = {
        Q = { 7, function(data, f)
            local closedAt = tonumber(f[5])
            local mission = { id = f[1], kind = f[2], startsAt = tonumber(f[3]), endsAt = tonumber(f[4]),
                closedAt = closedAt ~= 0 and closedAt or nil, reward = tonumber(f[6]), title = f[7], scores = {},
                rewards = {} }
            data.missions[#data.missions + 1] = mission
            data.byId[mission.id] = mission
            return mission.startsAt ~= nil and mission.endsAt ~= nil and mission.reward ~= nil
        end },
        R = { 6, function(data, f)
            local mission = data.byId[f[1]]
            local score, reachedAt = tonumber(f[5]), tonumber(f[6])
            if mission == nil or score == nil or reachedAt == nil then
                return false
            end
            mission.scores[#mission.scores + 1] = { memberId = f[2], name = f[3], class = class(f[4]), score = score,
                reachedAt = reachedAt }
            return true
        end },
        W = { 5, function(data, f)
            local mission = data.byId[f[1]]
            local rank, amount = tonumber(f[2]), tonumber(f[4])
            if mission == nil or rank == nil or amount == nil then
                return false
            end
            mission.rewards[#mission.rewards + 1] = { rank = rank, name = f[3], amount = amount, paid = f[5] == "1" }
            return true
        end },
        F = { 5, function(data, f)
            local wins, gains, position = tonumber(f[3]), tonumber(f[4]), tonumber(f[5])
            data.hallOfFame[#data.hallOfFame + 1] = { name = f[1], class = class(f[2]), wins = wins, gains = gains,
                position = position }
            return wins ~= nil and gains ~= nil and position ~= nil
        end },
        -- C;change id;1 when done;message
        C = { 3, function(data, f)
            data.results[f[1]] = { accepted = f[2] == "1", message = f[3] }
            return true
        end },
    },
})
