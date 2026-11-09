local ns = select(2, ...).Fishing

--- A fishing session (owner's request of 8 November): started from the Artisans screen, the pole in hand and the key
--- bound; each cast and each catch, until the player quits or a fight starts. A fight gives the weapons back (or lets
--- the key do it) and ends the session once over. What shows follows the bus event "fishing.changed".
--- States: off, ready (the pole in hand), fishing (the line in the water), hooked (the line out, the catch awaited),
--- caught (a catch shown), fight.
local Session = {}
ns.Session = Session

local Gear, Key, Skill, Waters = ns.Gear, ns.Key, ns.Skill, ns.Waters

-- How long the line stays in the water (measured on 9 November), when the game does not tell it.
Session.CAST_SECONDS = 30
-- Position of the line's end, in milliseconds, among Compat.UnitChannelInfo's results (pcall's ok first).
local CHANNEL_END_INDEX = 6
local MS_PER_SECOND = 1000
-- How long a catch shows before the button casts again.
local CATCH_SECONDS = 2
-- Once the line is out, how long the loot window has to open for a catch.
local LOOT_WAIT_SECONDS = 1
-- Once a fight starts, the time the game takes to equip the weapons given back, before reading the hands; and how
-- long after the fight the session shows before its summary.
local EQUIP_CHECK_SECONDS = 1
local AFTER_FIGHT_SECONDS = 3
-- The game's text of a refused cast follows its failure at once.
local REFUSAL_SECONDS = 1
local CHANGED = "fishing.changed"
local SECONDS_PER_MINUTE = 60

local saved = {}
local state = "off"
-- The running session: { startedAt, catches, best, last = { name, quality, icon }, castEndsAt, weaponsBack, far }.
local session
-- Why the last start failed or the session stopped: { kind = "pole" | "fight" | "water", need, level, zone }, or nil.
local problem
-- When the last fishing cast failed, to read the game's text of it.
local failedAt

local function changed()
    VXV.Emit(CHANGED)
end

local function enter(next)
    state = next
    changed()
end

--- A duration as the windows show it, minutes and seconds: "08:42".
function Session.Clock(seconds)
    seconds = math.floor(seconds)
    return ("%02d:%02d"):format(math.floor(seconds / SECONDS_PER_MINUTE), seconds % SECONDS_PER_MINUTE)
end

--- The session's state and data (nil when off).
function Session.State()
    return state, session
end

--- Why the last start failed or the session stopped: { kind = "pole" | "fight" | "water", need, level, zone }, or nil.
function Session.Problem()
    return problem
end

--- The problem as the player reads it, or nil.
function Session.Explain()
    if problem == nil then
        return nil
    elseif problem.kind == "pole" then
        return "Aucune canne à pêche dans tes sacs"
    elseif problem.kind == "fight" then
        return "Impossible pendant un combat"
    end
    local where = problem.zone and (" (" .. problem.zone .. ")") or ""
    if problem.need == nil or problem.level == nil then
        return "Eau trop difficile" .. where .. " pour ta Pêche"
    end
    return ("Eau trop difficile%s : il faut la Pêche à %d, la tienne est à %d"):format(where, problem.need,
        problem.level)
end

--- The last session's summary { catches, seconds, best }, or nil.
function Session.Last()
    return saved.last
end

--- Starts a session: checks the character fishes, is out of a fight and has a pole; takes the pole, binds the key.
function Session.Start()
    local skill = Skill.Read()
    if state ~= "off" or skill == nil then
        return
    end
    local pole = Gear.Pole()
    local need, zone = Waters.Need()
    problem = nil
    if InCombatLockdown() then
        problem = { kind = "fight" }
    elseif pole == nil then
        problem = { kind = "pole" }
    elseif need ~= nil and skill.level ~= nil and skill.level < need then
        problem = { kind = "water", need = need, level = skill.level, zone = zone }
    end
    if problem ~= nil then
        changed()
        return
    end
    Gear.TakePole(pole)
    Key.Arm()
    session = { startedAt = time(), catches = 0 }
    enter("ready")
end

--- The weapons kept back in hand, if the pole still is, then forgotten. Out of combat.
local function putAway()
    if Gear.HoldsPole() then
        Gear.GiveBack()
    end
    Gear.Forget()
end

--- Ends the session: out of combat, the weapons back in hand and the key given back; keeps its summary.
function Session.Stop()
    if state == "off" then
        return
    end
    -- The session's window holds secure buttons: it changes only out of combat.
    if InCombatLockdown() then
        VXV.AfterCombat(Session.Stop)
        return
    end
    local ended = session
    session = nil
    saved.last = { catches = ended.catches, seconds = time() - ended.startedAt, best = ended.best,
        weapons = Gear.Weapons() ~= nil }
    VXV.AfterCombat(function()
        putAway()
        Key.Release()
    end)
    enter("off")
end

--- Starts a session, or ends the one running ("/vxv peche").
function Session.Toggle()
    if state == "off" then
        Session.Start()
    else
        Session.Stop()
    end
end

--- A fight: the key casts no more (before the lockdown, when the game allows it), the weapons go back in hand if the
--- game lets the addon equip them, else the key's macro does; the session ends once the fight is over.
local function fight()
    if state == "off" or state == "fight" then
        return
    end
    Key.Cast()
    Gear.GiveBack()
    enter("fight")
    C_Timer.After(EQUIP_CHECK_SECONDS, function()
        if state ~= "fight" then
            return
        end
        session.weaponsBack = Gear.WeaponsBack()
        changed()
        VXV.AfterCombat(function()
            C_Timer.After(AFTER_FIGHT_SECONDS, function()
                if state == "fight" then
                    Session.Stop()
                end
            end)
        end)
    end)
end

local function isFishing(unit, spellId)
    return unit == "player" and Skill.SPELLS[spellId] == true
end

VXV.OnEvent("UNIT_SPELLCAST_CHANNEL_START", function(unit, _, spellId)
    if isFishing(unit, spellId) and (state == "ready" or state == "caught") then
        local channel = { VXV.Compat.UnitChannelInfo("player") }
        local endMs = channel[1] and channel[CHANNEL_END_INDEX]
        session.castEndsAt = type(endMs) == "number" and endMs / MS_PER_SECOND or GetTime() + Session.CAST_SECONDS
        session.far = nil
        Key.Hook()
        enter("fishing")
    end
end)

VXV.OnEvent("UNIT_SPELLCAST_CHANNEL_STOP", function(unit, _, spellId)
    if not isFishing(unit, spellId) or state ~= "fishing" then
        return
    end
    Key.Cast()
    enter("hooked")
    C_Timer.After(LOOT_WAIT_SECONDS, function()
        if state == "hooked" then
            enter("ready")
        end
    end)
end)

--- Whether the loot window is a catch: the game tells it (measured on 9 November).
local function isCatch()
    local ok, caught = VXV.Compat.IsFishingLoot()
    return ok and caught == true
end

VXV.OnEvent("LOOT_OPENED", function()
    if (state ~= "hooked" and state ~= "fishing") or not isCatch() then
        return
    end
    -- The loot window may open before the line's end: the key casts again all the same.
    if state == "fishing" then
        Key.Cast()
    end
    local caught
    for slot = 1, GetNumLootItems() do
        local item = Gear.Describe(GetLootSlotLink(slot))
        caught = caught or item
        if item.quality ~= nil and (session.best == nil or item.quality > (session.best.quality or 0)) then
            session.best = item
        end
    end
    session.catches = session.catches + 1
    session.last = caught
    enter("caught")
    C_Timer.After(CATCH_SECONDS, function()
        if state == "caught" then
            enter("ready")
        end
    end)
end)

VXV.OnEvent("PLAYER_REGEN_DISABLED", fight)

VXV.OnEvent("UNIT_SPELLCAST_FAILED", function(unit, _, spellId)
    if isFishing(unit, spellId) and state ~= "off" then
        failedAt = GetTime()
    end
end)

--- The game's text of a refused cast: water too hard for the level, the session stops and the zone is learned; the
--- line out of the water, the button greys until the next cast.
VXV.OnEvent("UI_ERROR_MESSAGE", function(_, text)
    if state == "off" or failedAt == nil or GetTime() - failedAt > REFUSAL_SECONDS then
        return
    end
    failedAt = nil
    local refusal, need = Waters.Refusal(text)
    local skill = Skill.Read()
    if refusal == "low" and skill ~= nil then
        Waters.Learn(skill.level, need)
        local learned, zone = Waters.Need()
        Session.Stop()
        problem = { kind = "water", need = learned or need, level = skill.level, zone = zone }
        changed()
    elseif refusal == "far" then
        session.far = true
        changed()
    end
end)

--- Takes the module's saved data at start-up: the key, the last session, and the weapons of a session cut short by a
--- /reload or a disconnection, given back now.
function Session.Load(data)
    saved = data
    if Gear.Weapons() ~= nil then
        VXV.AfterCombat(putAway)
    end
end
