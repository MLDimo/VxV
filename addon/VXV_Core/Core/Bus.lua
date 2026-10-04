local _, ns = ...

--- Internal events: modules and bundles talk to each other without knowing each other.
local Bus = {}
ns.Bus = Bus

local Call = ns.Call

local listeners = {}

function Bus.On(name, listener)
    local list = listeners[name] or {}
    list[#list + 1] = listener
    listeners[name] = list
end

function Bus.Emit(name, ...)
    for _, listener in ipairs(listeners[name] or {}) do
        Call.Isolated(listener, ...)
    end
end
