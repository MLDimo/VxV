local _, ns = ...

--- What members are told in the chat when data arrive from an officer: a new raid, or the officers' changes.
local Labels = ns.Labels

local NEW_RAID = "Raid chargé par %s : %s, le %s. Tape /vxv pour voir les inscrits et les SR."
-- Data brought by the player's own companion have no sender.
local OWN_COMPANION = "ton compagnon VXV"
local CHANGE = "|cffff8000Modification par %s :|r %s (motif : %s)"
local MORE_CHANGES = "… et %d autres modifications : voir le Journal."
local MAX_CHANGES_SHOWN = 3

local function lastChangeAt(event)
    local last = 0
    for _, entry in ipairs(event.journal) do
        last = math.max(last, entry.at)
    end
    return last
end

local function showChanges(event, previous)
    local since, changes = lastChangeAt(previous), {}
    for _, entry in ipairs(event.journal) do
        if entry.at > since then
            changes[#changes + 1] = entry
        end
    end
    for index = 1, math.min(#changes, MAX_CHANGES_SHOWN) do
        local entry = changes[index]
        VXV.Print(CHANGE:format(entry.actor, entry.summary, entry.reason))
    end
    if #changes > MAX_CHANGES_SHOWN then
        VXV.Print(MORE_CHANGES:format(#changes - MAX_CHANGES_SHOWN))
    end
end

VXV.On("raid.updated", function(event, previous, sender)
    if sender == VXV.PlayerName() then
        return
    end
    if previous == nil or previous.id ~= event.id then
        VXV.Print(NEW_RAID:format(sender or OWN_COMPANION, event.title, Labels.DateTime(event.startsAt)))
    else
        showChanges(event, previous)
    end
end)
