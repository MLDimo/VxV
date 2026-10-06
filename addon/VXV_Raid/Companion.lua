local _, ns = ...

--- The event's data brought by the player's companion (VXV_Sync, P7.3): kept when newer, then passed on to the
--- guild when the player is an officer, as after an import.
local Companion = {}
ns.Companion = Companion

local RaidData, Sharing = ns.RaidData, ns.Sharing

VXV.On("sync.inbox", function(inbox)
    if type(inbox.raid) == "string" and RaidData.FromCompanion(inbox.raid) and RaidData.IsOfficer(VXV.PlayerName()) then
        Sharing.Send()
    end
end)

--- True when the player's companion brought data at this launch: a /reload brings newer ones.
Companion.Seen = VXV.CompanionSeen
