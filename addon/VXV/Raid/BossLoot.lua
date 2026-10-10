local ns = select(2, ...).Raid

--- The loot of the boss just killed. The master looter's addon reads the corpse when it opens and sends the items
--- to the group; every member's addon shows them with the soft reserves set on them, and who received each one.
local BossLoot = {}
ns.BossLoot = BossLoot

local Group = ns.Group

local DROP = "loot.drop"

local lastKill
local current

local function isMasterLooter()
    local ok, yes = VXV.Compat.IsMasterLooter()
    return ok and yes == true
end

--- Unit of the master looter: the party gives an index from 0 (the player), the raid a raid index.
local function masterLooterUnit(partyMaster, raidMaster)
    if type(raidMaster) == "number" then
        return "raid" .. raidMaster
    end
    if partyMaster == 0 then
        return "player"
    end
    return type(partyMaster) == "number" and ("party" .. partyMaster) or nil
end

--- Name of the group's master looter, or nil without one.
function BossLoot.MasterLooter()
    local ok, _, partyMaster, raidMaster = VXV.Compat.GetLootMethod()
    local unit = ok and masterLooterUnit(partyMaster, raidMaster)
    return unit and VXV.NameOfUnit(unit) or nil
end

--- The items of the open corpse that have a link: { slot, itemId, link }.
local function readCorpse()
    local items = {}
    for slot = 1, GetNumLootItems() do
        local link = GetLootSlotLink(slot)
        local itemId = type(link) == "string" and not VXV.IsSecret(link) and tonumber(link:match("item:(%d+)"))
        if itemId then
            items[#items + 1] = { slot = slot, itemId = itemId, link = link }
        end
    end
    return items
end

--- The current loot: { encounterId, boss, items, looter }, or nil before the first boss. Each item: { index (its
--- place in the list, the same for every member), slot (in the master looter's open corpse, nil once it left it),
--- itemId, link, given = { winner, method } once given }.
function BossLoot.Current()
    return current
end

--- The item at this place of the list was given: every member shows it.
function BossLoot.MarkGiven(index, winner, method)
    local item = current and current.items[index]
    if item ~= nil then
        item.given = { winner = winner, method = method }
        VXV.Emit("loot.given", item)
    end
end

--- The corpse opened again: the game numbers the items left from 1, so each item takes its new slot, or none once it
--- left the corpse.
local function renumber(items, corpse)
    local taken = {}
    for _, item in ipairs(items) do
        local slot
        for index, found in ipairs(corpse) do
            if not taken[index] and found.itemId == item.itemId then
                slot, taken[index] = found.slot, true
                break
            end
        end
        item.slot = slot
    end
end

VXV.OnEvent("ENCOUNTER_END", function(encounterId, boss, _, _, success)
    if (success == 1 or success == true) and not VXV.IsSecret(boss) then
        lastKill = { encounterId = encounterId, boss = boss }
    end
end)

-- The first corpse the master looter opens after a kill is the boss's; opened again, its items take their new slots.
VXV.OnEvent("LOOT_OPENED", function()
    if lastKill == nil or not isMasterLooter() then
        return
    end
    local items = readCorpse()
    if current ~= nil and current.encounterId == lastKill.encounterId then
        renumber(current.items, items)
        return
    end
    if #items > 0 then
        local drop = { encounterId = lastKill.encounterId, boss = lastKill.boss, items = items }
        VXV.Broadcast(DROP, drop, Group.Channel())
    end
end)

local function validItems(items)
    local valid = {}
    for _, item in ipairs(type(items) == "table" and items or {}) do
        if type(item) == "table" and tonumber(item.slot) and tonumber(item.itemId) and type(item.link) == "string" then
            valid[#valid + 1] = { index = #valid + 1, slot = tonumber(item.slot), itemId = tonumber(item.itemId),
                link = item.link }
        end
    end
    return valid
end

-- Only the master looter tells what the boss dropped.
VXV.OnMessage(DROP, function(payload, sender)
    if type(payload) ~= "table" or (sender ~= VXV.PlayerName() and sender ~= BossLoot.MasterLooter()) then
        return
    end
    local items = validItems(payload.items)
    if #items == 0 then
        return
    end
    current = { encounterId = tonumber(payload.encounterId), boss = tostring(payload.boss), items = items,
        looter = sender }
    VXV.Emit("loot.dropped", current)
end)
