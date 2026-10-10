local ns = select(2, ...).Raid

--- Forming the raid in game. An officer opens the invitations; a signed-up member clicks Rejoindre and is
--- invited at once when expected (present or late) with a main character. Rerolls, bench and players without a
--- sign-up become requests the officer accepts by hand. The officer may also invite every expected player who
--- is online. The group becomes a raid as soon as a first player joins.
local Invitations = {}
ns.Invitations = Invitations

local Group, Labels, RaidData = ns.Group, ns.Labels, ns.RaidData

local OPEN, JOIN, REPLY, ASK = "raid.open", "raid.join", "raid.reply", "raid.ask"
local MAX_PARTY, MAX_RAID = Group.MAX_PARTY, Group.MAX_RAID
local INVITE_GAP_SECONDS = 0.2
local ANSWER_WAIT_SECONDS = 10

local OPENED = "Invitations ouvertes : les inscrits attendus sont invités dès qu'ils cliquent sur Rejoindre le raid."
local CLOSED = "Invitations fermées."
local OPEN_NOTICE = "%s a ouvert les invitations : clique sur Rejoindre le raid dans l'onglet Raid, ou tape "
    .. "/vxv rejoindre."
local OFFICERS_ONLY = "Réservé aux officiers que le site nomme dans les données du raid."
local NOT_LEADER = "Tu dois être chef ou assistant de ton groupe pour inviter."
local NOT_OPEN = "Les invitations ne sont pas encore ouvertes : un officier les ouvre depuis l'onglet Raid."
local ALREADY = "Tu es déjà dans le raid."
local IN_GROUP = "Quitte ton groupe actuel pour rejoindre le raid."
local ASKED = "Demande envoyée à %s."
local NO_ANSWER = "Pas de réponse de %s : il n'est peut-être plus connecté. Réessaie, ou demande une invitation en jeu."
local INVITED = "Invitation envoyée par %s : accepte-la pour rejoindre le raid."
local REQUESTED = "Demande transmise à %s (%s) : il t'invitera à la main."
local FULL = "Le raid est complet (40 joueurs)."
local REQUEST_NOTICE = "%s demande à rejoindre le raid (%s) : clique sur son nom dans l'onglet Raid pour l'inviter."
local OFFLINE = "Hors ligne : %s."

local leader
-- An opening heard before any data: its sender is recognized as officer once the data arrive.
local pendingOpen
local queue, requests = {}, {}
local invitedBeforeRaid = 0
local pumping, answered = false, false

local function me()
    return VXV.PlayerName()
end

local function changed()
    VXV.Emit("raid.invitations")
end

local function canInvite()
    return not IsInGroup() or UnitIsGroupLeader("player") or UnitIsGroupAssistant("player")
end

local function findSignup(name)
    local event = RaidData.Current()
    for _, signup in ipairs(event and event.signups or {}) do
        if signup.name == name then
            return signup
        end
    end
end

--- Whether the sign-up is invited without an officer: expected (present or late), with a main character.
function Invitations.IsAutomatic(signup)
    return signup ~= nil and Labels.IsComing(signup.status) and not signup.reroll
end

local function requestReason(signup)
    if signup == nil then
        return "pas inscrit"
    end
    return signup.reroll and "inscrit avec un reroll" or ("inscrit : " .. Labels.Status(signup.status))
end

--- Room for one more invitation now: a party holds 5 players until it becomes a raid of 40.
local function hasRoom()
    if IsInRaid() then
        return GetNumGroupMembers() < MAX_RAID
    end
    return math.max(GetNumGroupMembers(), 1) + invitedBeforeRaid < MAX_PARTY
end

--- Sends the queued invitations one by one; waits for the raid when the party is full.
local function pump()
    local name = queue[1]
    if name == nil or not hasRoom() then
        pumping = false
        return
    end
    table.remove(queue, 1)
    if not Group.Names()[name] then
        C_PartyInfo.InviteUnit(name)
        if not IsInRaid() then
            invitedBeforeRaid = invitedBeforeRaid + 1
        end
    end
    C_Timer.After(INVITE_GAP_SECONDS, pump)
end

local function startPump()
    if not pumping and queue[1] ~= nil then
        pumping = true
        pump()
    end
end

