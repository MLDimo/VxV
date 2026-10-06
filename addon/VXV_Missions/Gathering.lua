local _, ns = ...

--- The gatherings the addon counts itself (owner's decision of 6 October): on WoW Forever the game keeps no count of
--- the herbs, ores and skins gathered. A loot window holding a herb, an ore (or stone) or a leather is one gathering
--- of that kind, however many items it holds. Only what is gathered while the addon runs counts.
local Gathering = {}
ns.Gathering = Gathering

-- The game's item classes: trade goods, and their subclasses for herbs, metal and stone, leather.
local TRADE_GOODS = 7
local KINDS = { [9] = "herbalism", [7] = "mining", [6] = "skinning" }
-- Positions of the class and subclass among C_Item.GetItemInfo's results (after Compat's "ok").
local CLASS_RESULT, SUBCLASS_RESULT = 13, 14

local saved = { gathered = {} }

--- Takes the module's saved data at start-up: the account's characters' gatherings, by kind.
function Gathering.Restore(data)
    saved = data
    saved.gathered = type(saved.gathered) == "table" and saved.gathered or {}
end

--- How many gatherings of this kind the character made since VXV counts them.
function Gathering.Count(name, kind)
    local counts = name ~= nil and saved.gathered[name] or nil
    return counts ~= nil and counts[kind] or 0
end

--- The kind of gathering an item comes from, or nil (an item not in the client's cache yet counts for nothing).
local function kindOf(link)
    local results = { VXV.Compat.GetItemInfo(link) }
    if not results[1] or results[CLASS_RESULT] ~= TRADE_GOODS then
        return nil
    end
    return KINDS[results[SUBCLASS_RESULT]]
end

VXV.OnEvent("LOOT_OPENED", function()
    local name = VXV.PlayerName()
    if name == nil then
        return
    end
    local kinds = {}
    for slot = 1, GetNumLootItems() do
        local link = GetLootSlotLink(slot)
        local kind = type(link) == "string" and not VXV.IsSecret(link) and kindOf(link)
        if kind then
            kinds[kind] = true
        end
    end
    if next(kinds) == nil then
        return
    end
    saved.gathered[name] = saved.gathered[name] or {}
    for kind in pairs(kinds) do
        saved.gathered[name][kind] = (saved.gathered[name][kind] or 0) + 1
    end
    VXV.Emit("quetes.gathered")
end)
