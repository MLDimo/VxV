local _, ns = ...

--- Feature modules plug into the core: { id, name, Enable(data), tab }, data being the module's saved data
--- and tab an optional { title, Build(content) } shown in the window.
--- Modules registered after login (bundles loaded on demand) are enabled at once.
local Modules = {}
ns.Modules = Modules

local Call, Storage = ns.Call, ns.Storage

local byId = {}
local ordered = {}
local started = false

local function enable(module)
    if module.Enable ~= nil then
        Call.Isolated(module.Enable, Storage.ModuleData(module.id))
    end
end

function Modules.Register(module)
    assert(type(module.id) == "string" and byId[module.id] == nil, "VXV: invalid or duplicate module id")
    byId[module.id] = module
    ordered[#ordered + 1] = module
    if started then
        enable(module)
    end
    ns.Bus.Emit("modules.registered", module)
end

--- Registered modules, in registration order.
function Modules.All()
    return ordered
end

--- Enables every registered module, in registration order, once the player is in the world.
function Modules.Start()
    started = true
    for _, module in ipairs(ordered) do
        enable(module)
    end
end
