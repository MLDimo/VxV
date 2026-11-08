local _, ns = ...

--- T12 (8 November): fishing in one button (owner's request). Measures each brick before the feature is written:
--- the fishing pole and the lures in the bags, equipping them without and with a click, the secure buttons and their
--- macros (cast, /interact on the bobber, lure on the pole, /equip), the key bound by the addon and swapped to
--- INTERACTTARGET while fishing, the soft target of the bobber, the cast's events, and what the client still lets the
--- addon do once combat starts. "/vxvtest peche boutons" shows the buttons to click; every step goes to the journal.
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("peche")

-- The fishing spell's ranks in Classic: apprentice, journeyman, expert, artisan.
local FISHING_SPELLS = { 7620, 7731, 7732, 18248 }
-- Classic's lures: Shiny Bauble, Nightcrawlers, Bright Baubles, Aquadynamic Fish Attractor, Aquadynamic Fish Lens,
-- Flesh Eating Worm.
local LURES = { 6529, 6530, 6532, 6533, 6811, 7307 }
-- The fishing profession's skill line (measured on 7 October), and the slots GetProfessions returns.
local FISHING_SKILL_LINE = 356
local PROFESSION_SLOTS = 5
local WEAPON_CLASS, FISHING_POLE_SUBCLASS = 2, 20
local MAIN_HAND, OFF_HAND = 16, 17
local FIRST_BAG, LAST_BAG = 0, 4
-- Positions of the class and subclass among Compat.GetItemInfoInstant's results (pcall's ok first).
local CLASS_INDEX, SUBCLASS_INDEX = 7, 8
local SOFT_TARGET = "softinteract"
local CVARS = {
    "SoftTargetInteract", "SoftTargetIconInteract", "SoftTargetIconGameObject", "SoftTargetInteractArc",
    "SoftTargetInteractRange", "ActionButtonUseKeyDown", "autoLootDefault",
}
-- Values that make the bobber the soft target, with its icon above it.
local INTERACT_ON = { SoftTargetInteract = "3", SoftTargetIconGameObject = "1", SoftTargetIconInteract = "1" }
local EVENTS = {
    "UNIT_SPELLCAST_CHANNEL_START", "UNIT_SPELLCAST_CHANNEL_STOP", "UNIT_SPELLCAST_SUCCEEDED",
    "UNIT_SPELLCAST_FAILED", "UNIT_SPELLCAST_INTERRUPTED", "PLAYER_REGEN_DISABLED", "PLAYER_REGEN_ENABLED",
    "PLAYER_SOFT_INTERACT_CHANGED", "PLAYER_EQUIPMENT_CHANGED", "LOOT_OPENED",
}
local WATCH_SECONDS = 0.5
local CHECK_DELAY_SECONDS = 1
local BUTTON_WIDTH, BUTTON_HEIGHT, GAP = 260, 26, 6

local db = {}
local board
local boundKey, bindingMode
local watcher, lastSoftTarget

local function call(label, fn, ...)
    local ok, problem = fn(...)
    log.Call(label, ok, problem)
    return ok
end

local function first(ok, value)
    return ok and not Util.IsSecret(value) and value or nil
end

local function itemName(itemId)
    return itemId and first(Compat.GetItemInfo(itemId)) or nil
end

local function equipped(slot)
    return first(Compat.GetInventoryItemID("player", slot))
end

