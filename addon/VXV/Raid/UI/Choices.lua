local ns = select(2, ...).Raid

--- The player's soft reserves and an officer's exclusions, chosen in game (P7.5) among the loot of the event's
--- raids, then sent to the website as changes.
local Choices = {}
ns.Choices = Choices

local Changes, EventData, ItemChoice, RaidData, Raids = ns.Changes, ns.EventData, ns.ItemChoice, ns.RaidData, ns.Raids

local function sortedIds(set)
    local ids = {}
    for itemId in pairs(set) do
        ids[#ids + 1] = itemId
    end
    table.sort(ids)
    return ids
end

local function setOf(itemIds)
    local set = {}
    for _, itemId in ipairs(itemIds) do
        set[itemId] = true
    end
    return set
end

--- The player's reserves: those waiting for the website, else those it knows.
local function myReserves(event, player)
    local pending = Changes.Pending("reserves")
    if pending ~= nil then
        return setOf(pending.itemIds)
    end
    local itemIds = {}
    for _, reserve in ipairs((EventData.SignupOf(event, player) or { reserves = {} }).reserves) do
        itemIds[#itemIds + 1] = reserve.itemId
    end
    return setOf(itemIds)
end

local function excluded(event)
    local set = {}
    for itemId, item in pairs(event.items) do
        if item.excluded then
            set[itemId] = true
        end
    end
    return set
end

--- The class of the player's character: its sign-up's, else the game's.
local function playerClass(event, player)
    local signup = EventData.SignupOf(event, player)
    if signup ~= nil and signup.class ~= "" then
        return signup.class
    end
    local _, class = UnitClass("player")
    return not VXV.IsSecret(class) and class or nil
end

--- The loot of the event's raids the player's character may equip.
local function equippable(event, player)
    local class, items = playerClass(event, player), {}
    for _, item in ipairs(Raids.Loot(event.raidIds)) do
        if EventData.CanEquip(event, item.itemId, class) then
            items[#items + 1] = item
        end
    end
    return items
end

--- True when the player may choose reserves: signed up (or waiting for it), before the lock.
function Choices.CanReserve(event, player)
    return event ~= nil and time() < RaidData.LockAt(event)
        and (EventData.SignupOf(event, player) ~= nil or Changes.Pending("signup") ~= nil)
end

--- "Mes SR": the loot of the event's raids the player's character may equip, excluded items left aside, within the
--- allowance; the reserves of the player's last raid on the same raids may be chosen again in one click.
function Choices.Reserves()
    local event, player = RaidData.Current(), VXV.PlayerName()
    if not Choices.CanReserve(event, player) then
        return
    end
    local allowance = event.softReservesPerPlayer
    local reusable = (EventData.SignupOf(event, player) or {}).reusable
    ItemChoice.Open({
        title = "Mes SR",
        items = equippable(event, player),
        chosen = myReserves(event, player),
        limit = allowance,
        disabled = excluded(event),
        disabledLabel = "exclu",
        counter = function(count)
            return string.format("%d / %s", count, VXV.Count(allowance, "SR", "SR"))
        end,
        onSend = function(chosen)
            Changes.Submit({ kind = "reserves", itemIds = sortedIds(chosen) })
        end,
        reuse = reusable and { label = "Réutiliser mes SR précédentes", itemIds = reusable } or nil,
    })
end

--- An officer's exclusions: each item excluded or allowed again is a change, with the same reason.
function Choices.Exclusions()
    local event = RaidData.Current()
    if event == nil then
        return
    end
    local before = excluded(event)
    ItemChoice.Open({
        title = "Objets exclus des SR",
        items = Raids.Loot(event.raidIds),
        chosen = before,
        disabled = {},
        counter = function(count)
            return VXV.Count(count, "objet exclu", "objets exclus")
        end,
        reasonNeeded = true,
        onSend = function(chosen, reason)
            for _, itemId in ipairs(sortedIds(chosen)) do
                if not before[itemId] then
                    Changes.Submit({ kind = "exclusion", itemId = itemId, excluded = true, reason = reason })
                end
            end
            for _, itemId in ipairs(sortedIds(before)) do
                if not chosen[itemId] then
                    Changes.Submit({ kind = "exclusion", itemId = itemId, excluded = false, reason = reason })
                end
            end
        end,
    })
end
