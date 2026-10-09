local _, ns = ...

--- The quests an officer publishes in game, as with Discord's /vxv_mission: each waits for the website ("en
--- attente") until the quests' data bring back what became of it; the core sends it to the website
--- (VXV.PendingChanges). A change: { kind = "mission", type, title (empty: the type's), reward, days, reason }.
local Changes = {}
ns.Changes = Changes

local QuestsData = ns.QuestsData

local DONE = "Site VXV : %s"
local REFUSED = "Site VXV, refusé : %s"
local FIELDS = {
    mission = { type = "string", title = "string", reward = "number", days = "number", reason = "string" },
}

local changes = VXV.PendingChanges({
    message = "quetes.change",
    fields = FIELDS,
    canRelay = function()
        return QuestsData.IsOfficer(VXV.PlayerName())
    end,
    changed = function() end,
})

--- Takes the module's saved data at start-up: the quests still waiting for the website.
Changes.Restore = changes.Restore

--- An officer publishes a quest: { type, title, reward, days, reason }. True when recorded; the website checks the
--- rights.
function Changes.Publish(quest)
    return changes.Submit({ kind = "mission", type = quest.type, title = quest.title, reward = quest.reward,
        days = quest.days, reason = quest.reason }) ~= nil
end

-- The quests' data bring the website's answers: the player learns them, and no outbox keeps those changes.
VXV.On("quetes.updated", function(data)
    for id, result in pairs(data.results) do
        if changes.Settle(id) ~= nil then
            VXV.Print((result.accepted and DONE or REFUSED):format(result.message))
        end
    end
end)
