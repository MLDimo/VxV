local ns = select(2, ...).Raid

--- The next boss of the raid (P8.1), from the raids' data packs: in the instance of a raid, its first boss not killed
--- yet at this event (the kills of the raid's log, in the pack's order); elsewhere, the first boss still standing
--- among the event's raids, in their order. An event that chains two instances has a next boss in each.
local NextBoss = {}
ns.NextBoss = NextBoss

local Raids, Reserves = ns.Raids, ns.Reserves

local TITLE = "Tu as une SR sur le prochain boss"

--- { raid, boss, fallen, here }: here when the player is in that raid's instance; boss nil once all fell there.
--- Nil without a data pack for the instance nor for the event's raids.
function NextBoss.Find(event, kills)
    local raid = Raids.Current()
    if raid ~= nil then
        local boss, fallen = Raids.Progress(raid, kills)
        return { raid = raid, boss = boss, fallen = fallen, here = true }
    end
    for _, raidId in ipairs(event and event.raidIds or {}) do
        local pack = Raids.ById(raidId)
        if pack ~= nil then
            local boss, fallen = Raids.Progress(pack, kills)
            if boss ~= nil then
                return { raid = pack, boss = boss, fallen = fallen, here = false }
            end
        end
    end
end

--- The boss's items the player reserved: { title, text } for the alert, or nil when none.
function NextBoss.Warning(event, player, boss)
    if event == nil or boss == nil then
        return nil
    end
    local mine = {}
    for _, item in ipairs(boss.loot) do
        for _, reserver in ipairs(Reserves.For(event, item.itemId)) do
            if reserver.signup.name == player then
                mine[#mine + 1] = item.name .. (reserver.bonus > 0 and (" · SR+ " .. reserver.bonus) or "")
            end
        end
    end
    if #mine == 0 then
        return nil
    end
    return { title = TITLE, text = boss.name .. " · " .. table.concat(mine, " · ") }
end
