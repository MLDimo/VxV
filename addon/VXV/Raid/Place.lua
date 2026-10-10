local ns = select(2, ...).Raid

--- Where the player stands: the raid of the instance, from the data packs (P8). Entering an instance fires no event
--- measured on Forever, so it is read every few seconds; "raid.place" (the raid, or nil) follows each change.
local Place = {}
ns.Place = Place

local Raids = ns.Raids

local CHECK_EVERY_SECONDS = 5

local current

--- The raid whose instance the player stands in, as last read, or nil.
function Place.Current()
    return current
end

local function check()
    local raid = Raids.Current()
    if raid ~= current then
        current = raid
        VXV.Emit("raid.place", raid)
    end
end

local function checkAgain()
    check()
    C_Timer.After(CHECK_EVERY_SECONDS, checkAgain)
end

--- From login on: now, then every few seconds.
function Place.Start()
    checkAgain()
end