--- The fishing spell's name, and the ranks the player knows.
local function fishingSpell()
    local name, known = nil, {}
    for _, spellId in ipairs(FISHING_SPELLS) do
        name = name or first(Compat.GetSpellName(spellId))
        if first(Compat.IsPlayerSpell(spellId)) then
            known[#known + 1] = spellId
        end
    end
    return name, known
end

--- The items of the bags: the first fishing pole and the first lure found, every one journaled.
local function scanBags()
    local pole, lure, lures = nil, nil, {}
    for _, lureId in ipairs(LURES) do
        lures[lureId] = true
    end
    for bag = FIRST_BAG, LAST_BAG do
        for slot = 1, tonumber(first(Compat.GetContainerNumSlots(bag))) or 0 do
            local itemId = first(Compat.GetContainerItemID(bag, slot))
            if itemId then
                local info = { Compat.GetItemInfoInstant(itemId) }
                local isPole = info[1] and info[CLASS_INDEX] == WEAPON_CLASS
                    and info[SUBCLASS_INDEX] == FISHING_POLE_SUBCLASS
                if isPole then
                    pole = pole or itemId
                    log.Ok("canne dans le sac", bag, slot, ":", itemId, itemName(itemId))
                elseif lures[itemId] then
                    lure = lure or itemId
                    log.Ok("appât dans le sac", bag, slot, ":", itemId, itemName(itemId), "sort",
                        Util.Results(Compat.GetItemSpell(itemId)))
                end
            end
        end
    end
    return pole, lure
end

--- The fishing profession's level and maximum, read like the Artisans part reads every profession; nil without it.
local function fishingProfession()
    local slots = { Compat.GetProfessions() }
    for slot = 1, slots[1] and PROFESSION_SLOTS or 0 do
        local index = slots[slot + 1]
        if index ~= nil then
            local ok, name, _, level, max, _, _, skillLine = Compat.GetProfessionInfo(index)
            if ok and skillLine == FISHING_SKILL_LINE then
                return Util.Join(name, level, "/", max, "(case", slot .. ")")
            end
        end
    end
end

local function status()
    local profession = fishingProfession()
    log.Check(profession ~= nil, "métier de pêche (GetProfessions, ligne", FISHING_SKILL_LINE .. ") :", profession)
    local name, known = fishingSpell()
    log.Check(name ~= nil, "sort de pêche :", name, "rangs connus :", table.concat(known, ", "))
    for _, slot in ipairs({ MAIN_HAND, OFF_HAND }) do
        local itemId = equipped(slot)
        log.Info("emplacement", slot, ":", itemId, itemName(itemId))
    end
    log.Info("enchantement temporaire de l'arme (GetWeaponEnchantInfo) :", Util.Results(Compat.GetWeaponEnchantInfo()))
    local pole, lure = scanBags()
    log.Check(pole ~= nil, "canne à pêche dans les sacs :", pole)
    log.Info("appât dans les sacs :", lure)
    for _, cvar in ipairs(CVARS) do
        log.Info("CVar", cvar, ":", Util.Results(Compat.GetCVar(cvar)))
    end
    log.Info("commande /interact (SLASH_INTERACT1) :", Util.Safe(_G.SLASH_INTERACT1))
    for _, event in ipairs(EVENTS) do
        local accepted = ns.Events.IsKnown(event)
        log.Check(accepted, "événement", event, accepted and "accepté" or "refusé")
    end
    log.Info("combat (InCombatLockdown) :", Util.Safe(InCombatLockdown()))
end

local function checkLater(label)
    C_Timer.After(CHECK_DELAY_SECONDS, function()
        log.Info(label, ": main droite", equipped(MAIN_HAND), "main gauche", equipped(OFF_HAND))
    end)
end

--- Keeps the weapons in hand, then equips the fishing pole.
local function equipPole()
    local pole = scanBags()
    if pole == nil then
        log.Fail("aucune canne à pêche dans les sacs")
        return
    end
    db.mainHand, db.offHand = equipped(MAIN_HAND), equipped(OFF_HAND)
    log.Info("armes gardées :", db.mainHand, itemName(db.mainHand), "/", db.offHand, itemName(db.offHand))
    call("EquipItemByName(canne " .. pole .. ")", Compat.EquipItemByName, pole)
    checkLater("après la canne")
end

--- Equips the weapons kept by "equiper" again.
local function restoreWeapons()
    if db.mainHand == nil then
        log.Fail("aucune arme gardée : /vxvtest peche equiper d'abord")
        return
    end
    call("EquipItemByName(arme " .. db.mainHand .. ")", Compat.EquipItemByName, db.mainHand)
    if db.offHand ~= nil then
        call("EquipItemByName(main gauche " .. db.offHand .. ", 17)", Compat.EquipItemByName, db.offHand, OFF_HAND)
    end
    checkLater("après le retour des armes")
end

--- The macros the buttons try, from what the bags and the spell book hold now.
local function macros()
    local spell = fishingSpell() or "Pêche"
    local _, lure = scanBags()
    local weapon = itemName(db.mainHand)
    return {
        { name = "VXVProbe_FishCast", label = "A. /cast " .. spell, text = "/cast " .. spell },
        { name = "VXVProbe_FishInteract", label = "B. /cast + /interact",
            text = "/cast [nochanneling] " .. spell .. "\n/interact" },
        { name = "VXVProbe_FishLure", label = "C. appât " .. Util.Safe(itemName(lure)),
            text = lure and ("/use " .. itemName(lure) .. "\n/use " .. MAIN_HAND) or nil },
        { name = "VXVProbe_FishEquip", label = "D. /equip " .. Util.Safe(weapon),
            text = weapon and ("/equip " .. weapon) or nil },
    }
end

local function addButton(parent, macro, index)
    local ok, button = pcall(CreateFrame, "Button", macro.name, parent, "SecureActionButtonTemplate")
    if not ok then
        log.Fail("SecureActionButtonTemplate :", Util.Safe(button))
        return
    end
    button:SetSize(BUTTON_WIDTH, BUTTON_HEIGHT)
    button:SetPoint("TOPLEFT", GAP, -GAP - (index - 1) * (BUTTON_HEIGHT + GAP))
    button:RegisterForClicks("AnyUp", "AnyDown")
    local background = button:CreateTexture(nil, "BACKGROUND")
    background:SetAllPoints()
    background:SetColorTexture(0.2, 0.35, 0.25, 1)
    local label = button:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
    label:SetPoint("CENTER")
    label:SetText(macro.text and macro.label or (macro.label .. " (rien à faire)"))
    if macro.text then
        button:SetAttribute("type", "macro")
        button:SetAttribute("macrotext", macro.text)
    end
    button:HookScript("OnClick", function(_, mouseButton, down)
        log.Info("clic", macro.label, mouseButton, down and "appui" or "relâche",
            "combat", Util.Safe(InCombatLockdown()))
    end)
    log.Ok("bouton sécurisé", macro.name, ":", macro.text or "sans macro")
end

local function showButtons()
    if InCombatLockdown() then
        log.Fail("hors combat seulement : un bouton sécurisé ne se crée pas en combat")
        return
    end
    if board ~= nil then
        board:SetShown(not board:IsShown())
        return
    end
    local list = macros()
    board = CreateFrame("Frame", nil, UIParent)
    board:SetSize(BUTTON_WIDTH + 2 * GAP, #list * (BUTTON_HEIGHT + GAP) + GAP)
    board:SetPoint("CENTER", 0, -200)
    board:EnableMouse(true)
    board:SetMovable(true)
    board:RegisterForDrag("LeftButton")
    board:SetScript("OnDragStart", board.StartMoving)
    board:SetScript("OnDragStop", board.StopMovingOrSizing)
    local background = board:CreateTexture(nil, "BACKGROUND")
    background:SetAllPoints()
    background:SetColorTexture(0.05, 0.04, 0.09, 0.9)
    for index, macro in ipairs(list) do
        addButton(board, macro, index)
    end
    log.Info("boutons affichés : A lance, B lance puis ferre, C pose l'appât, D rend l'arme (aussi en combat)")
end

--- Binds the key to a button: "a" swaps it to INTERACTTARGET while fishing, "b" keeps the /interact macro.
local function bindKey(args)
    local key, mode = Util.SplitFirst(args)
    if board == nil then
        log.Fail("/vxvtest peche boutons d'abord")
        return
    end
    call("ClearOverrideBindings", Compat.ClearOverrideBindings, board)
    boundKey, bindingMode = nil, nil
    if key == "" then
        log.Info("touche rendue au joueur")
        return
    end
    bindingMode = mode == "a" and "a" or "b"
    local button = bindingMode == "a" and "VXVProbe_FishCast" or "VXVProbe_FishInteract"
    if call("SetOverrideBindingClick(" .. key:upper() .. ", " .. button .. ")", Compat.SetOverrideBindingClick,
        board, true, key:upper(), button) then
        boundKey = key:upper()
    end
end

local function swapBinding(action)
    if boundKey ~= nil and bindingMode == "a" then
        call("SetOverrideBinding(" .. boundKey .. ", " .. action .. ")", Compat.SetOverrideBinding, board, true,
            boundKey, action)
    end
end

local function softTarget()
    if not first(Compat.UnitExists(SOFT_TARGET)) then
        return "aucune"
    end
    return Util.Results(Compat.UnitName(SOFT_TARGET))
end

local function watchSoftTarget()
    local target = softTarget()
    if target ~= lastSoftTarget then
        lastSoftTarget = target
        log.Info("cible d'interaction (" .. SOFT_TARGET .. ") :", target)
    end
end

--- Makes the bobber the soft target ("on"), or puts back the player's values ("off").
local function interact(args)
    local on = args ~= "off"
    if on then
        db.cvars = db.cvars or {}
    end
    for cvar, value in pairs(INTERACT_ON) do
        if on then
            db.cvars[cvar] = db.cvars[cvar] or first(Compat.GetCVar(cvar))
            call("SetCVar(" .. cvar .. ", " .. value .. ")", Compat.SetCVar, cvar, value)
        elseif db.cvars and db.cvars[cvar] then
            call("SetCVar(" .. cvar .. ", " .. db.cvars[cvar] .. ")", Compat.SetCVar, cvar, db.cvars[cvar])
        end
    end
    if not on then
        db.cvars = nil
    end
end

--- What the client lets the addon do when combat starts: equip the weapon, give the key back.
local function onCombat()
    if not db.combat then
        return
    end
    log.Info("entrée en combat : réaction de l'addon, sans clic")
    if db.mainHand ~= nil then
        call("EquipItemByName en combat (" .. db.mainHand .. ")", Compat.EquipItemByName, db.mainHand)
        checkLater("en combat")
    end
    if board ~= nil then
        call("ClearOverrideBindings en combat", Compat.ClearOverrideBindings, board)
    end
end

local function armCombat(args)
    db.combat = args ~= "off"
    log.Info("réaction à l'entrée en combat :", db.combat and "armée" or "désarmée")
end

local function isPlayer(unit)
    return unit == "player"
end

local function onChannelStart(unit, ...)
    if not isPlayer(unit) then
        return
    end
    log.Ok("UNIT_SPELLCAST_CHANNEL_START", ...)
    log.Info("UnitChannelInfo :", Util.Results(Compat.UnitChannelInfo("player")))
    swapBinding("INTERACTTARGET")
    lastSoftTarget = nil
    watcher = watcher or C_Timer.NewTicker(WATCH_SECONDS, watchSoftTarget)
end

local function onChannelStop(unit, ...)
    if not isPlayer(unit) then
        return
    end
    log.Ok("UNIT_SPELLCAST_CHANNEL_STOP", ...)
    swapBinding("CLICK VXVProbe_FishCast:LeftButton")
    if watcher ~= nil then
        watcher:Cancel()
        watcher = nil
    end
end

--- The catch: journaled only when the client calls it fishing loot.
local function onLoot()
    if not first(Compat.IsFishingLoot()) then
        return
    end
    log.Ok("LOOT_OPENED, butin de pêche (IsFishingLoot)")
    for slot = 1, GetNumLootItems() do
        log.Info("  objet", slot, Util.Safe(GetLootSlotLink(slot)))
    end
end

ns.Registry.Register({
    id = "peche",
    description = "pêche en un bouton : canne, appât, boutons sécurisés, touche, bouchon, combat",
    Setup = function(saved)
        saved.fishing = saved.fishing or {}
        db = saved.fishing
        log.Listen("UNIT_SPELLCAST_CHANNEL_START", onChannelStart)
        log.Listen("UNIT_SPELLCAST_CHANNEL_STOP", onChannelStop)
        for _, event in ipairs({ "UNIT_SPELLCAST_SUCCEEDED", "UNIT_SPELLCAST_FAILED", "UNIT_SPELLCAST_INTERRUPTED" }) do
            log.Listen(event, function(unit, ...)
                if isPlayer(unit) then
                    log.Info(event, ...)
                end
            end)
        end
        log.Listen("PLAYER_REGEN_DISABLED", function()
            log.Ok("PLAYER_REGEN_DISABLED")
            onCombat()
        end)
        -- The soft target changes at every step near creatures and objects: kept, not printed.
        log.Journal({ PLAYER_REGEN_ENABLED = "Ok", PLAYER_SOFT_INTERACT_CHANGED = "Trace",
            PLAYER_EQUIPMENT_CHANGED = "Info" })
        log.Listen("LOOT_OPENED", onLoot)
    end,
    commands = {
        { name = "etat", run = status },
        { name = "equiper", run = equipPole },
        { name = "rendre", run = restoreWeapons },
        { name = "boutons", run = showButtons },
        { name = "touche", usage = "[touche] [a|b]", run = bindKey },
        { name = "interact", usage = "on|off", run = interact },
        { name = "combat", usage = "on|off", run = armCombat },
    },
})
