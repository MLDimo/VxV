local _, ns = ...

--- Who may sign up to a guild event, in the in-game creation dialogs (a raid night, a PvP outing): the Discord roles
--- an officer's companion brought (EventRoles.lua), stepped through with two arrows; none is chosen at first, the
--- officer chooses.
local RoleStepper = {}
ns.RoleStepper = RoleStepper

local EventRoles, Theme = ns.EventRoles, ns.Theme

local HEADING_HEIGHT, ARROW_SIZE, GAP = 20, 26, 6
local NO_ROLE = "Choisis un rôle avec les flèches."
local NO_ROLES = "Rôles pas encore reçus : ton compagnon VXV les apporte au /reload."

--- The stepper under its heading, at top in the dialog's body: { Reset() (the roles offered now, none chosen),
--- Chosen() ({ id, name } or nil) }.
function RoleStepper.Create(body, top)
    local roles, index = {}, nil
    Theme.Heading(body, "Qui peut s'inscrire (rôle Discord)"):SetPoint("TOPLEFT", 0, -top)
    local previous = Theme.Button(body, "wood", "<", ARROW_SIZE, ARROW_SIZE)
    previous:SetPoint("TOPLEFT", 0, -(top + HEADING_HEIGHT))
    local following = Theme.Button(body, "wood", ">", ARROW_SIZE, ARROW_SIZE)
    following:SetPoint("LEFT", previous, "RIGHT", GAP, 0)
    local label = Theme.Text(body, "text", 13, "ivory")
    label:SetPoint("LEFT", following, "RIGHT", 2 * GAP, 0)

    local function show()
        local role = roles[index]
        label:SetText(role and role.name or (#roles == 0 and NO_ROLES or NO_ROLE))
    end

    --- The previous (-1) or next (1) role, round the list; from none, the first or the last.
    local function step(direction)
        if #roles == 0 then
            return
        end
        index = index == nil and (direction > 0 and 1 or #roles) or (index - 1 + direction) % #roles + 1
        show()
    end

    previous:SetScript("OnClick", function()
        step(-1)
    end)
    following:SetScript("OnClick", function()
        step(1)
    end)

    local stepper = {}
    function stepper.Reset()
        roles, index = EventRoles.List(), nil
        show()
    end
    function stepper.Chosen()
        return roles[index]
    end
    return stepper
end
