local _, ns = ...

--- The Discord roles an officer may reserve a guild event to (a raid night, a PvP outing), everybody first
--- (VXV-ROLES-1, described in packages/server/src/domain/addonEventRoles.ts): brought by an officer's companion for
--- the in-game creation dialogs. Only the officers create events: the guild's addons do not pass them on.
local EventRoles = {}
ns.EventRoles = EventRoles

local store = ns.SiteData.Create({
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

--- The roles offered, { id, name } in the website's order; none before an officer's companion brought them.
function EventRoles.List()
    local data = store.Current()
    return data and data.roles or {}
end

-- Kept in the saved data like a module's.
ns.Modules.Register({ id = "eventroles", name = "Rôles Discord", Enable = store.Restore })
