local _, ns = ...

--- The guild's roster, read by the client at each update, kept for the website (P2.4 without copy-paste): the
--- website imports it from an officer's companion only.
local Roster = {}
ns.Roster = Roster

local Outbox = ns.Outbox

-- The client updates the roster often (members logging in and out): read it once a minute at most.
local READ_EVERY_SECONDS = 60

local lastReadAt

local function read()
    local now = GetTime()
    if lastReadAt ~= nil and now - lastReadAt < READ_EVERY_SECONDS then
        return
    end
    local text, count = VXV.GuildRosterText()
    if count > 0 then
        lastReadAt = now
        Outbox.SetRoster(text, time())
    end
end

--- From login on: the roster as the client knows it now, then at each of its updates.
function Roster.Start()
    VXV.OnEvent("GUILD_ROSTER_UPDATE", read)
    read()
end
