local _, ns = ...

--- Describes where the player is when something happens (world, instance, group, combat, boss, lockdown).
local Context = {}
ns.Context = Context

local Util = ns.Util
local encounterName

ns.Events.On("ENCOUNTER_START", function(_, name)
    encounterName = name
end)

ns.Events.On("ENCOUNTER_END", function()
    encounterName = nil
end)

function Context.Describe()
    local inInstance, instanceType = IsInInstance()
    local parts = { inInstance and (Util.Safe(instanceType) .. ":" .. Util.Safe((GetInstanceInfo()))) or "monde" }
    if IsInRaid() then
        parts[#parts + 1] = "raid"
    elseif IsInGroup() then
        parts[#parts + 1] = "groupe"
    end
    if InCombatLockdown() then
        parts[#parts + 1] = "combat"
    end
    if encounterName then
        parts[#parts + 1] = "boss:" .. Util.Safe(encounterName)
    end
    local ok, isLocked = ns.Compat.InChatMessagingLockdown()
    if ok and isLocked then
        parts[#parts + 1] = "verrou-chat"
    end
    return table.concat(parts, ",")
end
