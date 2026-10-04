local _, ns = ...

--- The player's group, as the client knows it.
local Group = {}
ns.Group = Group

Group.MAX_PARTY, Group.MAX_RAID = 5, 40

--- Names of the group's members, this player included; empty outside a group.
function Group.Names()
    local names = {}
    if not IsInGroup() then
        return names
    end
    local unit, count = "raid", GetNumGroupMembers()
    if not IsInRaid() then
        -- Party units are the other players; the player is "player".
        unit, count = "party", Group.MAX_PARTY - 1
        names[VXV.PlayerName() or ""] = true
    end
    for index = 1, count do
        local name = VXV.NameOfUnit(unit .. index)
        if name ~= nil then
            names[name] = true
        end
    end
    return names
end

--- The addon channel of the group: the raid's, or the party's.
function Group.Channel()
    return IsInRaid() and "RAID" or "PARTY"
end
