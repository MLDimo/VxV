local _, ns = ...

--- Step 0.5: character name format (first + last name) and guild roster reading.
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("names")

local ROSTER_TIMEOUT = 10
local PRINTED_MEMBERS = 5
-- Website import format (P2.4): header line, then "Prénom;Nom;CLASSE" per character.
local ROSTER_HEADER = "VXV-ROSTER-1"

local savedDb
local rosterRequested = false

local function describeName(label, value)
    if Util.IsSecret(value) then
        log.Fail(label, "valeur secrète")
        return
    end
    if value == nil then
        log.Info(label, "nil")
        return
    end
    local text = tostring(value)
    log.Info(label, "[" .. text .. "]", "longueur", #text, text:find(" ", 1, true) and "avec espace" or "sans espace")
end

local function describeCall(label, ok, value)
    if not ok then
        log.Fail(label, value)
        return
    end
    describeName(label, value)
end

local function checkUnit(args)
    local unit = args ~= "" and args or "player"
    local name, realm = UnitName(unit)
    describeName("UnitName(" .. unit .. ")", name)
    describeName("UnitName, 2e valeur (royaume)", realm)
    local fullName, fullRealm = UnitFullName(unit)
    describeName("UnitFullName(" .. unit .. ")", fullName)
    describeName("UnitFullName, 2e valeur (royaume)", fullRealm)
    describeCall("GetUnitName(" .. unit .. ", true)", Compat.GetUnitName(unit, true))
    describeCall("GetRealmName()", Compat.GetRealmName())
    describeCall("GetNormalizedRealmName()", Compat.GetNormalizedRealmName())
end

local function readRoster()
    local total, online = GetNumGuildMembers()
    local members, withSpace = {}, 0
    for index = 1, total do
        local name, rankName, rankIndex, level, _, _, _, _, isOnline, _, classFile = GetGuildRosterInfo(index)
        local member = {
            name = Util.Safe(name),
            rank = Util.Safe(rankName),
            rankIndex = Util.Safe(rankIndex),
            level = Util.Safe(level),
            class = Util.Safe(classFile),
            online = Util.Safe(isOnline),
        }
        if member.name:find(" ", 1, true) then
            withSpace = withSpace + 1
        end
        members[index] = member
    end
    return members, total, online, withSpace
end

local function onRosterUpdate()
    if not rosterRequested then
        return
    end
    rosterRequested = false
    local members, total, online, withSpace = readRoster()
    savedDb.roster = { readAt = time(), members = members }
    log.Ok("liste de guilde :", total, "membres,", online, "en ligne,", withSpace, "noms avec espace")
    for index, member in ipairs(members) do
        local logMember = index <= PRINTED_MEMBERS and log.Info or log.Trace
        logMember("[" .. member.name .. "]", member.class, "rang", member.rankIndex, member.rank,
            "niveau", member.level, "en ligne", member.online)
    end
end

local function requestRoster()
    if not IsInGuild() then
        log.Fail("le personnage n'est pas dans une guilde")
        return
    end
    rosterRequested = true
    local ok, problem = Compat.RequestGuildRoster()
    if not ok then
        rosterRequested = false
        log.Fail("demande de liste de guilde refusée :", problem)
        return
    end
    C_Timer.After(ROSTER_TIMEOUT, function()
        if rosterRequested then
            rosterRequested = false
            log.Fail("pas de GUILD_ROSTER_UPDATE après", ROSTER_TIMEOUT, "s (réessayer dans 10 s)")
        end
    end)
end

local function exportRoster()
    local roster = savedDb.roster
    if not roster then
        log.Fail("aucune liste lue : taper d'abord /vxvtest names roster")
        return
    end
    local lines = { ROSTER_HEADER }
    for _, member in ipairs(roster.members) do
        local firstName, lastName = member.name:match("^(%S+)%s+(.+)$")
        if firstName then
            lines[#lines + 1] = firstName .. ";" .. lastName .. ";" .. member.class
        else
            log.Fail("nom sans nom de famille ignoré :", member.name)
        end
    end
    ns.Report.Show(table.concat(lines, "\n"))
    log.Info("export :", #lines - 1, "personnages, à copier avec Ctrl+C dans la page Liste de guilde du site")
end

ns.Registry.Register({
    id = "names",
    description = "format des noms (prénom + nom) et lecture de la liste de guilde",
    Setup = function(db)
        savedDb = db
        ns.Events.On("GUILD_ROSTER_UPDATE", onRosterUpdate)
    end,
    commands = {
        { name = "unit", usage = "[unité, ex. target]", run = checkUnit },
        { name = "roster", run = requestRoster },
        { name = "export", run = exportRoster },
    },
})
