local _, ns = ...

--- T1: invitations and conversion to raid. "/vxvtest later group ..." tests them without a click,
--- as the real addon would invite the signed-up players by itself.
local Compat, Util = ns.Compat, ns.Util
local log = ns.Log.For("group")

local function status()
    log.Info("membres", GetNumGroupMembers(), IsInRaid() and "raid" or (IsInGroup() and "groupe" or "seul"),
        "chef", Util.Safe(UnitIsGroupLeader("player")), "assistant", Util.Safe(UnitIsGroupAssistant("player")))
end

local function invite(args)
    if args == "" then
        log.Fail("usage : /vxvtest group invite Prénom Nom")
        return
    end
    log.Call("InviteUnit(" .. args .. ")", Compat.InviteUnit(args))
end

local function convertToRaid()
    log.Call("ConvertToRaid()", Compat.ConvertToRaid())
end

-- The game answers in the system channel ("X a été invité", "X a rejoint le groupe de raid") or with an error.
local PASSIVE_EVENTS = {
    PARTY_INVITE_REQUEST = "Info",
    GROUP_ROSTER_UPDATE = "Trace",
    CHAT_MSG_SYSTEM = "Trace",
    UI_ERROR_MESSAGE = "Trace",
}

ns.Registry.Register({
    id = "group",
    description = "invitations et passage en raid (écoute passive des réponses du jeu)",
    Setup = function()
        log.Journal(PASSIVE_EVENTS)
    end,
    commands = {
        { name = "status", run = status },
        { name = "invite", usage = "Prénom Nom", run = invite },
        { name = "raid", run = convertToRaid },
    },
})
