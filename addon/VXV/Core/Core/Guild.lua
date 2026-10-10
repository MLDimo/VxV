local ns = select(2, ...).Core

--- VXV works for the members of the guild only. The client may know the guild's name only after its first
--- roster update: the check asks for one and waits, then tells the rest of the addon ("guild.confirmed").
local Guild = {}
ns.Guild = Guild

local Bus, Compat, Events, Util = ns.Bus, ns.Compat, ns.Events, ns.Util

local confirmed = false

local function guildName()
    if not IsInGuild() then
        return nil
    end
    local ok, name = Compat.GetGuildInfo("player")
    if ok and type(name) == "string" and not Util.IsSecret(name) then
        return name:upper()
    end
end

local function check()
    if not confirmed and ns.GUILD_NAMES[guildName() or ""] then
        confirmed = true
        Bus.Emit("guild.confirmed")
    end
end

--- Checks at login; in a guild whose name the client does not know yet, waits for the roster update.
function Guild.Start()
    check()
    if not confirmed and IsInGuild() then
        Events.On("GUILD_ROSTER_UPDATE", check)
        Compat.RequestGuildRoster()
    end
end

function Guild.IsMember()
    return confirmed
end
