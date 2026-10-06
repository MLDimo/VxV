local _, ns = ...

--- The event's data travel between the guild's addons (the core's shared data): an officer's import goes to every
--- connected member, and a member who logs in asks the officers for newer data.
local RaidData = ns.RaidData

ns.Sharing = VXV.ShareData("raid", {
    Text = RaidData.Text,
    ExportedAt = RaidData.ExportedAt,
    IsOfficer = RaidData.IsOfficer,
    Receive = RaidData.Receive,
})
