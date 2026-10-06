local _, ns = ...

--- The player's group, as the client knows it.
local Group = {}
ns.Group = Group

Group.MAX_PARTY, Group.MAX_RAID = 5, 40

--- The group's members, this player included: { unit, name }; empty outside a group.
function Group.Members()
    local members = {}
    if not IsInGroup() then
        return members
    end
    local unit, count = "raid", GetNumGroupMembers()
    if not IsInRaid() then
        -- Party units are the other players; the player is "player".
        unit, count = "party", Group.MAX_PARTY - 1
        members[1] = { unit = "player", name = VXV.PlayerName() }
    end
    for index = 1, count do
        local name = VXV.NameOfUnit(unit .. index)
        if name ~= nil then
            members[#members + 1] = { unit = unit .. index, name = name }
        end
    end
    return members
end

--- Names of the group's members, as a set.
function Group.Names()
    local names = {}
    for _, member in ipairs(Group.Members()) do
        if member.name ~= nil then
            names[member.name] = true
        end
    end
    return names
end

--- The group's leader, "Prénom Nom", or nil outside a group.
function Group.Leader()
    for _, member in ipairs(Group.Members()) do
        if UnitIsGroupLeader(member.unit) then
            return member.name
        end
    end
end

--- The addon channel of the group: the raid's, or the party's.
function Group.Channel()
    return IsInRaid() and "RAID" or "PARTY"
end