local function enqueue(name)
    for _, queued in ipairs(queue) do
        if queued == name then
            return
        end
    end
    queue[#queue + 1] = name
    startPump()
end

--- The leader of the open invitations, or nil.
function Invitations.Leader()
    return leader
end

--- Players asking to join, for the leader: { name, reason }.
function Invitations.Requests()
    return leader == me() and requests or {}
end

local function open()
    leader = me()
    VXV.Broadcast(OPEN, { open = true })
    VXV.Print(OPENED)
    if IsInGroup() and not IsInRaid() then
        C_PartyInfo.ConvertToRaid()
    end
end

--- Checks that this officer may invite; tells why not.
local function mayInvite()
    if not RaidData.IsOfficer(me()) then
        VXV.Print(OFFICERS_ONLY)
        return false
    end
    if not canInvite() then
        VXV.Print(NOT_LEADER)
        return false
    end
    return true
end

--- The officer's button: opens the invitations, or closes those this officer opened.
function Invitations.Toggle()
    if leader ~= nil and leader == me() then
        leader, queue, requests = nil, {}, {}
        VXV.Broadcast(OPEN, { open = false })
        VXV.Print(CLOSED)
    elseif mayInvite() then
        open()
    end
    changed()
end

local function onlineNames()
    local online = {}
    for _, member in ipairs(VXV.GuildMembers()) do
        online[member.name] = member.online or nil
    end
    for _, name in ipairs(VXV.Online()) do
        online[name] = true
    end
    return online
end

--- The officer's button: invites every expected player who is online and not in the group yet.
function Invitations.InviteAll()
    if not mayInvite() then
        return
    end
    if leader ~= me() then
        open()
    end
    local online, inGroup, offline, invited = onlineNames(), Group.Names(), {}, 0
    for _, signup in ipairs(RaidData.Current().signups) do
        if Invitations.IsAutomatic(signup) and signup.name ~= me() and not inGroup[signup.name] then
            if online[signup.name] then
                enqueue(signup.name)
                invited = invited + 1
            else
                offline[#offline + 1] = signup.name
            end
        end
    end
    VXV.Print(VXV.Count(invited, "invitation envoyée", "invitations envoyées") .. ".")
    if #offline > 0 then
        VXV.Print(OFFLINE:format(table.concat(offline, ", ")))
    end
    changed()
end

--- The leader invites a player who asked.
function Invitations.Invite(name)
    for index, request in ipairs(requests) do
        if request.name == name then
            table.remove(requests, index)
            break
        end
    end
    enqueue(name)
    changed()
end

--- A member's button: asks the leader for an invitation.
function Invitations.Join()
    if leader == nil then
        VXV.Print(NOT_OPEN)
        return
    end
    if Group.Names()[leader] then
        VXV.Print(ALREADY)
        return
    end
    if IsInGroup() then
        VXV.Print(IN_GROUP)
        return
    end
    local asked = leader
    answered = false
    VXV.Broadcast(JOIN, { leader = asked })
    VXV.Print(ASKED:format(asked))
    C_Timer.After(ANSWER_WAIT_SECONDS, function()
        if not answered then
            VXV.Print(NO_ANSWER:format(asked))
        end
    end)
end

local function addRequest(name, reason)
    for _, request in ipairs(requests) do
        if request.name == name then
            return
        end
    end
    requests[#requests + 1] = { name = name, reason = reason }
    VXV.Print(REQUEST_NOTICE:format(name, reason))
    changed()
end

local function answerJoin(sender)
    if Group.Names()[sender] then
        return ALREADY
    end
    if IsInRaid() and GetNumGroupMembers() >= MAX_RAID then
        return FULL
    end
    local signup = findSignup(sender)
    if Invitations.IsAutomatic(signup) then
        enqueue(sender)
        return INVITED:format(me())
    end
    local reason = requestReason(signup)
    addRequest(sender, reason)
    return REQUESTED:format(me(), reason)
end

VXV.OnMessage(JOIN, function(payload, sender)
    if type(payload) == "table" and leader == me() and payload.leader == me() and sender ~= me() then
        VXV.Broadcast(REPLY, { to = sender, text = answerJoin(sender) })
    end
end)

VXV.OnMessage(REPLY, function(payload, sender)
    if type(payload) == "table" and payload.to == me() and sender == leader and type(payload.text) == "string" then
        answered = true
        VXV.Print(payload.text)
    end
end)

local function follow(sender)
    if leader ~= sender then
        leader = sender
        VXV.Print(OPEN_NOTICE:format(sender))
        changed()
    end
end

VXV.OnMessage(OPEN, function(payload, sender)
    if type(payload) ~= "table" or sender == me() then
        return
    end
    if RaidData.Current() == nil then
        pendingOpen = payload.open and sender or nil
    elseif not RaidData.IsOfficer(sender) then
        return
    elseif payload.open then
        follow(sender)
    elseif leader == sender then
        leader = nil
        changed()
    end
end)

VXV.On("raid.updated", function()
    if pendingOpen ~= nil and RaidData.IsOfficer(pendingOpen) then
        follow(pendingOpen)
    end
    pendingOpen = nil
end)

-- A member who logs in learns that the invitations are open.
VXV.OnMessage(ASK, function(_, sender)
    if leader ~= nil and leader == me() and sender ~= me() then
        VXV.Broadcast(OPEN, { open = true })
    end
end)

-- The first player who joins turns the party into a raid; then the waiting invitations go out.
VXV.OnEvent("GROUP_ROSTER_UPDATE", function()
    if leader == nil or leader ~= me() then
        return
    end
    if IsInGroup() and not IsInRaid() and UnitIsGroupLeader("player") then
        C_PartyInfo.ConvertToRaid()
    end
    if IsInRaid() then
        invitedBeforeRaid = 0
        startPump()
    end
end)

VXV.RegisterCommand("rejoindre", "demander une invitation au raid ouvert par un officier", Invitations.Join)
VXV.RegisterCommand("inviter", "inviter tous les inscrits attendus connectés (officiers)", Invitations.InviteAll)
