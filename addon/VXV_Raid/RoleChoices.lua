local _, ns = ...

--- The Discord roles an officer may reserve an event to, everybody first (VXV-ROLES-1, described in
--- packages/server/src/domain/addonEventRoles.ts): brought by an officer's companion for « Créer un événement ». Only
--- the officers create events: the guild's addons do not pass them on.
local RoleChoices = {}
ns.RoleChoices = RoleChoices

local store = VXV.SiteData({
    name = "raidroles",
    header = "VXV-ROLES-1",
    New = function()
        return { roles = {} }
    end,
    lines = {
        -- R;Discord role id;name
        R = { 2, function(data, f)
            data.roles[#data.roles + 1] = { id = f[1], name = f[2] }
            return true
        end },
    },
    shared = false,
})

--- Takes the module's saved data at start-up.
function RoleChoices.Restore(data)
    data.roleChoices = type(data.roleChoices) == "table" and data.roleChoices or {}
    store.Restore(data.roleChoices)
end

--- The roles offered, { id, name } in the website's order; none before an officer's companion brought them.
function RoleChoices.List()
    local data = store.Current()
    return data and data.roles or {}
end
