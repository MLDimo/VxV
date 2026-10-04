local _, ns = ...

--- Game events: several handlers per event, each isolated from the others.
local Events = {}
ns.Events = Events

local Call = ns.Call

local frame = CreateFrame("Frame")
local handlers = {}

function Events.On(event, handler)
    local list = handlers[event]
    if list == nil then
        list = {}
        handlers[event] = list
        frame:RegisterEvent(event)
    end
    list[#list + 1] = handler
end

frame:SetScript("OnEvent", function(_, event, ...)
    for _, handler in ipairs(handlers[event]) do
        Call.Isolated(handler, ...)
    end
end)
