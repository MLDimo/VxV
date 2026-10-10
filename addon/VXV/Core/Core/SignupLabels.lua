local ns = select(2, ...).Core

--- The French wording of a sign-up to a guild event (a raid night, a PvP outing), as the website shows it: the role
--- with the icon of the game's group finder, and the status.
local SignupLabels = {}
ns.SignupLabels = SignupLabels

-- Role icons of the game's group finder, cut from one texture.
local ROLE_ICON = "|TInterface\\LFGFrame\\UI-LFG-ICON-PORTRAITROLES:14:14:0:0:64:64:%s|t"
local ROLES = {
    tank = { label = "Tank", plural = "Tanks", icon = ROLE_ICON:format("0:19:22:41") },
    healer = { label = "Soigneur", plural = "Soigneurs", icon = ROLE_ICON:format("20:39:1:20") },
    dps = { label = "DPS", plural = "DPS", icon = ROLE_ICON:format("20:39:22:41") },
}
SignupLabels.ROLE_ORDER = { "tank", "healer", "dps" }

local STATUSES = { present = "Présent", late = "En retard", maybe = "Peut-être", bench = "Banc", absent = "Absent" }
SignupLabels.STATUS_ORDER = { "present", "late", "maybe", "bench", "absent" }
-- Players expected, as the website counts them.
local COMING = { present = true, late = true }

--- { label, plural, icon } of a role, or a neutral one for a role this version does not know.
function SignupLabels.Role(role)
    return ROLES[role] or { label = tostring(role), plural = tostring(role), icon = "" }
end

function SignupLabels.Status(status)
    return STATUSES[status] or tostring(status)
end

function SignupLabels.IsComing(status)
    return COMING[status] == true
end
