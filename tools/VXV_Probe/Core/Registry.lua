local _, ns = ...

--- Test registry. A test is { id, description, Setup?(db), commands = { { name, usage, run(args) } } }.
local Registry = {}
ns.Registry = Registry

local testsById = {}
local orderedTests = {}

function Registry.Register(test)
    assert(type(test.id) == "string" and not testsById[test.id], "VXV_Probe: invalid or duplicate test id")
    testsById[test.id] = test
    orderedTests[#orderedTests + 1] = test
end

function Registry.Get(id)
    return testsById[id]
end

function Registry.All()
    return orderedTests
end

function Registry.FindCommand(test, name)
    for _, command in ipairs(test.commands) do
        if command.name == name then
            return command
        end
    end
end

--- Starts every passive listener once SavedVariables are available.
function Registry.SetupAll(db)
    for _, test in ipairs(orderedTests) do
        if test.Setup then
            test.Setup(db)
        end
    end
end
