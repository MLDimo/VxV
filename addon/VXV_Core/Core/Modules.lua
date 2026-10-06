local _, ns = ...

--- Feature modules plug into the core: { id, name, Enable(data), tab }, data being the module's saved data
--- and tab an optional { place, Build(content), Card(), Compact(content), name, order }: the screen of a place of the
--- tavern ("raid", "journal"…, see UI/Tokens.lua), shown in the window under the place's name; the place's card under
--- the tavern when it has one, Card() giving { title, lines, action } (the module emits "tavern.changed" when it
--- changes); and its compact screen in the reduced mode. Several modules may share a place (Le Dé Pipé: Paris and
--- Deathroll): its screen then shows one tab per module, named by tab.name (the module's name otherwise), in the
--- order of tab.order.
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

--- The modules of a place, by their tab's order, then their registration.
function Modules.Of(placeId)
    local list = {}
    for index, module in ipairs(ordered) do
        if module.tab ~= nil and module.tab.place == placeId then
            list[#list + 1] = { module = module, index = index }
        end
    end
    table.sort(list, function(left, right)
        local leftOrder, rightOrder = left.module.tab.order or 0, right.module.tab.order or 0
        if leftOrder ~= rightOrder then
            return leftOrder < rightOrder
        end
        return left.index < right.index
    end)
    for index, entry in ipairs(list) do
        list[index] = entry.module
    end
    return list
end

--- The first module of the place providing this part of its tab ("Build" by default, "Card", "Compact"), if any.
function Modules.ForPlace(placeId, part)
    for _, module in ipairs(Modules.Of(placeId)) do
        if module.tab[part or "Build"] ~= nil then
            return module
        end
    end
end

--- Enables every registered module, in registration order, once the player is in the world; then tells the
--- bundles ("modules.started"), whatever their loading order.
function Modules.Start()
    started = true
    for _, module in ipairs(ordered) do
        enable(module)
    end
    ns.Bus.Emit("modules.started")
end
