local _, ns = ...

--- The bets brought by the player's companion (VXV_Sync): kept when newer, then passed on to the guild when the
--- player is an officer.
local BetsData, Bets = ns.BetsData, ns.Bets

VXV.On("sync.inbox", function(inbox)
    if type(inbox.paris) == "string" and BetsData.FromCompanion(inbox.paris)
        and BetsData.IsOfficer(VXV.PlayerName()) then
        Bets.Sharing.Send()
    end
end)
