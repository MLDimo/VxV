local ADDON_NAME, ns = ...

--- Test journal: every entry is printed and kept in SavedVariables for the feasibility report.
local Log = {}
ns.Log = Log

local Util = ns.Util

local MAX_ENTRIES = 3000
local CHAT_PREFIX = "|cff14b8a6VXV|r "
local LEVEL_COLORS = { ok = "|cff22c55e", fail = "|cffef4444", info = "|cffe5e7eb", trace = "|cff9ca3af" }
local LOGGER_METHODS = { Ok = "ok", Fail = "fail", Info = "info", Trace = "trace" }

-- In-memory until SavedVariables are attached at ADDON_LOADED.
local db = { log = {} }

function Log.Attach(savedDb)
    savedDb.log = savedDb.log or {}
    db = savedDb
end

function Log.Record(testId, level, ...)
    local entry = {
        time = time(),
        test = testId,
        level = level,
        message = Util.Join(...),
        context = ns.Context.Describe(),
    }
    local entries = db.log
    entries[#entries + 1] = entry
    if #entries > MAX_ENTRIES then
        table.remove(entries, 1)
    end
    if level ~= "trace" or db.verbose then
        print(Log.Format(entry, true))
    end
end

--- Returns a logger bound to one test: .Ok(...), .Fail, .Info, .Trace, .Check(success, ...), .Call, .Listen, .Journal.
function Log.For(testId)
    local logger = {}
    for method, level in pairs(LOGGER_METHODS) do
        logger[method] = function(...)
            Log.Record(testId, level, ...)
        end
    end
    logger.Check = function(success, ...)
        Log.Record(testId, success and "ok" or "fail", ...)
    end
    --- Logs a call made through Compat or pcall (ok, error). A blocked action is journaled separately as "client".
    logger.Call = function(label, ok, problem)
        logger.Check(ok, label, ok and "appelé sans erreur Lua" or problem)
    end
    --- Subscribes the handler; a refused event is journaled instead of raised.
    logger.Listen = function(event, handler)
        if not ns.Events.On(event, handler) then
            logger.Trace("événement refusé :", event)
        end
    end
    --- Journals each event with all its arguments, at its level: { EVENT_NAME = "Info" | "Trace" | ... }.
    logger.Journal = function(eventLevels)
        for event, method in pairs(eventLevels) do
            logger.Listen(event, function(...)
                logger[method](event, ...)
            end)
        end
    end
    return logger
end

function Log.Format(entry, colored)
    local text = string.format("%s [%s] %s %s  (%s)",
        Util.FormatTime(entry.time), entry.test, entry.level:upper(), entry.message, entry.context)
    if colored then
        return CHAT_PREFIX .. LEVEL_COLORS[entry.level] .. text .. "|r"
    end
    return text
end

function Log.Entries()
    return db.log
end

function Log.Clear()
    db.log = {}
end

function Log.ToggleVerbose()
    db.verbose = not db.verbose
    return db.verbose
end

-- Every protected call made by this addon is journaled, whatever test triggered it.
local function recordProtectedCall(label)
    return function(addonName, functionName)
        if addonName == ADDON_NAME then
            Log.Record("client", "fail", label, functionName)
        end
    end
end

ns.Events.On("ADDON_ACTION_FORBIDDEN", recordProtectedCall("action interdite par le client :"))
ns.Events.On("ADDON_ACTION_BLOCKED", recordProtectedCall("action bloquée par le client :"))
