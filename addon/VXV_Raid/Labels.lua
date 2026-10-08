local _, ns = ...

--- French wording of the event's data, as the website shows it; class colors come from VXV_Core's theme.
local Labels = {}
ns.Labels = Labels

local CLASS_NAMES = {
    WARRIOR = "Guerrier",
    PALADIN = "Paladin",
    HUNTER = "Chasseur",
    ROGUE = "Voleur",
    PRIEST = "Prêtre",
    SHAMAN = "Chaman",
    MAGE = "Mage",
    WARLOCK = "Démoniste",
    DRUID = "Druide",
}

-- The sign-ups' wording, shared with the PvP outings: the roles, the statuses and who is expected.
Labels.ROLE_ORDER = VXV.SignupLabels.ROLE_ORDER
Labels.Role = VXV.SignupLabels.Role
Labels.Status = VXV.SignupLabels.Status
Labels.IsComing = VXV.SignupLabels.IsComing

local DATE_TIME = "%d/%m %H:%M"
-- How an item was given, as the website names it.
local METHODS = {
    soft_reserve = "SR",
    soft_reserve_plus = "SR+",
    free_roll = "roll libre",
    loot_council = "loot council",
}

function Labels.ClassName(token)
    return CLASS_NAMES[token] or tostring(token)
end

--- The name in the color of the class.
function Labels.Colored(name, token)
    return VXV.ClassColored(name, token)
end

function Labels.Method(method)
    return METHODS[method] or tostring(method)
end

--- "10/12 21:00", in the player's time.
function Labels.DateTime(seconds)
    return date(DATE_TIME, seconds)
end
