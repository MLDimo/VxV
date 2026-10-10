local ns = select(2, ...).Core

--- The guild roster as the website imports it (P2.4): a "VXV-ROSTER-1" line, then "Prénom;Nom;CLASSE" per
--- character, the class being the game's token (e.g. ROGUE). Any change of format increments the version.
local Roster = {}
ns.Roster = Roster

local Compat, Names, Util = ns.Compat, ns.Names, ns.Util

local HEADER = "VXV-ROSTER-1"
-- Positions of the online flag and of the class token among the values of GetGuildRosterInfo.
local ONLINE_INDEX = 9
local CLASS_TOKEN_INDEX = 11

--- The export text of the members ({ name, class }), and how many were left out for lacking a last name.
function Roster.Format(members)
    local lines, skipped = { HEADER }, 0
    for _, member in ipairs(members) do
        local firstName, lastName = Names.Split(member.name)
        if firstName ~= nil then
            lines[#lines + 1] = string.format("%s;%s;%s", firstName, lastName, member.class)
        else
            skipped = skipped + 1
        end
    end
    return table.concat(lines, "\n"), skipped
end

--- The members the client knows ({ name, class, online }), with readable names and classes.
function Roster.Read()
    local members = {}
    local ok, total = Compat.GetNumGuildMembers()
    for index = 1, ok and tonumber(total) or 0 do
        local info = { select(2, Compat.GetGuildRosterInfo(index)) }
        local name, class = info[1], info[CLASS_TOKEN_INDEX]
        if type(name) == "string" and type(class) == "string" and not Util.IsSecret(name) then
            members[#members + 1] = { name = name, class = class, online = info[ONLINE_INDEX] == true }
        end
    end
    return members
end
