local _, ns = ...

--- French wording and colors of the event's data, as the website shows them.
local Labels = {}
ns.Labels = Labels

local CLASSES = {
    WARRIOR = { name = "Guerrier", color = "c69b6d" },
    PALADIN = { name = "Paladin", color = "f48cba" },
    HUNTER = { name = "Chasseur", color = "aad372" },
    ROGUE = { name = "Voleur", color = "fff468" },
    PRIEST = { name = "Prêtre", color = "ffffff" },
    SHAMAN = { name = "Chaman", color = "0070dd" },
    MAGE = { name = "Mage", color = "3fc7eb" },
    WARLOCK = { name = "Démoniste", color = "8788ee" },
    DRUID = { name = "Druide", color = "ff7c0a" },
}
local UNKNOWN_CLASS_COLOR = "a1a1aa"

-- Role icons of the game's group finder, cut from one texture.
local ROLE_ICON = "|TInterface\\LFGFrame\\UI-LFG-ICON-PORTRAITROLES:14:14:0:0:64:64:%s|t"
local ROLES = {
    tank = { label = "Tank", plural = "Tanks", icon = ROLE_ICON:format("0:19:22:41") },
    healer = { label = "Soigneur", plural = "Soigneurs", icon = ROLE_ICON:format("20:39:1:20") },
    dps = { label = "DPS", plural = "DPS", icon = ROLE_ICON:format("20:39:22:41") },
}
Labels.ROLE_ORDER = { "tank", "healer", "dps" }

local STATUSES = { present = "Présent", late = "En retard", maybe = "Peut-être", bench = "Banc", absent = "Absent" }
Labels.STATUS_ORDER = { "present", "late", "maybe", "bench", "absent" }
-- Players expected in the raid, as the website counts them.
local COMING = { present = true, late = true }

local DATE_TIME = "%d/%m %H:%M"

function Labels.ClassName(token)
    local class = CLASSES[token]
    return class and class.name or tostring(token)
end

--- The name in the color of the class.
function Labels.Colored(name, token)
    local class = CLASSES[token]
    return "|cff" .. (class and class.color or UNKNOWN_CLASS_COLOR) .. name .. "|r"
end

--- { label, plural, icon } of a role, or a neutral one for a role this version does not know.
function Labels.Role(role)
    return ROLES[role] or { label = tostring(role), plural = tostring(role), icon = "" }
end

function Labels.Status(status)
    return STATUSES[status] or tostring(status)
end

function Labels.IsComing(status)
    return COMING[status] == true
end

--- "10/12 21:00", in the player's time.
function Labels.DateTime(seconds)
    return date(DATE_TIME, seconds)
end
