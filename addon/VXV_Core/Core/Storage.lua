local _, ns = ...

--- Saved data (VXV_DB): a numbered schema, upgraded by migrations when a new version of the addon loads it.
--- Read only from the addon's ADDON_LOADED, never when the file loads.
local Storage = {}
ns.Storage = Storage

local SCHEMA_VERSION = 1

--- MIGRATIONS[n] upgrades the data saved with schema n - 1 to schema n. A published migration never changes.
local MIGRATIONS = {
    [1] = function(db)
        db.modules = {}
    end,
}

local db

--- Takes the saved data (nil at the first installation), upgrades it and returns it to be saved again.
function Storage.Load(saved)
    db = type(saved) == "table" and saved or {}
    local version = tonumber(db.schemaVersion) or 0
    for target = version + 1, SCHEMA_VERSION do
        MIGRATIONS[target](db)
        db.schemaVersion = target
    end
    return db
end

--- The saved data of one module, created empty the first time.
function Storage.ModuleData(moduleId)
    if type(db.modules) ~= "table" then
        db.modules = {}
    end
    local data = db.modules[moduleId] or {}
    db.modules[moduleId] = data
    return data
end
