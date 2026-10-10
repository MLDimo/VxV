local ns = select(2, ...).Sync

--- The player's character as the game draws it, for the avatars of the website and the addon: race and sex, which
--- the game tells about other players only within a group.
local Character = {}
ns.Character = Character

local Outbox = ns.Outbox

--- Keeps the character the player logged in with.
function Character.Record()
    local name = VXV.PlayerName()
    local _, race = UnitRace("player")
    local sex = UnitSex("player")
    if name ~= nil and type(race) == "string" and type(sex) == "number" then
        Outbox.Put("characters", name, { race = race, sex = sex })
    end
end
