local ns = select(2, ...).Core

--- Character names on WoW Forever: "Prénom Nom", unique in the whole game, without realm.
local Names = {}
ns.Names = Names

local Compat, Util = ns.Compat, ns.Util

--- The unit's full name, or nil when the client has no such unit or hides its name (enemies in combat).
function Names.OfUnit(unit)
    local ok, name = Compat.GetUnitName(unit, true)
    if not ok or name == nil or Util.IsSecret(name) then
        return nil
    end
    return name
end

--- First and last name of a full name, split at its first space; nil for a name without last name.
function Names.Split(fullName)
    return fullName:match("^(%S+)%s+(.+)$")
end
