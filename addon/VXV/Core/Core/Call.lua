local ns = select(2, ...).Core

--- Runs code written by others (modules, event handlers) without letting one error stop the rest.
local Call = {}
ns.Call = Call

--- Calls the handler with the arguments; an error goes to the game's error handler (BugSack shows it).
function Call.Isolated(handler, ...)
    local count, args = select("#", ...), { ... }
    xpcall(function()
        handler(unpack(args, 1, count))
    end, geterrorhandler())
end
