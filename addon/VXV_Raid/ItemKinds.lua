local _, ns = ...

--- What the game says of the raids' items (owner's decision of 10 October): the class, subclass and equip slot of
--- every item of the data packs, read in game and kept for the companion as VXV-OBJETS-1
--- (packages/server/src/domain/itemKinds.ts); the website knows from them who may equip each. The client caches an
--- item once asked for it: the items it does not have yet are read again a little later.
local ItemKinds = {}
ns.ItemKinds = ItemKinds

local Compat = VXV.Compat

local HEADER = "VXV-OBJETS-1"
local KIND, KEY = "objets", "raids"
-- Positions of the equip slot, class and subclass among C_Item.GetItemInfo's results (after Compat's "ok").
local SLOT_RESULT, CLASS_RESULT, SUBCLASS_RESULT = 10, 13, 14
local FIRST_READ_SECONDS, RETRY_SECONDS, RETRIES = 5, 10, 6

--- Every item of the data packs, once each, in order.
local function itemIds()
    local ids, seen = {}, {}
    for _, raid in pairs(VXV_RaidData or {}) do
        for _, boss in ipairs(raid.bosses) do
            for _, item in ipairs(boss.loot) do
                if not seen[item.itemId] then
                    seen[item.itemId] = true
                    ids[#ids + 1] = item.itemId
                end
            end
        end
    end
    table.sort(ids)
    return ids
end

local function readable(value, kind)
    return not VXV.IsSecret(value) and type(value) == kind
end

--- An item's line, or nil while the client has not cached it.
local function lineOf(itemId)
    local results = { Compat.GetItemInfo(itemId) }
    local slot, class, subclass = results[SLOT_RESULT], results[CLASS_RESULT], results[SUBCLASS_RESULT]
    if not results[1] or not readable(slot, "string") or not readable(class, "number")
        or not readable(subclass, "number") then
        return nil
    end
    return table.concat({ "I", itemId, class, subclass, slot }, ";")
end

--- Reads every item of the packs and keeps the text for the companion; reads again, a few times, while some items
--- are not cached yet.
local function read(retries)
    local lines, missing = { HEADER }, false
    for _, itemId in ipairs(itemIds()) do
        local line = lineOf(itemId)
        lines[#lines + 1] = line
        missing = missing or line == nil
    end
    if #lines > 1 then
        VXV.Emit("sync.put", KIND, KEY, table.concat(lines, "\n"))
    end
    if missing and retries > 0 then
        C_Timer.After(RETRY_SECONDS, function()
            read(retries - 1)
        end)
    end
end

--- Reads the raids' items a few seconds after login.
function ItemKinds.Start()
    C_Timer.After(FIRST_READ_SECONDS, function()
        read(RETRIES)
    end)
end
