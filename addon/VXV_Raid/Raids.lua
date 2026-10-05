local _, ns = ...

--- The raids' data: each pack VXV_Data_<Raid>, generated from data/raids, registers its raid in the shared global
--- VXV_RaidData, with its instance, its bosses in their usual kill order and their loot.
local Raids = {}
ns.Raids = Raids

-- Position of the instance's id among the results of GetInstanceInfo (measured in phase 0).
local INSTANCE_ID = 8

--- The raid of the instance the player is in, or nil.
function Raids.Current()
    local instanceId = select(INSTANCE_ID, GetInstanceInfo())
    if instanceId == nil or VXV.IsSecret(instanceId) then
        return nil
    end
    for _, raid in pairs(VXV_RaidData or {}) do
        if raid.instanceId == instanceId then
            return raid
        end
    end
end

--- Where the raid stands (kills: { encounterId }): its first boss not killed yet (nil once they all fell), and
--- how many of its bosses fell.
function Raids.Progress(raid, kills)
    local killed = {}
    for _, kill in ipairs(kills) do
        killed[kill.encounterId] = true
    end
    local nextBoss, fallen = nil, 0
    for _, boss in ipairs(raid.bosses) do
        if killed[boss.encounterId] then
            fallen = fallen + 1
        else
            nextBoss = nextBoss or boss
        end
    end
    return nextBoss, fallen
end
