-- Generic mock of the WoW Forever client (Lua 5.1 API on fengari's Lua 5.3), for VXV_Core.
-- Chat output is silenced unless VXV_VERBOSE=1. Tests drive it through Fire and read ReportedErrors.
if os.getenv("VXV_VERBOSE") ~= "1" then
    print = function() end
end

-- Lua 5.1 globals that Lua 5.3 moved.
unpack = table.unpack

local frames = {}
--- Every event an addon subscribed to, for the tests.
RegisteredEvents = {}
--- Errors reported to the game's error handler (shown by BugSack in game).
ReportedErrors = {}

function Fire(event, ...)
    for _, frame in ipairs(frames) do
        if frame.events[event] and frame.scripts.OnEvent then
            frame.scripts.OnEvent(frame, event, ...)
        end
    end
end

function CreateFrame()
    local frame = { events = {}, scripts = {} }
    function frame:RegisterEvent(event)
        self.events[event] = true
        RegisteredEvents[event] = true
    end
    function frame:UnregisterEvent(event)
        self.events[event] = nil
    end
    function frame:SetScript(name, handler)
        self.scripts[name] = handler
    end
    frames[#frames + 1] = frame
    return frame
end

function geterrorhandler()
    return function(message)
        ReportedErrors[#ReportedErrors + 1] = tostring(message)
    end
end
