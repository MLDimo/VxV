local _, ns = ...

--- The deathrolls as the website exports them (contract VXV-DEATHROLLS-1,
--- packages/server/src/domain/addonDeathrolls.ts), brought by the player's companion or passed on by an officer's
--- addon: the members in debt, the games not paid yet and the latest games.
local DeathrollData = VXV.SiteData({
    name = "deathroll",
    header = "VXV-DEATHROLLS-1",
    New = function()
        return { barred = {}, unpaid = {}, latest = {} }
    end,
    lines = {
        -- X;member id
        X = { 1, function(data, f)
            data.barred[f[1]] = true
            return true
        end },
        -- D;game id;loser's member id;loser;winner's member id;winner;stake;ended
        D = { 7, function(data, f)
            local stake, endedAt = tonumber(f[6]), tonumber(f[7])
            data.unpaid[#data.unpaid + 1] = { id = f[1], loserId = f[2], loser = f[3], winnerId = f[4], winner = f[5],
                stake = stake, endedAt = endedAt }
            return stake ~= nil and endedAt ~= nil
        end },
        -- H;game id;winner;loser;stake;ended
        H = { 5, function(data, f)
            local stake, endedAt = tonumber(f[4]), tonumber(f[5])
            data.latest[#data.latest + 1] = { id = f[1], winner = f[2], loser = f[3], stake = stake, endedAt = endedAt }
            return stake ~= nil and endedAt ~= nil
        end },
    },
})
ns.DeathrollData = DeathrollData
