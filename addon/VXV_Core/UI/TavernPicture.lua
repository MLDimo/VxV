local _, ns = ...

--- The tavern's picture of the day: dressed up for a WoW holiday (Tokens.seasons, the days written by
--- packages/design/src/seasons.ts), else the tavern of every day. The places stay where they are on every picture.
local TavernPicture = {}
ns.TavernPicture = TavernPicture

local Theme, Tokens = ns.Theme, ns.Tokens

local EVERY_DAY = Theme.MEDIA .. "taverne.png"
local SEASONS = Theme.MEDIA .. "Tavernes\\"

--- The picture's file for today, the player's own day.
function TavernPicture.Path()
    local today = tonumber(date("%Y%m%d"))
    for _, season in ipairs(Tokens.seasons) do
        if today >= season.from and today <= season.to then
            return SEASONS .. season.id .. ".png"
        end
    end
    return EVERY_DAY
end
