local _, addon = ...

--- The addon's private namespaces, one per part (the folders of the addon): each file takes its own part's,
--- "local ns = select(2, ...).Raid", and sees the other parts only through the core's public API, the VXV global
--- (Core/Api.lua).
local PARTS = { "Core", "Sync", "Raid", "Paris", "Deathroll", "Missions",
    "Titles", "Artisans", "Ranking", "PvP" }
for _, part in ipairs(PARTS) do
    addon[part] = {}
end
