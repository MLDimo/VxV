local ns = select(2, ...).Core

--- Links the addon writes in the chat frame, which open one of its windows on a click (owner's request of
--- 9 November: a game's announcement opens it for the members who watch). An addon link (|Haddon:…|h) is the
--- client's own kind for them: a click calls SetItemRef with it, which the addon follows by a secure hook.
local ChatLinks = {}
ns.ChatLinks = ChatLinks

local Compat, Util = ns.Compat, ns.Util

local PREFIX = "addon:vxv:"
local COLOR = "neon"
local WATCH = "Regarder"

local handlers = {}
local hooked = false
-- The guild's announcements that get a link: { pattern, kind }.
local announcements = {}

--- A click on a link: the handler of its kind gets its data.
local function follow(link)
    if type(link) ~= "string" then
        return
    end
    local kind, data = link:match("^" .. PREFIX .. "([^:]+):(.*)$")
    if kind ~= nil and handlers[kind] ~= nil then
        handlers[kind](data)
    end
end

--- The link of a kind, carrying data (no « | »), shown as [label].
function ChatLinks.Make(kind, data, label)
    return ns.Theme.Colored("|H" .. PREFIX .. kind .. ":" .. data .. "|h[" .. label .. "]|h", COLOR)
end

--- What a click on a link of this kind does: handler(data).
function ChatLinks.On(kind, handler)
    handlers[kind] = handler
    if not hooked then
        hooked = true
        hooksecurefunc("SetItemRef", follow)
    end
end

--- A message of the guild's chat that announces a game gets its link: the pattern's captures are its data.
local function linkAnnouncement(_, _, message, author, ...)
    if type(message) ~= "string" or Util.IsSecret(message) then
        return false
    end
    for _, announcement in ipairs(announcements) do
        local captures = { message:match(announcement.pattern) }
        if #captures > 0 then
            return false, message .. " " .. ChatLinks.Make(announcement.kind, table.concat(captures, ":"), WATCH),
                author, ...
        end
    end
    return false
end

--- The guild's messages that match the pattern get a link « [Regarder] » of the kind, whose data are its captures
--- joined by « : ».
function ChatLinks.Announce(kind, pattern)
    announcements[#announcements + 1] = { kind = kind, pattern = pattern }
    if #announcements == 1 then
        Compat.AddMessageEventFilter("CHAT_MSG_GUILD", linkAnnouncement)
    end
end
