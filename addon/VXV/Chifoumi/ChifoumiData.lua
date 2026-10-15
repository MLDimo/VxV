local ns = select(2, ...).Chifoumi

--- The Chi Fou Mi as the website exports them (contract VXV-CHIFOUMIS-2,
--- packages/server/src/domain/addonGames.ts), brought by the player's companion or passed on by an officer's addon:
--- the members in debt, those without the role « Membre » on Discord, the members' portraits, the games not paid yet
--- and the latest games.
local ChifoumiData = VXV.SiteData({
    name = "chifoumi",
    header = "VXV-CHIFOUMIS-2",
    New = function()
        return { barred = {}, newcomers = {}, portraits = {}, unpaid = {}, latest = {} }
    end,
    lines = {
        -- X;member id
        X = { 1, function(data, f)
            data.barred[f[1]] = true
            return true
        end },
        -- N;member id
        N = { 1, function(data, f)
            data.newcomers[f[1]] = true
            return true
        end },
        -- A;member id;portrait
        A = { 2, function(data, f)
            data.portraits[f[1]] = f[2]
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
ns.ChifoumiData = ChifoumiData

--- The file of the character's member's portrait, or nil without the website's data or a portrait.
function ChifoumiData.PortraitOf(name)
    local data = ChifoumiData.Current()
    local memberId = name ~= nil and VXV.MemberOf(data, name) or nil
    return memberId and VXV.RankingBoard.Avatar(data.portraits[memberId]) or nil
end
