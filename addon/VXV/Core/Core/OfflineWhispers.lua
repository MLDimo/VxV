local ns = select(2, ...).Core

--- The addon's whispers to a member who is not connected (owner's report of 10 November: « Aucun joueur nommé
--- 'Rce Pull' ne joue actuellement. » again and again for several members). The answers to a member who has just
--- logged in wait in the send queue, cut in pieces; once they log off, each piece brings the game's notice. The addon
--- whispers nobody the guild's list says is offline, and hides the notice for those it whispered lately: a whisper
--- the player writes still gets it.
local OfflineWhispers = {}
ns.OfflineWhispers = OfflineWhispers

local Compat, Roster, Util = ns.Compat, ns.Roster, ns.Util

-- The game's notice, and how long after the addon's last whisper to a name the notice is hidden.
local NOT_FOUND = "ERR_CHAT_PLAYER_NOT_FOUND_S"
local HIDDEN_SECONDS = 120

local whispered = {}
local filtering = false

--- Whether the guild's list says the member is not connected (a name it does not know is not said offline).
function OfflineWhispers.Offline(name)
    for _, member in ipairs(Roster.Read()) do
        if member.name == name then
            return not member.online
        end
    end
    return false
end

--- The name the notice is about, or nil for another message.
local function notFound(message)
    local wording = Compat.Resolve(NOT_FOUND)
    if type(wording) ~= "string" or type(message) ~= "string" or Util.IsSecret(message) then
        return nil
    end
    local pattern = "^" .. wording:gsub("[%(%)%.%+%-%*%?%[%]%^%$]", "%%%0"):gsub("%%s", "(.+)") .. "$"
    return message:match(pattern)
end

--- The system channel's filter: the notice about a name the addon whispered lately is hidden.
local function hideNotice(_, _, message)
    local name = notFound(message)
    return name ~= nil and whispered[name] ~= nil and GetTime() - whispered[name] < HIDDEN_SECONDS
end

--- Notes a whisper of the addon to a name: the game's notice about it is hidden for a while.
function OfflineWhispers.Note(name)
    whispered[name] = GetTime()
    if not filtering then
        filtering = true
        Compat.AddMessageEventFilter("CHAT_MSG_SYSTEM", hideNotice)
    end
end
