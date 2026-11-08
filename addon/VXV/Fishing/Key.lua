local ns = select(2, ...).Fishing

--- The fishing key and its buttons. The game lets an addon cast a spell or use an item only from a secure button the
--- player clicks, or presses through a key bound to it (measured on 8 November). During a session the player's key
--- clicks the fishing button, which casts; while the line is in the water the key interacts with the bobber, the
--- game's soft target (INTERACTTARGET), then casts again. In a fight the button's macro gives the weapons back. The
--- key is the player's again once the session ends. Secure buttons change only out of combat.
local Key = {}
ns.Key = Key

local Compat, Gear, Skill = VXV.Compat, ns.Gear, ns.Skill

-- The fishing button's global name: a key binding clicks a button by its name.
Key.BUTTON = "VXV_FishingButton"
local DEFAULT_KEY = "F"
local INTERACT = "INTERACTTARGET"
local CLICK = "CLICK " .. Key.BUTTON .. ":LeftButton"
local MOUSE_BUTTON = "LeftButton"
-- The spell's name when the client does not give it.
local FISHING = "Pêche"

-- The frame owning the key's binding while a session runs.
local owner = CreateFrame("Frame")
local saved = {}
local fishingButton, lureButton
local bound

--- Takes the module's saved data: the key chosen by the player, if any.
function Key.Load(data)
    saved = data
end

--- The fishing key ("F" until the player chooses one).
function Key.Current()
    return saved.key or DEFAULT_KEY
end

--- Chooses the fishing key.
function Key.Set(key)
    saved.key = key
end

--- What the key does in the game's own bindings ("Assister la cible"…), or nil when it is free. GetBindingAction is
--- not measured on WoW Forever: looked up, never called when absent.
function Key.Taken(key)
    local actionOf = Compat.Resolve("GetBindingAction")
    if type(actionOf) ~= "function" then
        return nil
    end
    local ok, action = pcall(actionOf, key)
    if not ok or type(action) ~= "string" or action == "" or VXV.IsSecret(action) then
        return nil
    end
    local label = Compat.Resolve("BINDING_NAME_" .. action)
    return type(label) == "string" and label or action
end

--- A secure button, made once out of combat; the session's window takes it and draws it.
local function secureButton(name)
    local button = CreateFrame("Button", name, UIParent, "SecureActionButtonTemplate")
    button:RegisterForClicks("AnyUp", "AnyDown")
    return button
end

--- The fishing button, made at the first session.
function Key.FishingButton()
    fishingButton = fishingButton or secureButton(Key.BUTTON)
    return fishingButton
end

--- The lure's button, made at the first session.
function Key.LureButton()
    lureButton = lureButton or secureButton(nil)
    return lureButton
end

local function itemName(itemId)
    return itemId ~= nil and Gear.Describe(itemId).name or nil
end

--- The fishing button's macro: cast out of combat; in a fight, the weapons kept back in hand.
local function fishingMacro(weapons)
    local ok, spell = Compat.GetSpellName(Skill.SPELL)
    local lines = { "/cast [nocombat] " .. (ok and type(spell) == "string" and spell or FISHING) }
    local main, off = itemName(weapons and weapons.main), itemName(weapons and weapons.off)
    if main ~= nil then
        lines[#lines + 1] = "/equip [combat] " .. main
    end
    if off ~= nil then
        lines[#lines + 1] = "/equipslot [combat] " .. Gear.OFF_HAND .. " " .. off
    end
    return table.concat(lines, "\n")
end

local function setMacro(button, text)
    button:SetAttribute("type", "macro")
    button:SetAttribute("macrotext", text)
end

--- Readies the buttons and binds the key to the fishing button, out of combat: the session starts.
function Key.Arm()
    setMacro(Key.FishingButton(), fishingMacro(Gear.Weapons()))
    Key.ArmLure()
    bound = Key.Current()
    Compat.SetOverrideBindingClick(owner, true, bound, Key.BUTTON, MOUSE_BUTTON)
end

--- The lure's button uses the best lure of the bags on the pole in hand; false without a lure. Out of combat.
function Key.ArmLure()
    local lure = itemName(Gear.Lure())
    if InCombatLockdown() then
        return lure ~= nil
    end
    setMacro(Key.LureButton(), lure and ("/use " .. lure .. "\n/use " .. Gear.MAIN_HAND) or "")
    return lure ~= nil
end

--- Points the key at an action, out of combat. SetOverrideBinding is not measured on WoW Forever (8 November: the
--- line never went in the water): looked up, never called when absent.
local function point(action)
    local rebind = Compat.Resolve("SetOverrideBinding")
    if bound ~= nil and not InCombatLockdown() and type(rebind) == "function" then
        pcall(rebind, owner, true, bound, action)
    end
end

--- The line is in the water: the key hooks the bobber.
function Key.Hook()
    point(INTERACT)
end

--- The line is out: the key casts again.
function Key.Cast()
    point(CLICK)
end

--- Gives the key back to the player, out of combat: the session ends.
function Key.Release()
    Compat.ClearOverrideBindings(owner)
    bound = nil
end
