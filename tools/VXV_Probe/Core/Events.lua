local ADDON_NAME, ns = ...

--- Thin event dispatcher: several handlers per game event.
--- Unknown events (Lua error) and protected events (ADDON_ACTION_FORBIDDEN) are reported instead of raised.
local Events = {}
ns.Events = Events

local dispatcher = CreateFrame("Frame")
local scratch = CreateFrame("Frame")
local handlers = {}
-- Set synchronously by ADDON_ACTION_FORBIDDEN while a registration attempt is running.
local forbiddenDuringCall = false

--- Registers the event on the frame; false when the client rejects or forbids it.
local function tryRegister(frame, event)
    forbiddenDuringCall = false
    local ok = pcall(frame.RegisterEvent, frame, event)
    return ok and not forbiddenDuringCall
end

--- True when the client lets this addon listen to the event.
function Events.IsKnown(event)
    local allowed = tryRegister(scratch, event)
    if allowed then
        scratch:UnregisterEvent(event)
    end
    return allowed
end

--- Subscribes a handler; returns false when the client rejects or forbids the event.
function Events.On(event, handler)
    local list = handlers[event]
    if not list then
        if not tryRegister(dispatcher, event) then
            return false
        end
        list = {}
        handlers[event] = list
    end
    list[#list + 1] = handler
    return true
end

dispatcher:SetScript("OnEvent", function(_, event, ...)
    for _, handler in ipairs(handlers[event]) do
        handler(...)
    end
end)

Events.On("ADDON_ACTION_FORBIDDEN", function(addonName)
    if addonName == ADDON_NAME then
        forbiddenDuringCall = true
    end
end)
