local ns = select(2, ...).Fishing

--- What the player holds and carries for fishing: the fishing pole and the lures of the bags, and the weapons kept
--- while fishing, saved until they are given back (a /reload in a session gives them back at the next login).
local Gear = {}
ns.Gear = Gear

local Compat = VXV.Compat

Gear.MAIN_HAND, Gear.OFF_HAND = 16, 17
local FIRST_BAG, LAST_BAG = 0, 4
local WEAPON_CLASS, FISHING_POLE_SUBCLASS = 2, 20
-- Positions of the class and subclass among Compat.GetItemInfoInstant's results, pcall's ok first.
local CLASS_INDEX, SUBCLASS_INDEX = 7, 8
-- Positions of the name, the quality and the icon among Compat.GetItemInfo's results, pcall's ok first.
local NAME_INDEX, QUALITY_INDEX, ICON_INDEX = 2, 4, 11
-- Classic's lures, the best first: Aquadynamic Fish Attractor and Bright Baubles (+100), Flesh Eating Worm (+75),
-- Aquadynamic Fish Lens (+50), Nightcrawlers and Shiny Bauble (+25).
local LURES = { 6533, 6532, 7307, 6811, 6530, 6529 }
local MS_PER_SECOND = 1000

local saved = {}

--- Takes the module's saved data: the weapons kept by a session, if any.
function Gear.Load(data)
    saved = data
end

--- The value of a call through Compat, unless it failed or the client hides it.
local function value(ok, result)
    if ok and not VXV.IsSecret(result) then
        return result
    end
end

local function isPole(itemId)
    if itemId == nil then
        return false
    end
    local info = { Compat.GetItemInfoInstant(itemId) }
    return info[1] == true and info[CLASS_INDEX] == WEAPON_CLASS and info[SUBCLASS_INDEX] == FISHING_POLE_SUBCLASS
end

--- The item ids of the bags, in their order.
local function bagItems()
    local items = {}
    for bag = FIRST_BAG, LAST_BAG do
        for slot = 1, tonumber(value(Compat.GetContainerNumSlots(bag))) or 0 do
            local itemId = value(Compat.GetContainerItemID(bag, slot))
            if itemId ~= nil then
                items[#items + 1] = itemId
            end
        end
    end
    return items
end

--- The item in a hand (Gear.MAIN_HAND, Gear.OFF_HAND), or nil.
function Gear.InHand(slot)
    return value(Compat.GetInventoryItemID("player", slot))
end

--- Whether the player holds a fishing pole.
function Gear.HoldsPole()
    return isPole(Gear.InHand(Gear.MAIN_HAND))
end

--- The fishing pole in hand or the first one of the bags, or nil.
function Gear.Pole()
    if Gear.HoldsPole() then
        return Gear.InHand(Gear.MAIN_HAND)
    end
    for _, itemId in ipairs(bagItems()) do
        if isPole(itemId) then
            return itemId
        end
    end
end

--- The best lure of the bags, or nil.
function Gear.Lure()
    local carried = {}
    for _, itemId in ipairs(bagItems()) do
        carried[itemId] = true
    end
    for _, itemId in ipairs(LURES) do
        if carried[itemId] then
            return itemId
        end
    end
end

--- An item's { name, quality, icon }, the name nil while the client has not cached it.
function Gear.Describe(item)
    local info = { Compat.GetItemInfo(item) }
    if info[1] ~= true then
        return {}
    end
    return { name = info[NAME_INDEX], quality = info[QUALITY_INDEX], icon = info[ICON_INDEX] }
end

--- The weapons kept while fishing, { main, off } item ids, or nil.
function Gear.Weapons()
    return saved.weapons
end

--- Keeps the weapons in hand (unless a pole is already there), then equips the pole.
function Gear.TakePole(pole)
    if not Gear.HoldsPole() then
        saved.weapons = { main = Gear.InHand(Gear.MAIN_HAND), off = Gear.InHand(Gear.OFF_HAND) }
    end
    Compat.EquipItemByName(pole)
end

--- Equips the weapons kept again; they stay kept until Forget (a fight may refuse them).
function Gear.GiveBack()
    local weapons = saved.weapons
    if weapons == nil then
        return
    end
    if weapons.main ~= nil then
        Compat.EquipItemByName(weapons.main)
    end
    if weapons.off ~= nil then
        Compat.EquipItemByName(weapons.off, Gear.OFF_HAND)
    end
end

--- Whether the weapon kept is in hand again (true when none was kept).
function Gear.WeaponsBack()
    local weapons = saved.weapons
    return weapons == nil or weapons.main == nil or Gear.InHand(Gear.MAIN_HAND) == weapons.main
end

--- Forgets the weapons kept, once given back.
function Gear.Forget()
    saved.weapons = nil
end

--- The seconds left of the lure on the pole in hand, or nil without one.
function Gear.LureLeft()
    local ok, hasLure, expiration = Compat.GetWeaponEnchantInfo()
    if ok and hasLure == true and type(expiration) == "number" and Gear.HoldsPole() then
        return math.floor(expiration / MS_PER_SECOND)
    end
end
