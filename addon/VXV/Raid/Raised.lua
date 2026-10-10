local ns = select(2, ...).Raid

--- The resurrections accepted in raid (P13, « Lève toi copaing »): RESURRECT_REQUEST offers one, then PLAYER_ALIVE
--- or PLAYER_UNGHOST follow once the player accepted it, alive again (measured on 3 October). The player raised
--- tells the group, and every member's log counts it.
local Group, RaidLog = ns.Group, ns.RaidLog

local RAISED = "raid.raised"
-- The game's offer of a resurrection lasts a minute: back alive later, the player ran back to their corpse.
local OFFER_SECONDS = 60

-- When the latest offer came, since the player died or released.
local offeredAt

VXV.OnEvent("RESURRECT_REQUEST", function()
    offeredAt = GetTime()
end)

local function backAlive()
    local accepted = offeredAt ~= nil and GetTime() - offeredAt <= OFFER_SECONDS
    -- The offer is used up: accepted, or gone with the corpse when the player released.
    offeredAt = nil
    local log = RaidLog.Current()
    if accepted and not UnitIsDeadOrGhost("player") and log ~= nil and IsInGroup() then
        VXV.Broadcast(RAISED, { eventId = log.eventId }, Group.Channel())
    end
end
VXV.OnEvent("PLAYER_ALIVE", backAlive)
VXV.OnEvent("PLAYER_UNGHOST", backAlive)

VXV.OnMessage(RAISED, function(payload, sender)
    if type(payload) == "table" and Group.Names()[sender] then
        RaidLog.AddRaised(tostring(payload.eventId), sender)
    end
end)
