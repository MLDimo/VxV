local _, ns = ...

--- The missions brought by the player's companion (VXV_Sync): kept when newer, then passed on to the guild when the
--- player is an officer.
local QuestsData, Quests = ns.QuestsData, ns.Quests

VXV.On("sync.inbox", function(inbox)
    if type(inbox.quetes) == "string" and QuestsData.FromCompanion(inbox.quetes)
        and QuestsData.IsOfficer(VXV.PlayerName()) then
        Quests.Sharing.Send()
    end
end)
