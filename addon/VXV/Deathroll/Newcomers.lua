local ns = select(2, ...).Deathroll

--- The members without the guild's Discord role « Membre », as the website knows them (decision of 10 October): no
--- deathroll nor bet on a game for them, so that a newcomer brings no gold from RMT into the guild's games.
local Newcomers = {}
ns.Newcomers = Newcomers

local DeathrollData = ns.DeathrollData

--- Whether the website says the character's member lacks the role « Membre »; without its data, nobody does.
function Newcomers.Is(name)
    local data = DeathrollData.Current()
    local memberId = name ~= nil and VXV.MemberOf(data, name) or nil
    return memberId ~= nil and data.newcomers[memberId] == true
end
