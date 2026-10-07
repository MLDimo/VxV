local _, ns = ...

--- The game's combat log in the raids (phase 0, T11): switched on with its advanced mode when the player enters the
--- instance of a raid of the packs, and off when they leave it if VXV switched it on. The game writes it while it
--- runs; the companion reads the bosses killed there (healing received included) without a /reload.
local CombatLogging = {}
ns.CombatLogging = CombatLogging

local Compat = VXV.Compat

local ADVANCED_LOGGING = "advancedCombatLogging"

local saved = {}

--- Takes the module's saved data at start-up: whether VXV switched the log on (a /reload in the raid keeps it).
function CombatLogging.Restore(data)
    saved = data
end

local function follow(raid)
    local logging = select(2, Compat.LoggingCombat()) == true
    if raid ~= nil and not logging then
        Compat.SetCVar(ADVANCED_LOGGING, "1")
        Compat.LoggingCombat(true)
        saved.combatLogging = true
    elseif raid == nil and logging and saved.combatLogging then
        Compat.LoggingCombat(false)
        saved.combatLogging = nil
    end
end

VXV.On("raid.place", follow)
